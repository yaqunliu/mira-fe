"use client";

import { useState } from 'react';
import type { ActionRequest } from '@/types/agent';

interface ChatActionButtonsProps {
  request: ActionRequest;
  onAction: (actionId: string) => void;
  disabled?: boolean;
}

/**
 * 操作按钮组件
 *
 * 显示 Agent 请求用户做出的操作选择
 */
export function ChatActionButtons({
  request,
  onAction,
  disabled = false,
}: ChatActionButtonsProps) {
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const handleClick = (actionId: string) => {
    setSelectedActionId(actionId);
    onAction(actionId);
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mr-8 animate-fadeIn">
      {/* 提示文本 */}
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        {request.prompt}
      </p>

      {/* 操作按钮组 */}
      <div className="flex flex-wrap gap-2">
        {request.actions.map((action) => {
          const isSelected = selectedActionId === action.id;
          const isPrimary = action.type === 'primary';
          const isDanger = action.style === 'danger';

          return (
            <button
              key={action.id}
              onClick={() => handleClick(action.id)}
              disabled={disabled || isSelected}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isPrimary && !isDanger
                  ? 'bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white hover:opacity-90 shadow-sm'
                  : ''
                }
                ${isPrimary && isDanger
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                  : ''
                }
                ${!isPrimary && !isDanger
                  ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : ''
                }
                ${!isPrimary && isDanger
                  ? 'bg-white border border-red-300 text-red-600 hover:bg-red-50'
                  : ''
                }
                ${isSelected
                  ? 'ring-2 ring-green-400 ring-offset-1'
                  : ''
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isSelected && <span className="mr-1">✓</span>}
              {action.label}
            </button>
          );
        })}
      </div>

      {/* 超时提示 */}
      {request.timeoutSeconds && (
        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
          <span>⏱️</span>
          <span>请在 {request.timeoutSeconds} 秒内选择</span>
        </div>
      )}
    </div>
  );
}
