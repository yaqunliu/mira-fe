"use client";

import type { AgentMessage } from '@/types/agent';
import ReactMarkdown from 'react-markdown';

interface ChatMessageItemProps {
  message: AgentMessage;
}

/**
 * 消息气泡组件
 *
 * 展示单条消息（用户或 AI）
 */
export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`p-3 rounded-lg transition-all ${isUser
          ? 'bg-gradient-to-r from-blue-100 to-blue-50 ml-8 border border-blue-200'
          : 'bg-gradient-to-r from-gray-100 to-gray-50 mr-8 border border-gray-200'
        }`}
    >
      <div className="flex items-start gap-2">
        {/* 头像 */}
        <span className="text-sm flex-shrink-0">
          {isUser ? '👤' : '🤖'}
        </span>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 消息文本 - AI消息支持Markdown渲染 */}
          <div className="text-sm text-gray-800 break-words">
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <div className="prose prose-sm prose-gray max-w-none
                prose-p:my-1 prose-p:leading-relaxed
                prose-ul:my-1 prose-ul:pl-4
                prose-ol:my-1 prose-ol:pl-4
                prose-li:my-0.5
                prose-headings:my-2
                prose-strong:text-gray-900
                prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:p-2 prose-pre:rounded-lg prose-pre:overflow-x-auto
              ">
                <ReactMarkdown>{message.content || ''}</ReactMarkdown>
              </div>
            )}
            {/* 流式输入光标 */}
            {message.status === 'streaming' && (
              <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse ml-1" />
            )}
          </div>

          {/* 附件 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-white/50 rounded border border-gray-200 text-xs flex items-center gap-2"
                >
                  <span>📎</span>
                  <span className="truncate">
                    {attachment.filename || `附件 ${idx + 1}`}
                  </span>
                  {attachment.size && (
                    <span className="text-gray-400 text-xs">
                      ({formatFileSize(attachment.size)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 工具调用（如果有） */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.toolCalls.map((toolCall) => (
                <div
                  key={toolCall.id}
                  className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"
                >
                  🔧 {toolCall.name}
                </div>
              ))}
            </div>
          )}

          {/* 时间戳 */}
          <div className="mt-1 text-xs text-gray-400">
            {formatTimestamp(message.timestamp)}
          </div>

          {/* 错误状态 */}
          {message.status === 'error' && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              ⚠️ 消息发送失败
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: string): string {
  // 处理空值或无效时间戳
  if (!timestamp) {
    return '刚刚';
  }

  const date = new Date(timestamp);

  // 检查是否为有效日期
  if (isNaN(date.getTime())) {
    return '刚刚';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  // 1分钟内
  if (diffMins < 1) return '刚刚';

  // 1小时内
  if (diffMins < 60) return `${diffMins} 分钟前`;

  // 今天
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // 其他
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
