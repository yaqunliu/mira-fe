import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgentStore } from '@/stores/agent-store';
import { useSSEConnection } from './use-sse-connection';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import agentApi from '@/lib/api/agent-api';
import creationApi from '@/lib/api/creation';
import type { SSEEvent, ChatRequest, BoardAction, AgentMessage } from '@/types/agent';

/** SSE 连续失败次数阈值，超过后降级到轮询模式 */
const SSE_FAILURE_THRESHOLD = 3;
/** 轮询间隔（毫秒） */
const POLLING_INTERVAL = 5000;
/** Agent 模式创作资产轮询间隔（毫秒） */
const CREATION_POLLING_INTERVAL = 6000;
/** Agent 模式消息轮询间隔（毫秒） */
const MESSAGES_POLLING_INTERVAL = 6000;

/**
 * Agent 对话管理 Hook
 *
 * 封装 SSE 连接和事件处理逻辑，支持降级轮询
 */
export function useAgentChat(creationUuid: string) {
  const t = useTranslations('agent');
  const queryClient = useQueryClient();
  const lastRequestRef = useRef<ChatRequest | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseFailureCountRef = useRef(0);

  // Agent 模式轮询 refs
  const creationPollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesPollingRef = useRef<NodeJS.Timeout | null>(null);

  const [isPollingMode, setIsPollingMode] = useState(false);
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const hasLoadedHistoryRef = useRef(false);

  const {
    messages,
    addMessage,
    updateMessage,
    setMessages,
    setConnected,
    setStreaming,
    setProcessing,
    setConnectionError,
    setThinking,
    setCurrentToolCall,
    setPendingActionRequest,
    setPendingInteraction,
    setBoardView,
    highlightElement,
  } = useAgentStore();

  // 跟踪当前流式消息的 ID
  const currentStreamMessageIdRef = useRef<string | null>(null);
  // 标记是否已创建当前流式消息
  const hasCreatedMessageRef = useRef<boolean>(false);
  // 累积流式消息内容（增量模式）
  const streamingContentRef = useRef<string>('');
  // 后台处理状态超时计时器
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 处理 SSE 事件
   *
   * 支持新版协议格式：
   * - 会话控制类: thread, done
   * - 消息类: message.start, message.delta, message.end
   * - 思考类: thinking.start, thinking.delta, thinking.end
   * - 工具类: tool.start, tool.progress, tool.end
   * - 进度类: progress
   *
   * 同时兼容旧版事件名称：
   * - message.content → message.delta
   * - thinking.content → thinking.delta
   * - tool.call → tool.start
   * - tool.output → tool.end
   */
  const handleSSEEvent = useCallback(
    (event: SSEEvent) => {
      const { type } = event;

      switch (type) {
        // ========== 会话控制类 ==========
        case 'thread':
          // 会话信息（首个事件），包含 thread_id
          console.log('SSE thread started:', event.thread_id);
          break;

        case 'done':
          // 流结束
          console.log('SSE stream done');
          setStreaming(false);
          setProcessing(false);
          // 清除处理状态超时计时器
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          break;

        // ========== 消息类 ==========
        case 'message.start':
          // 消息开始，只保存消息 ID，不创建空消息
          currentStreamMessageIdRef.current = event.id || event.message_id || `assistant-${Date.now()}`;
          hasCreatedMessageRef.current = false;
          streamingContentRef.current = ''; // 重置累积内容
          setStreaming(true);
          break;

        case 'message.delta':  // 新版
        case 'message.content': // 兼容旧版
          // 消息增量内容 - 需要累加而非替换
          if (currentStreamMessageIdRef.current) {
            // 累加增量内容
            streamingContentRef.current += event.content || '';

            if (!hasCreatedMessageRef.current) {
              // 第一次收到内容时才创建消息
              addMessage({
                id: currentStreamMessageIdRef.current,
                role: 'assistant',
                content: streamingContentRef.current,
                timestamp: new Date().toISOString(),
                status: 'streaming',
              });
              hasCreatedMessageRef.current = true;
            } else {
              // 后续内容更新消息（使用累积的完整内容）
              updateMessage(currentStreamMessageIdRef.current, {
                content: streamingContentRef.current,
              });
            }
          }
          break;

        case 'message.end':
          // 消息结束
          if (currentStreamMessageIdRef.current && hasCreatedMessageRef.current) {
            updateMessage(currentStreamMessageIdRef.current, {
              content: streamingContentRef.current, // 确保最终内容是完整的
              status: event.finish_reason === 'error' ? 'error' : 'completed',
            });
          }
          currentStreamMessageIdRef.current = null;
          hasCreatedMessageRef.current = false;
          streamingContentRef.current = ''; // 清空累积内容
          setStreaming(false);
          break;

        // ========== 思考类 ==========
        case 'thinking.start':
          // 思考开始
          setThinking(true);
          break;

        case 'thinking.delta':  // 新版
        case 'thinking.content': // 兼容旧版
          // 思考内容增量
          setThinking(true, event.content);
          break;

        case 'thinking.end':
          // 思考结束
          setThinking(false);
          break;

        // ========== 工具调用类 ==========
        case 'tool.start':  // 新版
        case 'tool.call':   // 兼容旧版
          // 工具调用开始
          setCurrentToolCall({
            id: event.id || event.tool_call_id!,
            name: event.tool_name!,
            arguments: event.arguments || {},
            status: 'calling',
          });
          break;

        case 'tool.progress':
          // 工具执行进度
          setCurrentToolCall({
            id: event.id || event.tool_call_id!,
            name: event.tool_name || '',
            arguments: {},
            status: 'calling',
            output: t('progressPercent', { percent: event.progress || 0 }),
          });
          break;

        case 'tool.end':    // 新版
        case 'tool.output': // 兼容旧版
          // 工具调用结束
          setCurrentToolCall({
            id: event.id || event.tool_call_id!,
            name: event.tool_name || '',
            arguments: {},
            status: event.status === 'completed' || event.status === 'success' ? 'success' : 'error',
            output: event.result_summary || event.output,
            error: event.error,
          });
          break;

        // ========== 进度类 ==========
        case 'progress':        // 新版
        case 'progress.update': // 兼容旧版
          // 进度更新：可用于显示节点处理进度或任务步骤
          console.log('Progress:', event.node || event.stage, event.status || event.message);

          // 设置后台处理状态为 true
          console.log('[SSE] Setting isProcessing to true');
          setProcessing(true);

          // 清除之前的超时计时器并设置新的 12 秒超时
          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
          }
          processingTimeoutRef.current = setTimeout(() => {
            setProcessing(false);
            processingTimeoutRef.current = null;
          }, 12000); // 12 秒后自动停止（后端每 10 秒发送一次心跳）
          break;

        // ========== 看板操作类 ==========
        case 'board_action': {
          // Supervisor 发送的看板操作事件
          console.log('[SSE] board_action event received:', event);
          const action = event.action;
          if (!action) {
            console.warn('[SSE] board_action event missing action field');
            break;
          }
          console.log('[SSE] Processing action:', action.type, action);

          switch (action.type) {
            case 'switch_view':
              setBoardView(action.target as any);
              break;
            case 'refresh':
              queryClient.invalidateQueries({ queryKey: ['creation', creationUuid] });
              break;
            case 'highlight':
              highlightElement(action.target || action.element_id, 3000);
              break;
            case 'scroll':
              setTimeout(() => {
                const element = document.getElementById(action.target || action.element_id);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
              break;
            case 'approve_reject':
              setPendingInteraction({
                type: 'approve_reject',
                message: action.message || t('confirmContinue'),
              });
              break;
            case 'select_options':
              setPendingInteraction({
                type: 'select_options',
                message: action.message || t('selectAnOption'),
                options: action.options || [],
              });
              break;
            case 'show_config_card':
              setPendingInteraction({
                type: 'config_card',
                title: action.title || t('configParams'),
                description: action.description,
                fields: action.fields || [],
                submitText: action.submit_text || t('confirm'),
              });
              break;
            case 'confirm_generation':
              setPendingInteraction({
                type: 'confirm_generation',
                message: action.message || t('confirmGenerateVideo'),
                params: action.params || {},
              });
              break;
          }
          break;
        }

        case 'board.action':
          // 兼容旧版 board.action 事件格式
          executeBoardActions(event.actions || []);
          break;

        // ========== 其他 ==========
        case 'action.request':
          // 需要用户确认的操作
          setPendingActionRequest({
            requestId: event.request_id!,
            prompt: event.prompt!,
            actions: event.actions || [],
            timeoutSeconds: event.timeout_seconds,
          });
          break;

        case 'attachment':
          // 处理附件
          console.log('Attachment received:', event);
          break;

        case 'error':
          // 错误处理
          console.error('Agent error:', event.error);
          setConnectionError(event.error?.message || event.error || 'Unknown error');
          break;

        default:
          console.warn('Unknown SSE event type:', type, 'Full event:', event);
      }
    },
    [
      addMessage,
      updateMessage,
      setStreaming,
      setProcessing,
      setConnectionError,
      setThinking,
      setCurrentToolCall,
      setPendingActionRequest,
      setPendingInteraction,
      setBoardView,
      highlightElement,
      queryClient,
      creationUuid,
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
   * 停止 Agent 模式轮询
   */
  const stopAgentPolling = useCallback(() => {
    if (creationPollingRef.current) {
      clearInterval(creationPollingRef.current);
      creationPollingRef.current = null;
    }
    if (messagesPollingRef.current) {
      clearInterval(messagesPollingRef.current);
      messagesPollingRef.current = null;
    }
  }, []);

  /**
   * 启动 Agent 模式轮询
   * 每5秒查询创作资产信息，每3秒查询最新消息
   */
  const startAgentPolling = useCallback(() => {
    // 先停止已有的轮询
    stopAgentPolling();

    // 轮询创作资产信息（每5秒）
    creationPollingRef.current = setInterval(async () => {
      try {
        const response = await creationApi.queryCreationById(creationUuid, true);
        if (response) {
          // 更新 react-query 缓存，保持完整的响应结构
          queryClient.setQueryData(['creation', creationUuid], response);
        }
      } catch (err) {
        console.error('Creation polling error:', err);
      }
    }, CREATION_POLLING_INTERVAL);

    // 轮询最新消息（每3秒）
    messagesPollingRef.current = setInterval(async () => {
      try {
        const response = await agentApi.getMessages(creationUuid, {
          after: lastMessageIdRef.current || undefined,
        });

        const rawMessages = (response as any).messages || response.data?.messages || [];
        if (rawMessages.length > 0) {
          // 获取当前已有消息
          const existingMessages = useAgentStore.getState().messages;
          const existingMessageIds = new Set(existingMessages.map((m) => m.id));

          for (const msg of rawMessages) {
            const messageId = String(msg.id);
            const msgContent = msg.content || '';
            const msgRole = msg.role as 'user' | 'assistant';

            // 检查是否已存在相同 ID 的消息
            if (existingMessageIds.has(messageId)) {
              // 更新最后消息ID
              lastMessageIdRef.current = messageId;
              continue;
            }

            // 对于用户消息，检查是否有本地临时消息（user-xxx ID）内容相同
            // 这种情况发生在用户发送消息后，轮询获取到服务器保存的同一条消息
            if (msgRole === 'user') {
              const duplicateLocalMessage = existingMessages.find(
                (m) => m.id.startsWith('user-') && m.role === 'user' && m.content === msgContent
              );
              if (duplicateLocalMessage) {
                // 用服务器消息替换本地临时消息
                updateMessage(duplicateLocalMessage.id, {
                  id: messageId,
                });
                // 更新最后消息ID
                lastMessageIdRef.current = messageId;
                continue;
              }
            }

            // 对于 assistant 消息，检查是否有本地临时消息（assistant-xxx ID）内容相同
            // 这种情况发生在 SSE 流式传输消息后，轮询获取到服务器保存的同一条消息
            if (msgRole === 'assistant') {
              const duplicateLocalMessage = existingMessages.find(
                (m) => m.id.startsWith('assistant-') && m.role === 'assistant' && m.content === msgContent
              );
              if (duplicateLocalMessage) {
                // 用服务器消息 ID 替换本地临时消息 ID
                updateMessage(duplicateLocalMessage.id, {
                  id: messageId,
                });
                // 更新最后消息ID
                lastMessageIdRef.current = messageId;
                continue;
              }
            }

            // 添加新消息
            const formattedMessage: AgentMessage = {
              id: messageId,
              role: msgRole,
              content: msgContent,
              timestamp: msg.created_at || new Date().toISOString(),
              status: 'completed' as const,
            };
            addMessage(formattedMessage);
            // 更新最后消息ID
            lastMessageIdRef.current = messageId;
          }
        }
      } catch (err) {
        console.error('Messages polling error:', err);
      }
    }, MESSAGES_POLLING_INTERVAL);
  }, [creationUuid, queryClient, addMessage, updateMessage, stopAgentPolling]);

  /**
   * 启动轮询模式（SSE 降级方案）
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPollingMode(true);
    toast.warning(t('realtimeFailedPolling'));

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
    url: `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/creations/${creationUuid}/agent/chat`,
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
        toast.success(t('realtimeRestored'));
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
      stopAgentPolling();
    };
  }, [stopPolling, stopAgentPolling]);

  /**
   * Agent 模式轮询：每1秒查询创作资产和最新消息
   */
  useEffect(() => {
    if (!creationUuid) return;

    // 启动 agent 模式轮询
    startAgentPolling();

    return () => {
      stopAgentPolling();
    };
  }, [creationUuid, startAgentPolling, stopAgentPolling]);

  /**
   * 当 creationUuid 变化时，重置聊天状态
   * 确保切换创作时清空旧的聊天记录和连接状态
   */
  useEffect(() => {
    // 重置历史加载标记
    hasLoadedHistoryRef.current = false;
    // 清空旧的消息
    setMessages([]);
    // 重置连接状态 - 确保页面刷新后不显示错误的连接状态
    setStreaming(false);
    setProcessing(false);
    setThinking(false);
    setCurrentToolCall(null);
    // 清除处理状态超时计时器
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    // 重置其他相关的 refs
    lastMessageIdRef.current = null;
    lastRequestRef.current = null;
    currentStreamMessageIdRef.current = null;
    hasCreatedMessageRef.current = false;
    streamingContentRef.current = '';
  }, [creationUuid, setMessages, setStreaming, setProcessing, setThinking, setCurrentToolCall]);

  /**
   * 初次进入时加载历史消息
   */
  useEffect(() => {
    if (hasLoadedHistoryRef.current || !creationUuid) return;

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await agentApi.getMessages(creationUuid);
        // apiClient.get 已经返回 response.data，所以直接访问 messages
        const rawMessages = (response as any).messages || response.data?.messages || [];

        if (rawMessages.length > 0) {
          // 转换 API 返回的消息格式为前端格式
          const historyMessages: AgentMessage[] = rawMessages.map((msg: any) => ({
            id: String(msg.id),
            role: msg.role as 'user' | 'assistant',
            content: msg.content || '',
            timestamp: msg.created_at || new Date().toISOString(),
            status: 'completed' as const,
          }));

          setMessages(historyMessages);
          // 记录最后一条消息的ID，用于后续增量获取
          const lastMsg = historyMessages[historyMessages.length - 1];
          lastMessageIdRef.current = lastMsg.id;
        }

        hasLoadedHistoryRef.current = true;
      } catch (err) {
        console.error('Failed to load chat history:', err);
        // 加载失败不影响使用，只是没有历史记录
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [creationUuid, setMessages]);

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
      // 转换 action_response 为 action 和 action_data
      const action = actionResponse?.action;
      const action_data = actionResponse?.params || actionResponse?.data;
      
      const request: ChatRequest = {
        message,
        action,
        action_data,
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
          toast.error(t('sendMessageFailed'));
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
          toast.error(t('noMessageToInterrupt'));
          return;
        }

        await agentApi.interrupt(creationUuid, targetMessageId, reason);

        // 断开 SSE 连接
        sseDisconnect();
        setStreaming(false);
        toast.success(t('conversationInterrupted'));
      } catch (err: any) {
        console.error('Interrupt error:', err);
        toast.error(err.message || t('interruptFailed'));
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

        toast.success(keepAssets ? t('sessionResetKeepAssets') : t('sessionResetFull'));
      } catch (err: any) {
        console.error('Reset error:', err);
        toast.error(err.message || t('resetFailed'));
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
