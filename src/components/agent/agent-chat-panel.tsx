"use client";

import { useAgentStore } from '@/stores/agent-store';
import { useAgentContext } from './agent-provider';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';

interface AgentChatPanelProps {
  creationUuid?: string; // 可选，因为现在从 Provider 获取
}

/**
 * Agent 对话面板组件
 *
 * 右侧对话区，包含：
 * - 消息列表
 * - 思考过程展示
 * - 工具调用展示
 * - 操作请求按钮
 * - 输入框
 */
export function AgentChatPanel(_props: AgentChatPanelProps) {
  const {
    messages,
    isConnected,
    isStreaming,
    isProcessing,
    isThinking,
    thinkingContent,
    currentToolCall,
    pendingActionRequest,
    pendingInteraction,
    connectionError,
    setPendingInteraction,
  } = useAgentStore();

  const {
    sendMessage,
    reconnect,
    interrupt,
    reset,
    isPollingMode,
    isInterrupting,
    isResetting,
  } = useAgentContext();

  // 处理操作请求响应
  const handleActionResponse = async (actionId: string) => {
    if (!pendingActionRequest) return;

    await sendMessage('', {
      request_id: pendingActionRequest.requestId,
      action_id: actionId,
    });
  };

  // 处理 Supervisor 交互响应
  const handleInteractionResponse = async (text: string) => {
    // 清除待处理的交互请求
    setPendingInteraction(null);
    // 将用户选择的文本作为新消息发送
    await sendMessage(text);
  };

  // 处理用户直接从输入框发送消息
  const handleSendMessage = async (message: string, actionResponse?: any) => {
    // 如果有待处理的交互请求，先清除它
    if (pendingInteraction) {
      setPendingInteraction(null);
    }
    await sendMessage(message, actionResponse);
  };

  // 处理中断
  const handleInterrupt = async () => {
    await interrupt();
  };

  // 处理重置
  const handleReset = async () => {
    if (window.confirm('确定要重置会话吗？这将清除所有对话记录。')) {
      await reset(true);
    }
  };

  // 判断是否有历史消息（用于区分初始状态和断连状态）
  const hasMessages = messages.length > 0;
  // 初始状态（没有消息且未连接）时允许发送，断连状态（有消息但未连接）时显示重连
  const isInitialState = !hasMessages && !isConnected && !connectionError;

  // DEBUG: 检查状态值
  console.log('[ChatPanel] State check:', { isStreaming, isProcessing, showIndicator: isStreaming || isProcessing });

  return (
    <div className="w-[400px] h-full border-l border-white/20 bg-white/5 backdrop-blur-sm flex flex-col">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="font-semibold text-gray-800">AI导演助手</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${isConnected
                ? 'bg-green-500'
                : isInitialState
                  ? 'bg-blue-400'
                  : 'bg-gray-400'
                }`}
            />
            <span className="text-xs text-gray-500">
              {isConnected
                ? isPollingMode
                  ? '轮询模式'
                  : '已连接'
                : isInitialState
                  ? '待命'
                  : '未连接'}
            </span>
            {!isConnected && connectionError && (
              <button
                onClick={reconnect}
                className="text-xs text-blue-500 hover:text-blue-600 ml-2"
              >
                重连
              </button>
            )}
            {/* 重置按钮 */}
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="text-xs text-gray-500 hover:text-gray-700 ml-2 disabled:opacity-50"
              title="重置会话"
            >
              {isResetting ? '重置中...' : '重置'}
            </button>
          </div>
        </div>
        {connectionError && (
          <div className="mt-2 text-xs text-red-500">
            连接错误: {connectionError}
          </div>
        )}
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-auto p-4">
        <ChatMessageList
          messages={messages}
          isThinking={isThinking}
          thinkingContent={thinkingContent}
          currentToolCall={currentToolCall}
          pendingActionRequest={pendingActionRequest}
          pendingInteraction={pendingInteraction}
          onActionResponse={handleActionResponse}
          onInteractionResponse={handleInteractionResponse}
        />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-white/20 bg-white/10">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming}
          placeholder="输入消息..."
        />
        {/* 状态指示器：流式回复中 or 后台处理中 */}
        {(isStreaming || isProcessing) && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {isStreaming ? 'AI 正在回复中' : '后台处理中'}
              <span className="animate-pulse">...</span>
            </span>
            {isStreaming && (
              <button
                onClick={handleInterrupt}
                disabled={isInterrupting}
                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                {isInterrupting ? '中断中...' : '中断'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
