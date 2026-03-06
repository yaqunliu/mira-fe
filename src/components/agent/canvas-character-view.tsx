"use client";

import { useState, useCallback } from 'react';
import type { ICreation } from '@/types/creation';
import type { ICharacter } from '@/types/character';
import { CharacterDetailDialog } from './character-detail-dialog';

interface CanvasCharacterViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

/**
 * 从分镜中提取所有角色
 */
export function getAllCharactersFromShots(creation: ICreation | null): ICharacter[] {
  if (!creation || !creation.scenes) return [];

  const characterMap = new Map<string | number, ICharacter>();
  const allCharacters = creation.characters || [];

  // 建立 ID 和 Name 的快速查找表
  const idToChar = new Map<string | number, ICharacter>();
  const nameToChar = new Map<string, ICharacter>();

  allCharacters.forEach(char => {
    const id = char.uuid || char.character_id;
    if (id) idToChar.set(id, char);
    if (char.name) nameToChar.set(char.name, char);
  });

  // 1. 从场景和分镜中提取关联角色
  creation.scenes.forEach(scene => {
    // 1.0 检查 scene.characters (场景级别的角色列表)
    // API 可能将角色数据放在 scene.characters 里
    const sceneAny = scene as any;
    if (sceneAny.characters && Array.isArray(sceneAny.characters)) {
      sceneAny.characters.forEach((char: any) => {
        const id = char.uuid || char.character_id || char.id;
        if (id && !characterMap.has(id)) {
          // 优先使用 creation.characters 里的完整数据
          characterMap.set(id, idToChar.get(id) || char);
        }
        // 同时更新查找表，以便后续台词匹配使用
        if (char.name && !nameToChar.has(char.name)) {
          nameToChar.set(char.name, char);
        }
      });
    }

    if (scene.shots && Array.isArray(scene.shots)) {
      scene.shots.forEach(shot => {
        // 1.1 检查 shot.characters (直接对象)
        if (shot.characters && Array.isArray(shot.characters)) {
          shot.characters.forEach(char => {
            const id = char.uuid || char.character_id;
            if (id && !characterMap.has(id)) {
              // 优先使用 creation.characters 里的完整数据，因为那里的信息更全（如描述、属性等）
              characterMap.set(id, idToChar.get(id) || char);
            }
          });
        }

        // 1.2 检查 shot.associated_characters (ID 列表)
        if (shot.associated_characters && Array.isArray(shot.associated_characters)) {
          shot.associated_characters.forEach(id => {
            if (id && !characterMap.has(id)) {
              const char = idToChar.get(id);
              if (char) characterMap.set(id, char);
            }
          });
        }

        // 1.3 检查 shot.narration (台词中的角色名)
        // 这是一个重要的兜底方案，如果后端没返回关联字段，我们通过台词中的角色名进行匹配
        let narration = shot.narration;
        if (typeof narration === 'string' && (narration as string).trim()) {
          try {
            narration = JSON.parse(narration);
          } catch (e) { }
        }

        if (Array.isArray(narration)) {
          narration.forEach(item => {
            const name = item.角色;
            if (name && nameToChar.has(name)) {
              const char = nameToChar.get(name)!;
              const id = char.uuid || char.character_id;
              if (id && !characterMap.has(id)) {
                characterMap.set(id, char);
              }
            }
          });
        }
      });
    }
  });

  return Array.from(characterMap.values());
}

/**
 * 获取生成状态
 * 状态: pending/未生成, generating/生成中, generated/已生成
 */
function getGenerationStatus(character: any): 'pending' | 'generating' | 'generated' {
  const status = character.status?.toLowerCase();
  const hasImage = !!character.image_url;

  if (hasImage || status === 'generated' || status === 'completed' || status === 'done') {
    return 'generated';
  }
  if (status === 'generating' || status === 'processing' || status === 'running') {
    return 'generating';
  }
  return 'pending';
}

/**
 * 状态标签组件
 */
function StatusBadge({ status }: { status: 'pending' | 'generating' | 'generated' }) {
  const config = {
    pending: {
      label: '⏳ 未生成',
      className: 'bg-gray-100 text-gray-600 border-gray-300',
    },
    generating: {
      label: '🔄 生成中',
      className: 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse',
    },
    generated: {
      label: '✅ 已生成',
      className: 'bg-green-100 text-green-700 border-green-300',
    },
  };

  const { label, className } = config[status];

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${className}`}>
      {label}
    </span>
  );
}

/**
 * 角色视图组件
 *
 * 展示所有角色及其候选图、描述、状态
 */
export function CanvasCharacterView({ creation, highlightedElement }: CanvasCharacterViewProps) {
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | null>(null);

  // 优先直接使用 creation.characters，如果没有再从分镜提取
  const characters = (creation.characters && creation.characters.length > 0)
    ? creation.characters
    : getAllCharactersFromShots(creation);

  // 当前选中的角色
  const selectedCharacter = selectedCharacterIndex !== null ? characters[selectedCharacterIndex] : null;

  // 打开角色详情
  const handleOpenDetail = useCallback((index: number) => {
    setSelectedCharacterIndex(index);
  }, []);

  // 关闭角色详情
  const handleCloseDetail = useCallback(() => {
    setSelectedCharacterIndex(null);
  }, []);

  // 导航到上一个角色
  const handleNavigatePrevious = useCallback(() => {
    if (selectedCharacterIndex !== null && selectedCharacterIndex > 0) {
      setSelectedCharacterIndex(selectedCharacterIndex - 1);
    }
  }, [selectedCharacterIndex]);

  // 导航到下一个角色
  const handleNavigateNext = useCallback(() => {
    if (selectedCharacterIndex !== null && selectedCharacterIndex < characters.length - 1) {
      setSelectedCharacterIndex(selectedCharacterIndex + 1);
    }
  }, [selectedCharacterIndex, characters.length]);

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

  // 统计各状态数量
  const statusCounts = characters.reduce(
    (acc, c) => {
      const status = getGenerationStatus(c);
      acc[status]++;
      return acc;
    },
    { pending: 0, generating: 0, generated: 0 }
  );

  return (
    <>
      <div className="space-y-6">
        {/* 角色统计 */}
        <div className="flex gap-4">
          <div className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="text-xs text-blue-600 mb-1">总角色数</div>
            <div className="text-2xl font-bold text-blue-900">{characters.length}</div>
          </div>
          <div className="flex-1 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="text-xs text-green-600 mb-1">已生成</div>
            <div className="text-2xl font-bold text-green-900">
              {statusCounts.generated}
            </div>
          </div>
          <div className="flex-1 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="text-xs text-purple-600 mb-1">未生成</div>
            <div className="text-2xl font-bold text-purple-900">
              {statusCounts.pending + statusCounts.generating}
            </div>
          </div>
        </div>

        {/* 角色网格 */}
        <div className="grid grid-cols-2 gap-6">
          {characters.map((character, idx) => (
            <CharacterCard
              key={character.uuid || character.character_id}
              character={character}
              isHighlighted={highlightedElement === `character-${character.uuid || character.character_id}`}
              onClick={() => handleOpenDetail(idx)}
            />
          ))}
        </div>
      </div>

      {/* 角色详情对话框 */}
      <CharacterDetailDialog
        isOpen={selectedCharacterIndex !== null}
        onClose={handleCloseDetail}
        character={selectedCharacter}
        characterNumber={selectedCharacterIndex !== null ? selectedCharacterIndex + 1 : 0}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={selectedCharacterIndex !== null && selectedCharacterIndex > 0}
        hasNext={selectedCharacterIndex !== null && selectedCharacterIndex < characters.length - 1}
        onRefresh={() => {
          // 可以在这里触发父组件刷新
        }}
      />
    </>
  );
}

/**
 * 角色卡片组件
 */
function CharacterCard({
  character,
  isHighlighted,
  onClick,
}: {
  character: any;
  isHighlighted: boolean;
  onClick?: () => void;
}) {
  // 兼容不同字段名
  const imageUrl = character.image_url || character.final_image_url;
  const candidateImages = character.candidate_image_urls || [];
  const description = character.description || character.basic_info;
  const status = getGenerationStatus(character);

  return (
    <div
      id={`character-${character.uuid || character.character_id}`}
      onClick={onClick}
      className={`
        bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer
        ${isHighlighted ? 'ring-2 ring-green-500 animate-pulse' : ''}
      `}
    >
      {/* 头部：名称 + 状态 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-semibold text-gray-800">
          {character.name || '未命名角色'}
        </h4>
        <StatusBadge status={status} />
      </div>

      {/* 角色图片 - 16:9 比例 */}
      {imageUrl ? (
        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
          <img
            src={imageUrl}
            alt={character.name}
            className="w-full h-full object-cover"
          />
          {candidateImages.length > 1 && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
              1/{candidateImages.length}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">👤</div>
            <p className="text-xs text-gray-400">
              {status === 'generating' ? '生成中...' : '待生成'}
            </p>
          </div>
        </div>
      )}

      {/* 角色描述 */}
      <div className="space-y-2">
        {description && (
          <div>
            <div className="text-xs text-gray-500 mb-1">描述</div>
            <p className="text-sm text-gray-700 line-clamp-2">
              {description}
            </p>
          </div>
        )}

        {/* 角色外观 */}
        {character.appearance && (
          <div>
            <div className="text-xs text-gray-500 mb-1">外观</div>
            <p className="text-sm text-gray-700 line-clamp-2">
              {character.appearance}
            </p>
          </div>
        )}

        {/* 角色属性标签 */}
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
          {character.tags && character.tags.length > 0 && character.tags.map((tag: string, idx: number) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
              {tag}
            </span>
          ))}
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
                className="relative w-20 h-11 flex-shrink-0 bg-gray-100 rounded overflow-hidden"
              >
                <img
                  src={url}
                  alt={`候选 ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
