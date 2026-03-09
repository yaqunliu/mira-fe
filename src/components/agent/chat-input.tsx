"use client";

import { useState, useRef, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder,
  maxLength = 2000,
}: ChatInputProps) {
  const t = useTranslations("createAgent");
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = value.length;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t("inputPlaceholder")}
          disabled={disabled || isSending}
          maxLength={maxLength}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim() || isSending || isOverLimit}
          className="px-4 py-2 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
        >
          {isSending ? t("input.sending") : t("input.send")}
        </button>
      </div>

      {charCount > maxLength * 0.8 && (
        <div className={`text-xs text-right ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
          {charCount} / {maxLength}
        </div>
      )}

      {!disabled && (
        <div className="text-xs text-gray-400 text-center">
          {t("input.enterToSend")}
        </div>
      )}
    </div>
  );
}

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
  placeholder,
  maxLength = 2000,
  rows = 3,
}: ChatTextareaProps) {
  const t = useTranslations("createAgent");
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          placeholder={placeholder || t("inputPlaceholder")}
          disabled={disabled || isSending}
          maxLength={maxLength}
          rows={rows}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow resize-none"
        />

        {charCount > 0 && (
          <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount} / {maxLength}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {t("input.enterToSend")}
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim() || isSending || isOverLimit}
          className="px-4 py-2 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm text-sm"
        >
          {isSending ? t("input.sending") : t("input.send")}
        </button>
      </div>
    </div>
  );
}
