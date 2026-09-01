"use client";

import { useTranslations } from 'next-intl'
import { useAgentStore } from '@/stores/agent-store';
import { CanvasScriptView } from './canvas-script-view';
import { CanvasCharacterView } from './canvas-character-view';
import { CanvasSceneView } from './canvas-scene-view';
import { CanvasStoryboardView } from './canvas-storyboard-view';
import { CanvasPreviewView } from './canvas-preview-view';
import type { ICreation } from '@/types/creation';

interface AgentCanvasProps {
  creation: ICreation | null;
}

/**
 * Agent 看板区组件
 *
 * 中间看板区，根据当前视图展示不同内容：
 * - script: 剧本视图
 * - characters: 角色视图
 * - scenes: 场景视图
 * - storyboard: 分镜视图
 * - preview: 预览视图
 */
export function AgentCanvas({ creation }: AgentCanvasProps) {
  const t = useTranslations('agent')
  const { currentView, highlightedElement, setBoardView } = useAgentStore();

  // 视图组件映射
  const viewComponents: Record<string, React.ComponentType<any>> = {
    script: CanvasScriptView,
    characters: CanvasCharacterView,
    scenes: CanvasSceneView,
    storyboard: CanvasStoryboardView,
    preview: CanvasPreviewView,
  };

  // 确保 currentView 是有效的视图
  const validView = (currentView in viewComponents ? currentView : 'script') as string;
  
  // 如果视图无效，自动切换到默认视图
  if (validView !== currentView) {
    setBoardView(validView as any);
  }

  const ViewComponent = viewComponents[validView];

  // 如果组件仍然 undefined，显示空状态
  if (!ViewComponent) {
    return (
      <div className="flex-1 h-full overflow-auto bg-white/5">
        <div className="p-6">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-auto bg-white/5">
      <div className="p-6">
        {/* 视图头部 */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {getViewTitle(currentView, t)}
          </h2>
          <ViewSwitcher />
        </div>

        {/* 视图内容 */}
        <div className="claymorphism rounded-2xl p-6 min-h-[500px]">
          {creation ? (
            <ViewComponent
              creation={creation}
              highlightedElement={highlightedElement}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 视图切换器
 */
function ViewSwitcher() {
  const t = useTranslations('agent');
  const { currentView, setBoardView } = useAgentStore();

  const views = [
    { id: 'script' as const, label: t('script'), icon: '📜' },
    { id: 'characters' as const, label: t('characters'), icon: '👥' },
    { id: 'scenes' as const, label: t('scenes'), icon: '🎬' },
    { id: 'storyboard' as const, label: t('shots'), icon: '🎞️' },
    { id: 'preview' as const, label: t('preview'), icon: '▶️' },
  ];

  return (
    <div className="flex gap-2">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => setBoardView(view.id)}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${currentView === view.id
              ? 'bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white shadow-sm'
              : 'bg-white/50 text-gray-600 hover:bg-white/80 border border-gray-200'
            }
          `}
        >
          <span className="mr-1">{view.icon}</span>
          {view.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 空状态
 */
function EmptyState() {
  const t = useTranslations('agent');
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="text-6xl">🎬</div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] bg-clip-text text-transparent">
          {t("readyToCreate")}
        </h3>
        <p className="text-gray-600">
          {t("chatWithAI")}
        </p>
      </div>
    </div>
  );
}

/**
 * 获取视图标题
 */
function getViewTitle(view: string, t: (k: string) => string): string {
  const titles: Record<string, string> = {
    script: t('scriptContent'),
    characters: t('characterDesign'),
    scenes: t('sceneDesign'),
    storyboard: t('shotDesign'),
    preview: t('workPreview'),
  };

  return titles[view] || t('board');
}
