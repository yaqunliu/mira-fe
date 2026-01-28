"use client";

interface ChatThinkingProps {
  content: string;
}

/**
 * 思考过程展示组件
 *
 * 显示 AI 的思考过程（thinking 事件）
 */
export function ChatThinking({ content }: ChatThinkingProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mr-8 animate-fadeIn">
      {/* 头部：思考中指示器 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-purple-700">
          思考中...
        </span>
        <div className="flex gap-1 ml-auto">
          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* 思考内容 */}
      {content && (
        <div className="text-sm text-purple-600 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
}
