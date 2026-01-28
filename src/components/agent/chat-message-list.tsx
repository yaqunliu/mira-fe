"use client";

import { useEffect, useRef } from 'react';
import { ChatMessageItem } from './chat-message-item';
import { ChatThinking } from './chat-thinking';
import { ChatToolCall } from './chat-tool-call';
import { ChatActionButtons } from './chat-action-buttons';
import type { AgentMessage, ToolCall, ActionRequest } from '@/types/agent';

interface ChatMessageListProps {
  messages: AgentMessage[];
  isThinking: boolean;
  thinkingContent: string;
  currentToolCall: ToolCall | null;
  pendingActionRequest: ActionRequest | null;
  onActionResponse: (actionId: string) => void;
  autoScroll?: boolean;
}

/**
 * 消息列表组件
 *
 * 展示所有对话消息、思考过程、工具调用、操作请求
 */
export function ChatMessageList({
  messages,
  isThinking,
  thinkingContent,
  currentToolCall,
  pendingActionRequest,
  onActionResponse,
  autoScroll = true,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, thinkingContent, autoScroll]);

  // 空状态
  if (messages.length === 0 && !isThinking && !currentToolCall) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="text-4xl">💬</div>
          <p className="text-gray-600 font-medium">开始与 AI 助手对话</p>
          <p className="text-xs text-gray-500">
            上传剧本或描述你的故事
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 渲染所有消息 */}
      {messages.map((msg) => (
        <ChatMessageItem key={msg.id} message={msg} />
      ))}

      {/* 思考过程展示 */}
      {isThinking && (
        <ChatThinking content={thinkingContent} />
      )}

      {/* 工具调用展示 */}
      {currentToolCall && (
        <ChatToolCall toolCall={currentToolCall} />
      )}

      {/* 操作请求 */}
      {pendingActionRequest && (
        <ChatActionButtons
          request={pendingActionRequest}
          onAction={onActionResponse}
        />
      )}

      {/* 滚动锚点 */}
      <div ref={messagesEndRef} />
    </div>
  );
}
