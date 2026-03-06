"use client";

import { useEffect, useRef, useState } from 'react';
import { ChatMessageItem } from './chat-message-item';
import { ChatThinking } from './chat-thinking';
import { ChatToolCall } from './chat-tool-call';
import { ChatActionButtons } from './chat-action-buttons';
import { ChatInteractionCard } from './chat-interaction-card';
import type { AgentMessage, ToolCall, ActionRequest, PendingInteraction } from '@/types/agent';

interface ChatMessageListProps {
  messages: AgentMessage[];
  isThinking: boolean;
  thinkingContent: string;
  currentToolCall: ToolCall | null;
  pendingActionRequest: ActionRequest | null;
  pendingInteraction: PendingInteraction | null;
  onActionResponse: (actionId: string) => void;
  onInteractionResponse: (text: string) => void;
  autoScroll?: boolean;
  creationType?: string;
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
  pendingInteraction,
  onActionResponse,
  onInteractionResponse,
  autoScroll = true,
  creationType,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 跟踪哪些消息的卡片已经被处理过 - 必须在所有条件分支之前
  const [processedCardMessages, setProcessedCardMessages] = useState<Set<string>>(new Set());

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, thinkingContent, autoScroll]);

  // 空状态 - 根据 creationType 显示不同欢迎语
  if (messages.length === 0 && !isThinking && !currentToolCall) {
    const isChat = creationType === "chat";
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="text-4xl">{isChat ? "📚" : "💬"}</div>
          <p className="text-gray-600 font-medium">
            {isChat ? "开始英文单词视频创作" : "开始与 AI 助手对话"}
          </p>
          <p className="text-xs text-gray-500">
            {isChat 
              ? "告诉我你想学习哪些单词，我来帮你制作教学视频" 
              : "上传剧本或描述你的故事"}
          </p>
          {isChat && (
            <div className="mt-4 p-3 bg-[#22C55E]/10 rounded-lg text-left max-w-xs mx-auto">
              <p className="text-xs text-gray-600 mb-2">💡 你可以这样开始：</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• "创建 apple banana 的单词视频"</li>
                <li>• "添加 cat dog，简单难度"</li>
                <li>• "你能帮我做什么？"</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 获取最后一条需要显示卡片的消息
  const lastCardMessage = [...messages].reverse().find(
    (msg) => msg.role === "assistant" && msg.boardActions && msg.boardActions.length > 0 && !processedCardMessages.has(msg.id)
  );

  // 处理卡片响应
  const handleCardResponse = (text: string) => {
    if (lastCardMessage) {
      setProcessedCardMessages((prev) => new Set([...prev, lastCardMessage.id]));
    }
    onInteractionResponse(text);
  };

  // 构建 pendingInteraction 从最后一条消息的 boardActions
  const cardInteraction: PendingInteraction | null = lastCardMessage?.boardActions?.[0]
    ? (() => {
        const action = lastCardMessage.boardActions[0];
        const baseInteraction = {
          message: action.message || "",
          title: action.title,
          description: action.description,
          fields: action.fields,
          submitText: action.submit_text,
          options: action.options,
          params: action.params,
        };
        
        if (action.type === "show_config_card") {
          return { type: "config_card" as const, ...baseInteraction };
        } else if (action.type === "confirm_generation") {
          return { type: "confirm_generation" as const, ...baseInteraction };
        } else {
          return { type: "select_options" as const, ...baseInteraction };
        }
      })()
    : null;

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

      {/* Supervisor 交互请求 - 优先使用实时 pendingInteraction，否则使用消息中的卡片 */}
      {pendingInteraction ? (
        <ChatInteractionCard
          interaction={pendingInteraction}
          onResponse={onInteractionResponse}
        />
      ) : cardInteraction ? (
        <ChatInteractionCard
          interaction={cardInteraction}
          onResponse={handleCardResponse}
        />
      ) : null}

      {/* 滚动锚点 */}
      <div ref={messagesEndRef} />
    </div>
  );
}
