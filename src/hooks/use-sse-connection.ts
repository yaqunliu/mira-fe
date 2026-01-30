import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth';

/**
 * SSE 事件解析器
 *
 * 支持标准 SSE 格式：
 * event: <event_type>
 * data: <json_data>
 *
 * 将 event 类型附加到解析后的数据中
 */
function parseSSEChunk(chunk: string): any[] {
  const events: any[] = [];
  const lines = chunk.split('\n');
  let currentEventType: string | null = null;
  let currentEventId: string | null = null;

  for (const line of lines) {
    if (line.startsWith('event:')) {
      // 解析事件类型
      currentEventType = line.substring(6).trim();
    } else if (line.startsWith('id:')) {
      // 解析事件 ID
      currentEventId = line.substring(3).trim();
    } else if (line.startsWith('data:')) {
      // 解析数据
      const dataStr = line.substring(5).trim();

      // 跳过空数据
      if (!dataStr) continue;

      try {
        const data = JSON.parse(dataStr);

        // 将事件类型附加到数据中（如果尚未存在）
        if (currentEventType && !data.type) {
          data.type = currentEventType;
        }

        // 将事件 ID 附加到数据中（如果尚未存在）
        if (currentEventId && !data.event_id) {
          data.event_id = currentEventId;
        }

        events.push(data);

        // 重置当前事件状态，准备解析下一个事件
        currentEventType = null;
        currentEventId = null;
      } catch (e) {
        console.error('Failed to parse SSE data:', dataStr, e);
      }
    }
  }

  return events;
}

/**
 * 获取当前用户的 token
 */
function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}

/**
 * SSE 连接配置
 */
export interface SSEConnectionOptions {
  url: string;
  onEvent?: (event: any) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * SSE 连接状态
 */
export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * SSE 连接管理 Hook
 *
 * 使用 Fetch API + ReadableStream 实现 SSE，支持 POST 请求和自定义请求头
 */
export function useSSEConnection(options: SSEConnectionOptions) {
  const {
    url,
    onEvent,
    onError,
    onConnected,
    onDisconnected,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [state, setState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    retryCount: 0,
  });

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 建立 SSE 连接
   */
  const connect = useCallback(
    async (requestBody: any) => {
      // 如果已经连接，先断开
      if (state.isConnected) {
        disconnect();
      }

      setState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      try {
        // 创建 AbortController 用于取消请求
        abortControllerRef.current = new AbortController();

        // 构建请求头，添加 token
        const token = getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // 获取 ReadableStream reader
        const reader = response.body.getReader();
        readerRef.current = reader;

        const decoder = new TextDecoder();

        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          retryCount: 0,
        }));

        onConnected?.();

        // 启动心跳检测
        startHeartbeat();

        // 读取 SSE 流
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('SSE stream ended');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const events = parseSSEChunk(chunk);

          lastEventTimeRef.current = Date.now();

          for (const event of events) {
            onEvent?.(event);
          }
        }

        // 正常结束
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        onDisconnected?.();
      } catch (error: any) {
        console.error('SSE connection error:', error);

        if (error.name === 'AbortError') {
          // 手动断开，不算错误
          return;
        }

        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error,
          retryCount: prev.retryCount + 1,
        }));

        onError?.(error);

        // 自动重连
        if (state.retryCount < maxRetries) {
          const delay = retryDelay * Math.pow(2, state.retryCount); // 指数退避
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          // 注意：这里不会自动重连，需要外部调用
        }
      } finally {
        stopHeartbeat();
      }
    },
    [url, onEvent, onError, onConnected, onDisconnected, maxRetries, retryDelay, state.isConnected, state.retryCount]
  );

  /**
   * 断开 SSE 连接
   */
  const disconnect = useCallback(() => {
    // 取消请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 关闭 reader
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }

    stopHeartbeat();

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      retryCount: 0,
    });

    onDisconnected?.();
  }, [onDisconnected]);

  /**
   * 启动心跳检测
   * 如果 30 秒没有收到任何事件，认为连接已断开
   */
  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastEventTimeRef.current > 30000) {
        console.warn('No events received for 30s, connection may be dead');
        disconnect();
      }
    }, 10000); // 每 10 秒检查一次
  }, [disconnect]);

  /**
   * 停止心跳检测
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}
