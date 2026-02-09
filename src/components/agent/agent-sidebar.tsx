"use client";

import { useAgentStore } from '@/stores/agent-store';
import type { ICreation } from '@/types/creation';
import { getAllCharactersFromShots } from './canvas-character-view';

interface AgentSidebarProps {
  creation: ICreation | null;
}

/**
 * Agent 侧边栏组件
 *
 * 左侧资产导航栏，展示：
 * - 快速导航
 * - 项目进度
 */
export function AgentSidebar({ creation }: AgentSidebarProps) {
  const { setBoardView, currentView } = useAgentStore();

  // 计算资产数量 - 优先使用 creation.characters，如果没有再从分镜提取
  const allCharacters = (creation?.characters && creation.characters.length > 0)
    ? creation.characters
    : getAllCharactersFromShots(creation);
  const stats = {
    characters: allCharacters.length,
    scenes: creation?.scenes?.length || 0,
    shots: creation?.scenes?.reduce((sum, scene) => sum + (scene.shots?.length || 0), 0) || 0,
  };

  // 计算项目进度
  const progress = calculateProgress(creation);

  // 导航项
  const navItems = [
    { id: 'script' as const, label: '剧本', icon: '📜', count: null },
    { id: 'characters' as const, label: '角色', icon: '👥', count: stats.characters },
    { id: 'scenes' as const, label: '场景', icon: '🎬', count: stats.scenes },
    { id: 'storyboard' as const, label: '分镜', icon: '🎞️', count: stats.shots },
    { id: 'preview' as const, label: '预览', icon: '▶️', count: null },
  ];

  return (
    <div className="w-[200px] h-full border-r border-white/20 bg-white/5 backdrop-blur-sm p-4 flex flex-col">
      {/* 项目标题 */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-1 truncate">
          {creation?.title || '新建项目'}
        </h3>
        <p className="text-xs text-gray-500">
          {creation?.uuid?.slice(0, 8) || '---'}
        </p>
      </div>

      {/* 导航菜单 */}
      <div className="mb-6 flex-1">
        <div className="text-xs font-medium text-gray-700 mb-3 flex items-center gap-1">
          <span>🧭</span>
          <span>快速导航</span>
        </div>
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setBoardView(item.id)}
              className={`
                w-full px-3 py-2 rounded-lg text-xs font-medium transition-all text-left
                flex items-center justify-between
                ${currentView === item.id
                  ? 'bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white shadow-sm'
                  : 'bg-white/50 text-gray-700 hover:bg-white/80'
                }
              `}
            >
              <span className="flex items-center gap-2">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
              {item.count !== null && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded
                  ${currentView === item.id ? 'bg-white/20' : 'bg-gray-200'}
                `}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 项目进度 */}
      <div className="mt-auto">
        <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
          <span>📊</span>
          <span>项目进度</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1 text-right">
          {progress}%
        </div>

        {/* 状态提示 */}
        {creation && (
          <div className="mt-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(creation.status)}`} />
              <span>{getStatusText(creation.status)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 计算项目进度
 */
function calculateProgress(creation: ICreation | null): number {
  if (!creation) return 0;

  let progress = 0;

  // 有剧本: +20%
  if (creation.extra_data?.script || creation.extra_data?.prompt) progress += 20;

  // 有角色: +20%
  if (creation.characters && creation.characters.length > 0) progress += 20;

  // 有分镜: +20% (分镜本身就在场景中，不需要额外检查场景)
  const hasShots = creation.scenes?.some(s => s.shots && s.shots.length > 0);
  if (hasShots) progress += 20;

  // 有视频: +20%
  if (creation.video_url) progress += 20;

  // 有音频: +20%
  if (creation.audio_url) progress += 20;

  return progress;
}

/**
 * 获取状态文本
 */
function getStatusText(status: string | undefined): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  };

  return statusMap[status || ''] || '未知';
}

/**
 * 获取状态颜色
 */
function getStatusColor(status: string | undefined): string {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-400',
    processing: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return colorMap[status || ''] || 'bg-gray-400';
}
