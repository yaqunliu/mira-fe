import { useCallback, useEffect, useRef } from 'react';
import { useAgentStore } from '@/stores/agent-store';
import { useSSEConnection } from './use-sse-connection';
import { useQueryClient } from '@tanstack/react-query';
import type { SSEEvent, ChatRequest, BoardAction } from '@/types/agent';

/**
 * Agent 对话管理 Hook
 *
 * 封装 SSE 连接和事件处理逻辑
 */
export function useAgentChat(creationUuid: string) {
  const queryClient = useQueryClient();
  const lastRequestRef = useRef<ChatRequest | null>(null);

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
            queryClient.invalidateQueries(['creation', creationUuid]);
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
   * SSE 连接
   */
  const { isConnected, isConnecting, error, connect, disconnect } = useSSEConnection({
    url: `${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/creations/${creationUuid}/agent/chat`,
    onEvent: handleSSEEvent,
    onError: (err) => {
      console.error('SSE connection error:', err);
      setConnectionError(err.message);
    },
    onConnected: () => {
      console.log('SSE connected');
      setConnected(true);
      setConnectionError(null);
    },
    onDisconnected: () => {
      console.log('SSE disconnected');
      setConnected(false);
    },
    maxRetries: 3,
    retryDelay: 1000,
  });

  /**
   * 同步连接状态到 store
   */
  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected, setConnected]);

  /**
   * 发送消息
   */
  const sendMessage = useCallback(
    async (message: string, actionResponse?: any, attachments?: any[]) => {
      // 添加用户消息
      addMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        status: 'completed',
      });

      // 构建请求
      const request: ChatRequest = {
        message,
        action_response: actionResponse,
        attachments,
        stream: true,
      };

      lastRequestRef.current = request;

      // 建立 SSE 连接
      await connect(request);
    },
    [addMessage, connect]
  );

  /**
   * 重连
   */
  const reconnect = useCallback(async () => {
    if (lastRequestRef.current) {
      await connect(lastRequestRef.current);
    }
  }, [connect]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    disconnect,
    reconnect,
  };
}
