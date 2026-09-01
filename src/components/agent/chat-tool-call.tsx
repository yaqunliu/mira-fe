"use client";

import { useTranslations } from 'next-intl'
import type { ToolCall } from '@/types/agent';

interface ChatToolCallProps {
  toolCall: ToolCall;
}

/**
 * 工具调用展示组件
 *
 * 显示工具调用的名称、状态、输出
 */
export function ChatToolCall({ toolCall }: ChatToolCallProps) {
  const t = useTranslations('agent')
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mr-8 animate-fadeIn">
      {/* 头部：工具名称 + 状态 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-blue-700">
          🔧 {getToolDisplayName(toolCall.name, t)}
        </span>
        <StatusBadge status={toolCall.status} />
      </div>

      {/* 参数（如果有且在执行中） */}
      {toolCall.status === 'calling' && Object.keys(toolCall.arguments).length > 0 && (
        <div className="text-xs text-blue-600 mb-2 bg-blue-100 rounded p-2">
          <div className="font-medium mb-1">{t("toolParams")}</div>
          <pre className="whitespace-pre-wrap overflow-auto">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
      )}

      {/* 输出结果 */}
      {toolCall.output && (
        <div className="text-xs text-blue-600 mt-2 bg-white rounded p-2 border border-blue-100">
          <div className="font-medium mb-1 text-blue-700">{t("toolResult")}</div>
          <div className="whitespace-pre-wrap overflow-auto max-h-40">
            {typeof toolCall.output === 'string'
              ? toolCall.output
              : JSON.stringify(toolCall.output, null, 2)}
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {toolCall.error && (
        <div className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2 border border-red-200">
          <div className="font-medium mb-1">{t("toolError")}</div>
          <div>{toolCall.error}</div>
        </div>
      )}
    </div>
  );
}

/**
 * 状态徽章组件
 */
function StatusBadge({ status }: { status: ToolCall['status'] }) {
  const t = useTranslations('agent')
  const config = {
    calling: {
      label: t('toolRunning'),
      color: 'bg-blue-500',
      icon: '⏳',
      animation: 'animate-pulse',
    },
    success: {
      label: t('toolSuccess'),
      color: 'bg-green-500',
      icon: '✓',
      animation: '',
    },
    error: {
      label: t('toolFailed'),
      color: 'bg-red-500',
      icon: '✗',
      animation: '',
    },
  };

  const { label, color, icon, animation } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white ${color} ${animation}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

/**
 * 工具名称映射
 */
function getToolDisplayName(toolName: string, t: (k: string) => string): string {
  const nameMap: Record<string, string> = {
    parse_script: t('toolParseScript'),
    generate_character: t('toolGenerateCharacter'),
    generate_scene: t('toolGenerateScene'),
    generate_storyboard: t('toolGenerateShot'),
    generate_image: t('toolGenerateImage'),
    generate_video: t('toolGenerateVideo'),
    analyze_content: t('toolAnalyzeContent'),
    update_asset: t('toolUpdateAsset'),
    lock_character: t('toolLockCharacter'),
    regenerate_shot: t('toolRegenerateShot'),
    adjust_timeline: t('toolAdjustTimeline'),
  };

  return nameMap[toolName] || toolName;
}
