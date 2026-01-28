"use client";

import Image from 'next/image';
import type { ICreation } from '@/types/creation';

interface CanvasCharacterViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

/**
 * 角色视图组件
 *
 * 展示所有角色及其候选图、描述、状态
 */
export function CanvasCharacterView({ creation, highlightedElement }: CanvasCharacterViewProps) {
  const characters = creation.characters || [];

  if (characters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-6xl">👥</div>
          <h3 className="text-xl font-bold text-gray-700">暂无角色</h3>
          <p className="text-gray-500 text-sm">
            请先上传剧本，AI 将自动提取角色信息
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 角色统计 */}
      <div className="flex gap-4">
        <div className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">总角色数</div>
          <div className="text-2xl font-bold text-blue-900">{characters.length}</div>
        </div>
        <div className="flex-1 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-xs text-green-600 mb-1">已锁定</div>
          <div className="text-2xl font-bold text-green-900">
            {characters.filter(c => c.is_locked).length}
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 mb-1">待确认</div>
          <div className="text-2xl font-bold text-purple-900">
            {characters.filter(c => !c.is_locked).length}
          </div>
        </div>
      </div>

      {/* 角色网格 */}
      <div className="grid grid-cols-2 gap-6">
        {characters.map((character) => (
          <CharacterCard
            key={character.uuid || character.id}
            character={character}
            isHighlighted={highlightedElement === `character-${character.uuid || character.id}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 角色卡片组件
 */
function CharacterCard({ character, isHighlighted }: { character: any; isHighlighted: boolean }) {
  const candidateImages = character.candidate_image_urls || [];
  const selectedImage = character.final_image_url || candidateImages[0];

  return (
    <div
      id={`character-${character.uuid || character.id}`}
      className={`
        bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all
        ${isHighlighted ? 'ring-2 ring-green-500 animate-pulse' : ''}
      `}
    >
      {/* 头部：名称 + 状态 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-semibold text-gray-800">
          {character.name || '未命名角色'}
        </h4>
        {character.is_locked ? (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full border border-green-300">
            🔒 已锁定
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full border border-yellow-300">
            ⏳ 待确认
          </span>
        )}
      </div>

      {/* 角色图片 */}
      {selectedImage ? (
        <div className="relative w-full aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3">
          <Image
            src={selectedImage}
            alt={character.name}
            fill
            className="object-cover"
          />
          {candidateImages.length > 1 && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
              1/{candidateImages.length}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">👤</div>
            <p className="text-xs text-gray-400">生成中...</p>
          </div>
        </div>
      )}

      {/* 角色描述 */}
      <div className="space-y-2">
        {character.description && (
          <div>
            <div className="text-xs text-gray-500 mb-1">描述</div>
            <p className="text-sm text-gray-700 line-clamp-2">
              {character.description}
            </p>
          </div>
        )}

        {/* 角色属性 */}
        <div className="flex flex-wrap gap-1">
          {character.gender && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200">
              {character.gender === 'male' ? '♂ 男' : character.gender === 'female' ? '♀ 女' : character.gender}
            </span>
          )}
          {character.age && (
            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs rounded border border-purple-200">
              {character.age}岁
            </span>
          )}
          {character.role && (
            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded border border-green-200">
              {character.role}
            </span>
          )}
        </div>
      </div>

      {/* 候选图片缩略图 */}
      {candidateImages.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">候选图片</div>
          <div className="flex gap-2 overflow-x-auto">
            {candidateImages.map((url: string, idx: number) => (
              <div
                key={idx}
                className="relative w-16 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
              >
                <Image
                  src={url}
                  alt={`候选 ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
