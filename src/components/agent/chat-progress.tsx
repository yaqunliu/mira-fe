"use client";

import { useTranslations } from 'next-intl';

interface ChatProgressProps {
  label: string;
  progress: number; // 0-100
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
  detail?: string;
}

/**
 * 进度条组件
 *
 * 显示任务进度（如生成角色、分镜等）
 */
export function ChatProgress({
  label,
  progress,
  status = 'in_progress',
  detail,
}: ChatProgressProps) {
  const t = useTranslations('agent');
  // 进度条颜色
  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-gradient-to-r from-[#22C55E] to-[#ADD8E6]';
      default:
        return 'bg-gray-300';
    }
  };

  // 状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'error':
        return '✗';
      case 'in_progress':
        return '⏳';
      default:
        return '○';
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 mr-8">
      {/* 头部：标签 + 状态 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getStatusIcon()}</span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-xs font-semibold text-gray-600">
          {Math.round(progress)}%
        </span>
      </div>

      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${getProgressColor()}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          {status === 'in_progress' && (
            <div className="h-full w-full bg-white/30 animate-shimmer" />
          )}
        </div>
      </div>

      {/* 详细信息 */}
      {detail && (
        <div className="mt-2 text-xs text-gray-600">
          {detail}
        </div>
      )}
    </div>
  );
}

/**
 * 进度列表组件
 *
 * 显示多个进度项（如批量生成）
 */
interface ChatProgressListProps {
  items: Array<{
    id: string;
    label: string;
    progress: number;
    status?: 'pending' | 'in_progress' | 'completed' | 'error';
  }>;
  title?: string;
}

export function ChatProgressList({ items, title }: ChatProgressListProps) {
  const t = useTranslations('agent');
  const totalProgress = items.reduce((sum, item) => sum + item.progress, 0) / items.length;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 mr-8">
      {/* 总标题 */}
      {title && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-200">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <span className="text-xs font-semibold text-gray-600">
            {t('totalProgress')} {Math.round(totalProgress)}%
          </span>
        </div>
      )}

      {/* 进度项列表 */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            {/* 状态图标 */}
            <span className="text-xs flex-shrink-0">
              {item.status === 'completed' ? '✓' :
               item.status === 'error' ? '✗' :
               item.status === 'in_progress' ? '⏳' : '○'}
            </span>

            {/* 标签 */}
            <span className="text-xs text-gray-600 flex-shrink-0 min-w-[80px]">
              {item.label}
            </span>

            {/* 迷你进度条 */}
            <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'error' ? 'bg-red-500' :
                  'bg-gradient-to-r from-[#22C55E] to-[#ADD8E6]'
                }`}
                style={{ width: `${item.progress}%` }}
              />
            </div>

            {/* 百分比 */}
            <span className="text-xs text-gray-500 flex-shrink-0 w-10 text-right">
              {Math.round(item.progress)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
