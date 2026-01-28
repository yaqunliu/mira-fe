"use client";

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * 聊天输入框组件
 *
 * 支持文本输入、Enter发送、Shift+Enter换行
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = '输入消息...',
  maxLength = 2000,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 发送消息
  const handleSend = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isSending || disabled) return;

    setIsSending(true);
    setValue('');

    try {
      await onSend(trimmedValue);
    } catch (error) {
      console.error('Failed to send message:', error);
      // 发送失败，恢复输入
      setValue(trimmedValue);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // 按键处理
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 字符数
  const charCount = value.length;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="space-y-2">
      {/* 输入框 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          maxLength={maxLength}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim() || isSending || isOverLimit}
          className="px-4 py-2 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
        >
          {isSending ? '发送中...' : '发送'}
        </button>
      </div>

      {/* 字符计数 */}
      {charCount > maxLength * 0.8 && (
        <div className={`text-xs text-right ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
          {charCount} / {maxLength}
        </div>
      )}

      {/* 提示 */}
      {!disabled && (
        <div className="text-xs text-gray-400 text-center">
          按 Enter 发送，Shift + Enter 换行
        </div>
      )}
    </div>
  );
}

/**
 * 多行文本输入框组件
 *
 * 适用于长文本输入场景
 */
interface ChatTextareaProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

export function ChatTextarea({
  onSend,
  disabled = false,
  placeholder = '输入消息...',
  maxLength = 2000,
  rows = 3,
}: ChatTextareaProps) {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 发送消息
  const handleSend = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isSending || disabled) return;

    setIsSending(true);
    setValue('');

    try {
      await onSend(trimmedValue);
    } catch (error) {
      console.error('Failed to send message:', error);
      setValue(trimmedValue);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // 按键处理
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = value.length;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          maxLength={maxLength}
          rows={rows}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow resize-none"
        />

        {/* 字符计数（内嵌） */}
        {charCount > 0 && (
          <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount} / {maxLength}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          按 Enter 发送，Shift + Enter 换行
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim() || isSending || isOverLimit}
          className="px-4 py-2 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm text-sm"
        >
          {isSending ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
