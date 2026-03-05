"use client";

import { useEffect, useState } from 'react';
import type { ICreation } from '@/types/creation';
import { getAllCharactersFromShots } from './canvas-character-view';
import creationApi from '@/lib/api/creation';

interface CanvasScriptViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

/**
 * 剧本视图组件
 *
 * 展示剧本内容、场景列表、角色对白
 */
export function CanvasScriptView({ creation, highlightedElement }: CanvasScriptViewProps) {
  // 章节内容状态
  const [chapterContent, setChapterContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取章节内容（chat 类型不需要）
  useEffect(() => {
    const fetchChapterContent = async () => {
      // chat 类型没有关联章节，跳过获取
      if (!creation.uuid || creation.creation_type === "chat") return;
      setLoading(true);
      try {
        const response = await creationApi.getChapterContent(creation.uuid);
        if (response.data?.content) {
          setChapterContent(response.data.content);
        }
      } catch (error) {
        console.error('获取章节内容失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChapterContent();
  }, [creation.uuid, creation.creation_type]);

  // 优先级：chapterContent > script > script_text > prompt（Agent模式用script_text存储）
  const script = chapterContent || creation.extra_data?.script || creation.extra_data?.script_text || creation.extra_data?.prompt;
  // 优先使用 creation.characters，如果没有再从分镜提取
  const allCharacters = (creation.characters && creation.characters.length > 0)
    ? creation.characters
    : getAllCharactersFromShots(creation);

  return (
    <div className="space-y-6">
      {/* 剧本元信息 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">剧本标题</div>
          <div className="text-sm font-semibold text-blue-900">
            {creation.title || '未命名剧本'}
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 mb-1">场景数量</div>
          <div className="text-sm font-semibold text-purple-900">
            {creation.scenes?.length || 0} 个场景
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-xs text-green-600 mb-1">角色数量</div>
          <div className="text-sm font-semibold text-green-900">
            {allCharacters.length} 个角色
          </div>
        </div>
      </div>

      {/* 剧本内容 */}
      <div
        id="script-content"
        className={`
          bg-white rounded-lg p-6 border border-gray-200 shadow-sm
          ${highlightedElement === 'script-content' ? 'ring-2 ring-green-500 animate-pulse' : ''}
        `}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>📜</span>
          <span>剧本内容</span>
        </h3>

        {script ? (
          <div className="prose prose-sm max-w-none">
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {script}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📝</div>
            <p>暂无剧本内容</p>
            <p className="text-xs mt-1">请在对话中上传或描述剧本</p>
          </div>
        )}
      </div>

      {/* 场景列表（简略） */}
      {creation.scenes && creation.scenes.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🎬</span>
            <span>场景列表</span>
          </h3>
          <div className="space-y-2">
            {creation.scenes.slice(0, 5).map((scene, idx) => (
              <div
                key={scene.scene_id}
                id={`scene-${scene.scene_id}`}
                className={`
                  p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors
                  ${highlightedElement === `scene-${scene.scene_id}` ? 'ring-2 ring-green-500 animate-pulse' : ''}
                `}
              >
                <div className="text-xs text-gray-500">场景 {idx + 1}</div>
                <div className="text-sm text-gray-700 line-clamp-2">
                  {scene.title || `场景 ${idx + 1}`}
                </div>
              </div>
            ))}
            {creation.scenes.length > 5 && (
              <div className="text-xs text-gray-400 text-center py-2">
                还有 {creation.scenes.length - 5} 个场景...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
