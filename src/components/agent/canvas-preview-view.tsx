"use client";

import { useState } from 'react';
import type { ICreation } from '@/types/creation';

interface CanvasPreviewViewProps {
  creation: ICreation;
  highlightedElement: string | null;
}

/**
 * 预览视图组件
 *
 * 展示最终视频预览和下载选项
 */
export function CanvasPreviewView({ creation, highlightedElement }: CanvasPreviewViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoUrl = creation.video_url;
  const coverUrl = creation.extra_data?.cover_url;

  return (
    <div className="space-y-6">
      {/* 视频播放器 */}
      <div
        id="video-preview"
        className={`
          bg-black rounded-xl overflow-hidden shadow-2xl
          ${highlightedElement === 'video-preview' ? 'ring-4 ring-green-500 animate-pulse' : ''}
        `}
      >
        {videoUrl ? (
          <div className="relative aspect-video">
            <video
              src={videoUrl}
              poster={coverUrl}
              controls
              className="w-full h-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">▶️</div>
              <h3 className="text-xl font-bold mb-2">视频生成中...</h3>
              <p className="text-sm text-gray-400">
                所有分镜完成后，系统将自动合成最终视频
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 视频信息 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">标题</div>
          <div className="text-sm font-semibold text-blue-900 truncate">
            {creation.title || '未命名作品'}
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs text-purple-600 mb-1">时长</div>
          <div className="text-sm font-semibold text-purple-900">
            {creation.duration ? `${Math.floor(creation.duration)}s` : '--'}
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-xs text-green-600 mb-1">状态</div>
          <div className="text-sm font-semibold text-green-900">
            {getStatusText(creation.status)}
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="text-xs text-orange-600 mb-1">画质</div>
          <div className="text-sm font-semibold text-orange-900">
            {creation.resolution || '1080p'}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {videoUrl && (
        <div className="flex gap-3">
          <button
            onClick={() => window.open(videoUrl, '_blank')}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#22C55E] to-[#ADD8E6] text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2"
          >
            <span>📥</span>
            <span>下载视频</span>
          </button>
          <button
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <span>📤</span>
            <span>分享作品</span>
          </button>
        </div>
      )}

      {/* 创作详情 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">创作详情</h3>

        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="场景数量" value={`${creation.scenes?.length || 0} 个`} />
          <InfoItem label="角色数量" value={`${creation.characters?.length || 0} 个`} />
          <InfoItem
            label="分镜数量"
            value={`${creation.scenes?.reduce((sum, s) => sum + (s.shots?.length || 0), 0) || 0} 个`}
          />
          <InfoItem
            label="创建时间"
            value={creation.created_at ? new Date(creation.created_at).toLocaleDateString('zh-CN') : '--'}
          />
        </div>

        {creation.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">作品简介</div>
            <p className="text-sm text-gray-700">
              {creation.description}
            </p>
          </div>
        )}
      </div>

      {/* 生成日志（如果有） */}
      {creation.generation_log && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">生成日志</h3>
          <div className="bg-gray-50 rounded p-4 text-xs text-gray-600 font-mono max-h-48 overflow-y-auto">
            {creation.generation_log}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 信息项组件
 */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-800 font-medium">{value}</div>
    </div>
  );
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

  return statusMap[status || ''] || status || '未知';
}
