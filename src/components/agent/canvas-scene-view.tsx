"use client";

import Image from 'next/image';
import type { ICreation } from '@/types/creation';

interface CanvasSceneViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

/**
 * 场景视图组件
 *
 * 展示所有场景及其描述、氛围、视觉参考
 */
export function CanvasSceneView({ creation, highlightedElement }: CanvasSceneViewProps) {
  const scenes = creation.scenes || [];

  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎬</div>
          <h3 className="text-xl font-bold text-gray-700">暂无场景</h3>
          <p className="text-gray-500 text-sm">
            请先上传剧本，AI 将自动拆解场景
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 场景统计 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 mb-1">总场景数</div>
          <div className="text-2xl font-bold text-purple-900">{scenes.length}</div>
        </div>
        <div className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">平均分镜数</div>
          <div className="text-2xl font-bold text-blue-900">
            {scenes.length > 0
              ? Math.round(scenes.reduce((sum, s) => sum + (s.shots?.length || 0), 0) / scenes.length)
              : 0}
          </div>
        </div>
      </div>

      {/* 场景列表 */}
      <div className="space-y-4">
        {scenes.map((scene, idx) => (
          <SceneCard
            key={scene.scene_id}
            scene={scene}
            sceneNumber={idx + 1}
            isHighlighted={highlightedElement === `scene-${scene.scene_id}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 场景卡片组件
 */
function SceneCard({ scene, sceneNumber, isHighlighted }: {
  scene: any;
  sceneNumber: number;
  isHighlighted: boolean;
}) {
  const referenceImage = scene.image_url || scene.reference_image_url;
  const shotCount = scene.shots?.length || 0;

  return (
    <div
      id={`scene-${scene.scene_id}`}
      className={`
        bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all
        ${isHighlighted ? 'ring-2 ring-green-500 animate-pulse' : ''}
      `}
    >
      <div className="flex gap-4">
        {/* 左侧：场景图片 */}
        {referenceImage ? (
          <div className="relative w-48 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={referenceImage}
              alt={`场景 ${sceneNumber}`}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-48 h-32 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-1">🎬</div>
              <p className="text-xs text-gray-400">场景 {sceneNumber}</p>
            </div>
          </div>
        )}

        {/* 右侧：场景信息 */}
        <div className="flex-1 min-w-0">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-base font-semibold text-gray-800">
              场景 {sceneNumber}
            </h4>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
                {shotCount} 个分镜
              </span>
              {scene.location && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded border border-purple-200">
                  📍 {scene.location}
                </span>
              )}
            </div>
          </div>

          {/* 场景描述 */}
          {scene.description && (
            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
              {scene.description}
            </p>
          )}

          {/* 场景内容/对白 */}
          {scene.content && (
            <div className="bg-gray-50 rounded p-3 mb-3 border border-gray-200">
              <p className="text-sm text-gray-600 line-clamp-3">
                {scene.content}
              </p>
            </div>
          )}

          {/* 场景属性 */}
          <div className="flex flex-wrap gap-2">
            {scene.time_of_day && (
              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded border border-orange-200">
                🌅 {scene.time_of_day}
              </span>
            )}
            {scene.weather && (
              <span className="px-2 py-0.5 bg-cyan-50 text-cyan-600 text-xs rounded border border-cyan-200">
                🌤️ {scene.weather}
              </span>
            )}
            {scene.mood && (
              <span className="px-2 py-0.5 bg-pink-50 text-pink-600 text-xs rounded border border-pink-200">
                💭 {scene.mood}
              </span>
            )}
            {scene.duration && (
              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded border border-green-200">
                ⏱️ {scene.duration}s
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
