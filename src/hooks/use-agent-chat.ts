import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgentStore } from '@/stores/agent-store';
import { useSSEConnection } from './use-sse-connection';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import agentApi from '@/lib/api/agent-api';
import type { SSEEvent, ChatRequest, BoardAction, AgentMessage } from '@/types/agent';

/** SSE 连续失败次数阈值，超过后降级到轮询模式 */
const SSE_FAILURE_THRESHOLD = 3;
/** 轮询间隔（毫秒） */
const POLLING_INTERVAL = 2000;

/**
 * Agent 对话管理 Hook
 *
 * 封装 SSE 连接和事件处理逻辑，支持降级轮询
 */
export function useAgentChat(creationUuid: string) {
  const queryClient = useQueryClient();
  const lastRequestRef = useRef<ChatRequest | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseFailureCountRef = useRef(0);

  const [isPollingMode, setIsPollingMode] = useState(false);
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    addMessage,
    updateMessage,
    setConnected,
    setStreaming,
    setConnectionError,
    setThinking,
    setCurrentToolCall,
    setPendingActionRequest,
    setBoardView,
    highlightElement,
  } = useAgentStore();

  /**
   * 处理 SSE 事件
   */
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      const { type } = event;

      switch (type) {
        case 'message.start':
          addMessage({
            id: event.message_id!,
            role: 'assistant',
            content: '',
            timestamp: event.timestamp,
            status: 'streaming',
          });
          setStreaming(true);
          break;

        case 'message.content':
          updateMessage(event.message_id!, {
            content: event.content,
          });
          break;

        case 'message.end':
          updateMessage(event.message_id!, {
            status: 'completed',
          });
          setStreaming(false);
          break;

        case 'thinking.start':
          setThinking(true);
          break;

        case 'thinking.content':
          setThinking(true, event.content);
          break;

        case 'thinking.end':
          setThinking(false);
          break;

        case 'tool.call':
          setCurrentToolCall({
            id: event.tool_call_id!,
            name: event.tool_name!,
            arguments: event.arguments || {},
            status: 'calling',
          });
          break;

        case 'tool.output':
          setCurrentToolCall({
            id: event.tool_call_id!,
            name: event.tool_name!,
            arguments: {},
            status: event.status === 'success' ? 'success' : 'error',
            output: event.output,
            error: event.error,
          });
          break;

        case 'progress.update':
          // 进度更新可以在消息中显示，或者单独处理
          break;

        case 'board.action':
          executeBoardActions(event.actions || []);
          break;

        case 'action.request':
          setPendingActionRequest({
            requestId: event.request_id!,
            prompt: event.prompt!,
            actions: event.actions || [],
            timeoutSeconds: event.timeout_seconds,
          });
          break;

        case 'attachment':
          // 处理附件
          break;

        case 'error':
          console.error('Agent error:', event.error);
          setConnectionError(event.error?.message || 'Unknown error');
          break;

        default:
          console.warn('Unknown SSE event type:', type);
      }
    },
    [
      addMessage,
      updateMessage,
      setStreaming,
      setConnectionError,
      setThinking,
      setCurrentToolCall,
      setPendingActionRequest,
    ]
  );

  /**
   * 执行看板操作
   */
  const executeBoardActions = useCallback(
    (actions: BoardAction[]) => {
      for (const action of actions) {
        switch (action.action) {
          case 'switch_view':
            setBoardView(action.target as any);
            break;

          case 'highlight':
            highlightElement(action.target, action.data?.duration || 3000);
            // DOM 操作：添加高亮效果
            setTimeout(() => {
              const element = document.getElementById(action.target);
              if (element) {
                element.classList.add('ring-2', 'ring-green-500', 'animate-pulse');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-green-500', 'animate-pulse');
                }, action.data?.duration || 3000);
              }
            }, 100);
            break;

          case 'scroll':
            setTimeout(() => {
              const element = document.getElementById(action.target);
              if (element) {
                element.scrollIntoView({
                  behavior: action.data?.behavior || 'smooth',
                  block: 'center',
                });
              }
            }, 100);
            break;

          case 'update':
            // 刷新 creation 数据
            queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });
            break;

          case 'add':
          case 'remove':
            // 处理添加/删除操作
            break;
        }
      }
    },
    [setBoardView, highlightElement, queryClient, creationUuid]
  );

  /**
   * 停止轮询
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * 启动轮询模式（SSE 降级方案）
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPollingMode(true);
    toast.warning('实时连接失败，已切换到轮询模式');

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await agentApi.getMessages(creationUuid, {
          after: lastMessageIdRef.current || undefined,
        });

        const messages = response.data?.messages || [];
        if (messages.length > 0) {
          for (const msg of messages) {
            addMessage(msg);
            lastMessageIdRef.current = msg.id;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, POLLING_INTERVAL);
  }, [creationUuid, addMessage]);

  /**
   * SSE 连接
   */
  const { isConnected, isConnecting, error, connect, disconnect: sseDisconnect } = useSSEConnection({
    url: `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/creations/${creationUuid}/agent/chat`,
    onEvent: (event) => {
      // 重置失败计数
      sseFailureCountRef.current = 0;
      // 记录最后消息ID
      if (event.message_id) {
        lastMessageIdRef.current = event.message_id;
      }
      handleSSEEvent(event);
    },
    onError: (err) => {
      console.error('SSE connection error:', err);
      setConnectionError(err.message);

      // 累计失败次数
      sseFailureCountRef.current += 1;

      // 超过阈值，降级到轮询模式
      if (sseFailureCountRef.current >= SSE_FAILURE_THRESHOLD) {
        startPolling();
      }
    },
    onConnected: () => {
      console.log('SSE connected');
      setConnected(true);
      setConnectionError(null);
      // 如果之前在轮询模式，停止轮询
      if (isPollingMode) {
        stopPolling();
        setIsPollingMode(false);
        toast.success('已恢复实时连接');
      }
    },
    onDisconnected: () => {
      console.log('SSE disconnected');
      setConnected(false);
    },
    maxRetries: 3,
    retryDelay: 1000,
  });

  /**
   * 断开连接（包括 SSE 和轮询）
   */
  const disconnect = useCallback(() => {
    sseDisconnect();
    stopPolling();
    setIsPollingMode(false);
  }, [sseDisconnect, stopPolling]);

  /**
   * 同步连接状态到 store
   */
  useEffect(() => {
    setConnected(isConnected || isPollingMode);
  }, [isConnected, isPollingMode, setConnected]);

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (message: string, actionResponse?: any, attachments?: any[]) => {
      // 添加用户消息（非空消息才添加）
      if (message.trim()) {
        addMessage({
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
          status: 'completed',
        });
      }

      // 构建请求
      const request: ChatRequest = {
        message,
        action_response: actionResponse,
        attachments,
        stream: !isPollingMode,
      };

      lastRequestRef.current = request;

      // 如果在轮询模式，使用普通 API 调用
      if (isPollingMode) {
        try {
          await agentApi.chat(creationUuid, request);
        } catch (err) {
          console.error('Chat API error:', err);
          toast.error('发送消息失败');
        }
        return;
      }

      // 建立 SSE 连接
      await connect(request);
    },
    [addMessage, connect, isPollingMode, creationUuid]
  );

  /**
   * 重连
   */
  const reconnect = useCallback(async () => {
    // 尝试恢复 SSE 连接
    sseFailureCountRef.current = 0;
    stopPolling();
    setIsPollingMode(false);

    if (lastRequestRef.current) {
      await connect(lastRequestRef.current);
    }
  }, [connect, stopPolling]);

  /**
   * 中断当前对话
   */
  const interrupt = useCallback(
    async (messageId?: string, reason?: string) => {
      if (isInterrupting) return;

      setIsInterrupting(true);
      try {
        const targetMessageId = messageId || lastMessageIdRef.current;
        if (!targetMessageId) {
          toast.error('没有可中断的消息');
          return;
        }

        await agentApi.interrupt(creationUuid, targetMessageId, reason);

        // 断开 SSE 连接
        sseDisconnect();
        setStreaming(false);
        toast.success('已中断当前对话');
      } catch (err: any) {
        console.error('Interrupt error:', err);
        toast.error(err.message || '中断失败');
      } finally {
        setIsInterrupting(false);
      }
    },
    [creationUuid, isInterrupting, sseDisconnect, setStreaming]
  );

  /**
   * 重置会话
   */
  const reset = useCallback(
    async (keepAssets: boolean = true) => {
      if (isResetting) return;

      setIsResetting(true);
      try {
        await agentApi.reset(creationUuid, keepAssets);

        // 断开连接并清理状态
        disconnect();
        lastMessageIdRef.current = null;
        lastRequestRef.current = null;

        // 清空消息（需要在 store 中实现 clearMessages）
        // clearMessages();

        // 刷新 creation 数据
        queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });

        toast.success(keepAssets ? '会话已重置（保留资产）' : '会话已完全重置');
      } catch (err: any) {
        console.error('Reset error:', err);
        toast.error(err.message || '重置失败');
      } finally {
        setIsResetting(false);
      }
    },
    [creationUuid, isResetting, disconnect, queryClient]
  );

  return {
    // 连接状态
    isConnected: isConnected || isPollingMode,
    isConnecting,
    isPollingMode,
    error,

    // 操作状态
    isInterrupting,
    isResetting,

    // 方法
    sendMessage,
    disconnect,
    reconnect,
    interrupt,
    reset,
  };
}
