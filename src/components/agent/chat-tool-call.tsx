"use client";

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
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mr-8 animate-fadeIn">
      {/* 头部：工具名称 + 状态 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-blue-700">
          🔧 {getToolDisplayName(toolCall.name)}
        </span>
        <StatusBadge status={toolCall.status} />
      </div>

      {/* 参数（如果有且在执行中） */}
      {toolCall.status === 'calling' && Object.keys(toolCall.arguments).length > 0 && (
        <div className="text-xs text-blue-600 mb-2 bg-blue-100 rounded p-2">
          <div className="font-medium mb-1">参数：</div>
          <pre className="whitespace-pre-wrap overflow-auto">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
      )}

      {/* 输出结果 */}
      {toolCall.output && (
        <div className="text-xs text-blue-600 mt-2 bg-white rounded p-2 border border-blue-100">
          <div className="font-medium mb-1 text-blue-700">结果：</div>
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
          <div className="font-medium mb-1">错误：</div>
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
  const config = {
    calling: {
      label: '执行中',
      color: 'bg-blue-500',
      icon: '⏳',
      animation: 'animate-pulse',
    },
    success: {
      label: '成功',
      color: 'bg-green-500',
      icon: '✓',
      animation: '',
    },
    error: {
      label: '失败',
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
function getToolDisplayName(toolName: string): string {
  const nameMap: Record<string, string> = {
    parse_script: '解析剧本',
    generate_character: '生成角色',
    generate_scene: '生成场景',
    generate_storyboard: '生成分镜',
    generate_image: '生成图片',
    generate_video: '生成视频',
    analyze_content: '分析内容',
    update_asset: '更新资产',
    lock_character: '锁定角色',
    regenerate_shot: '重新生成分镜',
    adjust_timeline: '调整时间线',
  };

  return nameMap[toolName] || toolName;
}
