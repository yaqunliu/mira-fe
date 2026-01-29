"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import type { ICreation } from '@/types/creation';

interface CanvasStoryboardViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

/**
 * 分镜视图组件
 *
 * 展示所有分镜及其图片、描述、状态
 */
export function CanvasStoryboardView({ creation, highlightedElement }: CanvasStoryboardViewProps) {
  // 收集所有分镜
  const allShots = creation.scenes?.flatMap(scene =>
    (scene.shots || []).map(shot => ({
      ...shot,
      scene_id: scene.scene_id,
      scene_name: `场景 ${scene.scene_id}`,
    }))
  ) || [];

  if (allShots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">🎞️</div>
          <h3 className="text-xl font-bold text-gray-700">暂无分镜</h3>
          <p className="text-gray-500 text-sm">
            请先完成场景拆解，AI 将自动生成分镜
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 分镜统计 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">总分镜数</div>
          <div className="text-2xl font-bold text-blue-900">{allShots.length}</div>
        </div>
        <div className="flex-1 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-xs text-green-600 mb-1">已生成</div>
          <div className="text-2xl font-bold text-green-900">
            {allShots.filter(s => s.image_url).length}
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 mb-1">已配音</div>
          <div className="text-2xl font-bold text-purple-900">
            {allShots.filter(s => s.audio_url).length}
          </div>
        </div>
      </div>

      {/* 分镜网格 */}
      <div className="grid grid-cols-3 gap-4">
        {allShots.map((shot, idx) => (
          <ShotCard
            key={shot.shot_id}
            shot={shot}
            shotNumber={idx + 1}
            isHighlighted={highlightedElement === `shot-${shot.shot_id}`}
            allCharacters={creation.characters}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 分镜卡片组件
 */
function ShotCard({ shot, shotNumber, isHighlighted, allCharacters = [] }: {
  shot: any;
  shotNumber: number;
  isHighlighted: boolean;
  allCharacters?: any[];
}) {
  const hasImage = !!shot.image_url;
  const hasAudio = !!shot.audio_url;

  // 提取当前分镜的角色
  const displayCharacters = useMemo(() => {
    const charMap = new Map<string | number, any>();
    
    // 1. 尝试直接从 shot.characters 获取
    if (shot.characters && Array.isArray(shot.characters)) {
      shot.characters.forEach((c: any) => {
        const id = c.uuid || c.character_id;
        if (id) charMap.set(id, c);
      });
    }

    // 2. 尝试从 associated_characters 获取
    if (shot.associated_characters && Array.isArray(shot.associated_characters)) {
      shot.associated_characters.forEach((id: any) => {
        if (id && !charMap.has(id)) {
          const char = allCharacters.find(c => (c.uuid || c.character_id) === id);
          if (char) charMap.set(id, char);
        }
      });
    }

    // 3. 尝试从 narration 获取
    let narration = shot.narration;
    if (typeof narration === 'string' && narration.trim()) {
      try {
        narration = JSON.parse(narration);
      } catch (e) {}
    }

    if (Array.isArray(narration)) {
      narration.forEach((item: any) => {
        const name = item.角色;
        if (name) {
          const char = allCharacters.find(c => c.name === name);
          if (char) {
            const id = char.uuid || char.character_id;
            if (id && !charMap.has(id)) charMap.set(id, char);
          }
        }
      });
    }

    return Array.from(charMap.values());
  }, [shot.characters, shot.associated_characters, shot.narration, allCharacters]);

  return (
    <div
      id={`shot-${shot.shot_id}`}
      className={`
        bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-all
        ${isHighlighted ? 'ring-2 ring-green-500 animate-pulse' : ''}
      `}
    >
      {/* 分镜图片 */}
      {hasImage ? (
        <div className="relative w-full aspect-video bg-gray-100 rounded overflow-hidden mb-3">
          <Image
            src={shot.image_url}
            alt={`分镜 ${shotNumber}`}
            fill
            className="object-cover"
          />
          {/* 分镜编号角标 */}
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
            #{shotNumber}
          </div>
          {/* 音频标识 */}
          {hasAudio && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
              🔊
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-3 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-1">🎞️</div>
            <p className="text-xs text-gray-400">#{shotNumber}</p>
            <p className="text-xs text-gray-400">生成中...</p>
          </div>
        </div>
      )}

      {/* 分镜信息 */}
      <div className="space-y-2">
        {/* 所属场景 */}
        <div className="text-xs text-gray-500">
          {shot.scene_name}
        </div>

        {/* 关联角色 */}
        {displayCharacters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayCharacters.map((char: any) => (
              <span
                key={char.uuid || char.character_id}
                className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[10px] rounded border border-green-200"
              >
                👤 {char.name}
              </span>
            ))}
          </div>
        )}

        {/* 分镜描述/提示词 */}
        {shot.prompt && (
          <p className="text-sm text-gray-700 line-clamp-2">
            {shot.prompt}
          </p>
        )}

        {/* 画面运动 */}
        {shot.camera_movement && (
          <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
            📹 {shot.camera_movement}
          </div>
        )}

        {/* 持续时间 */}
        {shot.duration && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">时长</span>
            <span className="text-gray-700 font-medium">{shot.duration}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
