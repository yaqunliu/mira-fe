"use client";

import { useAgentStore } from '@/stores/agent-store';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';

interface AgentChatPanelProps {
  creationUuid: string;
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
export function AgentChatPanel({ creationUuid }: AgentChatPanelProps) {
  const {
    messages,
    isConnected,
    isStreaming,
    isThinking,
    thinkingContent,
    currentToolCall,
    pendingActionRequest,
    connectionError,
  } = useAgentStore();

  const { sendMessage, reconnect } = useAgentChat(creationUuid);

  // 处理操作请求响应
  const handleActionResponse = async (actionId: string) => {
    if (!pendingActionRequest) return;

    await sendMessage('', {
      request_id: pendingActionRequest.requestId,
      action_id: actionId,
    });
  };

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
              className={`w-2 h-2 rounded-full transition-colors ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? '已连接' : '未连接'}
            </span>
            {!isConnected && connectionError && (
              <button
                onClick={reconnect}
                className="text-xs text-blue-500 hover:text-blue-600 ml-2"
              >
                重连
              </button>
            )}
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
          onActionResponse={handleActionResponse}
        />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-white/20 bg-white/10">
        <ChatInput
          onSend={sendMessage}
          disabled={!isConnected || isStreaming}
          placeholder="输入消息..."
        />
        {isStreaming && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            AI 正在回复中...
          </p>
        )}
      </div>
    </div>
  );
}
