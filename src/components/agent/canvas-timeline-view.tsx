"use client";

import { useTranslations } from 'next-intl'
import { useMemo } from 'react';
import type { ICreation } from '@/types/creation';

interface CanvasTimelineViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

/**
 * 时间线视图组件
 *
 * 展示所有场景和分镜的时间线排列
 */
export function CanvasTimelineView({
  creation, highlightedElement }: CanvasTimelineViewProps) {
  const t = useTranslations('agent');
  const scenes = creation.scenes || [];

  // 计算总时长
  const totalDuration = useMemo(() => {
    return scenes.reduce((total, scene) => {
      const sceneDuration = scene.shots?.reduce((sum, shot) => sum + (shot.duration || 0), 0) || 0;
      return total + sceneDuration;
    }, 0);
  }, [scenes]);

  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">⏱️</div>
          <h3 className="text-xl font-bold text-gray-700">{t("noTimeline")}</h3>
          <p className="text-gray-500 text-sm">
            {t("completeShotsFirst")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 时间线统计 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">{t("totalDuration")}</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatDuration(totalDuration)}
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 mb-1">{t("sceneCount")}</div>
          <div className="text-2xl font-bold text-purple-900">{scenes.length}</div>
        </div>
        <div className="flex-1 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-xs text-green-600 mb-1">{t("shotCount")}</div>
          <div className="text-2xl font-bold text-green-900">
            {scenes.reduce((sum, s) => sum + (s.shots?.length || 0), 0)}
          </div>
        </div>
      </div>

      {/* 时间线可视化 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>⏱️</span>
          <span>{t("timelineView")}</span>
        </h3>

        <div className="space-y-6">
          {scenes.map((scene, sceneIdx) => {
            const sceneDuration = scene.shots?.reduce((sum, shot) => sum + (shot.duration || 0), 0) || 0;

            return (
              <div key={scene.scene_id} className="space-y-2">
                {/* 场景标题 */}
                <div
                  id={`timeline-scene-${scene.scene_id}`}
                  className={`
                    flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200
                    ${highlightedElement === `timeline-scene-${scene.scene_id}` ? 'ring-2 ring-green-500 animate-pulse' : ''}
                  `}
                >
                  <span className="text-sm font-medium text-purple-900">
                    {t('sceneNumber', { n: sceneIdx + 1 })}
                  </span>
                  <span className="text-xs text-purple-600">
                    {formatDuration(sceneDuration)}
                  </span>
                </div>

                {/* 分镜时间线 */}
                {scene.shots && scene.shots.length > 0 && (
                  <div className="pl-4 space-y-2">
                    {scene.shots.map((shot, shotIdx) => {
                      const shotDuration = shot.duration || 0;
                      const widthPercent = sceneDuration > 0 ? (shotDuration / sceneDuration) * 100 : 100 / scene.shots!.length;

                      return (
                        <div
                          key={shot.shot_id}
                          id={`timeline-shot-${shot.shot_id}`}
                          className={`
                            relative
                            ${highlightedElement === `timeline-shot-${shot.shot_id}` ? 'ring-2 ring-green-500 animate-pulse rounded' : ''}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            {/* 分镜条 */}
                            <div
                              className="h-8 bg-gradient-to-r from-blue-400 to-blue-500 rounded flex items-center px-3 text-white text-xs font-medium hover:shadow-md transition-shadow cursor-pointer"
                              style={{ width: `${Math.max(widthPercent, 15)}%` }}
                              title={shot.prompt || t("shotLabel", { n: shotIdx + 1 })}
                            >
                              <span className="truncate">
                                {t('shotNumber', { n: shotIdx + 1 })}
                              </span>
                            </div>

                            {/* 时长标签 */}
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatDuration(shotDuration)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 时间刻度尺 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('timeScaleLabel')}</h3>
        <TimelineScale totalDuration={totalDuration} />
      </div>
    </div>
  );
}

/**
 * 时间刻度尺组件
 */
function TimelineScale({ totalDuration }: { totalDuration: number }) {
  const intervals = useMemo(() => {
    const count = Math.min(Math.ceil(totalDuration / 10), 20);
    return Array.from({ length: count + 1 }, (_, i) => ({
      time: (totalDuration / count) * i,
      position: (i / count) * 100,
    }));
  }, [totalDuration]);

  return (
    <div className="relative h-12">
      {/* 刻度线 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 rounded-full" />

      {/* 刻度标记 */}
      {intervals.map((interval, idx) => (
        <div
          key={idx}
          className="absolute top-0"
          style={{ left: `${interval.position}%` }}
        >
          <div className="w-0.5 h-3 bg-gray-400" />
          <div className="text-xs text-gray-500 mt-1 -translate-x-1/2">
            {formatDuration(interval.time)}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 格式化时长（秒 -> MM:SS）
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}
