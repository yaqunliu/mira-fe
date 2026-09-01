'use client'
import { useTranslations } from 'next-intl';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useTimelineStore } from '@/stores/timeline';
import { Film, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { TimelineTrackClip } from '@/types/timeline';

interface PlayerItemProps {
  clip: TimelineTrackClip;
  isPlaying: boolean;
  isVisible: boolean;
  isMuted: boolean;
  onReady: (clipId: string) => void;
  setPlayer: (clipId: string, player: any) => void;
  onError?: (e: any) => void;
}

const PlayerItem = React.memo(({ clip, isPlaying, isVisible, isMuted, onReady, setPlayer, onError }: PlayerItemProps) => {
  const isAudio = clip.url.match(/\.(mp3|wav|ogg|m4a)$/i);
  
  // 提取计算逻辑到组件内部
  const getClipPos = useCallback((time: number) => {
    return clip.sourceStart + (time - clip.startInTimeline);
  }, [clip.sourceStart, clip.startInTimeline]);

  const handleRef = useCallback((el: HTMLMediaElement | null) => {
    if (el) {
      const playerWrapper = {
        getInternalPlayer: () => el,
        getCurrentTime: () => el.currentTime,
        seekTo: (amount: number) => {
          if (Math.abs(el.currentTime - amount) > 0.05) {
            el.currentTime = amount;
          }
        }
      };
      setPlayer(clip.id, playerWrapper);
    }
  }, [clip.id, setPlayer]);

  useEffect(() => {
    const el = document.querySelector(`[data-media-id="${clip.id}"]`) as HTMLMediaElement;
    if (el) {
      // 设置音量
      el.volume = clip.volume ?? 1;
      
      if (isPlaying && isVisible) {
        const targetPos = getClipPos(useTimelineStore.getState().currentTime);
        if (Math.abs(el.currentTime - targetPos) > 0.1) {
          el.currentTime = targetPos;
        }
        el.play().catch(e => console.error(`[PlayerItem] Play failed for ${clip.id}:`, e));
      } else {
        el.pause();
      }
    }
  }, [isPlaying, isVisible, clip.id, getClipPos]);

  if (isAudio) {
    return (
      <audio
        data-media-id={clip.id}
        ref={handleRef}
        src={clip.url}
        muted={isMuted || clip.isMuted}
        onCanPlay={() => {
          onReady(clip.id);
        }}
        onError={(e) => {
          onError?.(e);
        }}
        preload="auto"
      />
    );
  }

  return (
    <video
      data-media-id={clip.id}
      ref={handleRef}
      src={clip.url}
      className="w-full h-full object-contain"
      muted={true} // 视频轨道强制静音，只保留画面
      playsInline
      onCanPlay={() => {
        onReady(clip.id);
      }}
      onError={(e) => {
        onError?.(e);
      }}
      preload="auto"
    />
  );
}, (prev, next) => {
  return (
    prev.clip.id === next.clip.id &&
    prev.clip.url === next.clip.url &&
    prev.isPlaying === next.isPlaying &&
    prev.isVisible === next.isVisible &&
    prev.isMuted === next.isMuted &&
    prev.clip.volume === next.clip.volume &&
    prev.clip.isMuted === next.clip.isMuted
  );
});

export const VideoPreview: React.FC = () => {
  const t = useTranslations('common');
  const currentTime = useTimelineStore(state => state.currentTime);
  const isPlaying = useTimelineStore(state => state.isPlaying);
  const project = useTimelineStore(state => state.project);
  
  // 计算当前可见和预加载片段
  const { visibleClips, preloadingClips } = useMemo(() => {
    const visible: TimelineTrackClip[] = [];
    const preloading: TimelineTrackClip[] = [];
    const time = Math.round(currentTime * 100) / 100;
    const preloadWindow = 5; // 预加载未来5秒的片段
    
    project.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const isVisible = time >= clip.startInTimeline && time < clip.startInTimeline + clip.duration;
        const isUpcoming = !isVisible && clip.startInTimeline > time && clip.startInTimeline <= time + preloadWindow;
        
        if (isVisible) {
          visible.push(clip);
        } else if (isUpcoming) {
          preloading.push(clip);
        }
      });
    });
    return { visibleClips: visible, preloadingClips: preloading };
  }, [currentTime, project.tracks]);

  // 合并所有需要渲染的片段
  const allRenderedClips = useMemo(() => {
    // 使用 Map 以 clip.id 为键进行去重，确保 visible 优先
    const map = new Map<string, { clip: TimelineTrackClip, isVisible: boolean }>();
    preloadingClips.forEach(clip => map.set(clip.id, { clip, isVisible: false }));
    visibleClips.forEach(clip => map.set(clip.id, { clip, isVisible: true }));
    return Array.from(map.values());
  }, [visibleClips, preloadingClips]);

  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const playerRefs = useRef<Record<string, any>>({});
  const lastSeekTimeRef = useRef<Record<string, number>>({});
  
  // 使用 Ref 追踪最新的 currentTime，避免 handlePlayerReady 因依赖 currentTime 而频繁重建导致的闭包失效
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  // 计算片段内的播放位置
  const getClipPlaybackPosition = useCallback((time: number, clip: TimelineTrackClip) => {
    const offset = time - clip.startInTimeline;
    return clip.sourceStart + offset;
  }, []);

  const handleSetPlayer = useCallback((clipId: string, player: any) => {
    if (player) {
      playerRefs.current[clipId] = player;
    }
  }, []);

  const handlePlayerReady = useCallback((clipId: string) => {
    setIsReady(prev => ({ ...prev, [clipId]: true }));
    const player = playerRefs.current[clipId];
    if (player) {
      // 查找对应的 clip
      const clip = project.tracks
        .flatMap(t => t.clips)
        .find(c => c.id === clipId);
      
      if (clip) {
        player.seekTo(getClipPlaybackPosition(currentTimeRef.current, clip), 'seconds');
      }
    }
  }, [project.tracks, getClipPlaybackPosition]);

  const handlePlayerError = useCallback((clipId: string, e: any) => {
    console.error(`Player error for clip ${clipId}:`, e);
    setErrors(prev => ({ ...prev, [clipId]: String(e) }));
  }, []);

  // 分离视频、音频和字幕片段
  const videoRenderItems = useMemo(() => {
    return allRenderedClips.filter(({ clip }) => clip.url && !clip.url.match(/\.(mp3|wav|ogg|m4a)$/i));
  }, [allRenderedClips]);

  const audioRenderItems = useMemo(() => {
    return allRenderedClips.filter(({ clip }) => clip.url && clip.url.match(/\.(mp3|wav|ogg|m4a)$/i));
  }, [allRenderedClips]);

  const subtitleRenderItems = useMemo(() => {
    return allRenderedClips.filter(({ clip }) => clip.text && !clip.url);
  }, [allRenderedClips]);

  // 同步播放器进度
  useEffect(() => {
    // 只有在非播放状态（如拖动进度条）才强制同步预览画面
    if (isPlaying) return;

    allRenderedClips.forEach(({ clip, isVisible }) => {
      const player = playerRefs.current[clip.id];
      if (player && typeof player.getCurrentTime === 'function') {
        // 如果是可见片段，根据当前时间计算位置
        // 如果是预加载片段，定位到开头 (sourceStart)
        const targetPos = isVisible 
          ? getClipPlaybackPosition(currentTime, clip)
          : clip.sourceStart;
          
        const currentPos = player.getCurrentTime();
        const drift = Math.abs(currentPos - targetPos);
        
        // 暂停状态下，只要有微小偏差就同步，确保预览精准
        if (drift > 0.03) {
          const now = Date.now();
          if (now - (lastSeekTimeRef.current[clip.id] || 0) > 40) {
            player.seekTo(targetPos);
            lastSeekTimeRef.current[clip.id] = now;
          }
        }
      }
    });
  }, [currentTime, isPlaying, allRenderedClips, getClipPlaybackPosition]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden group">
      {/* 时间和状态指示器 (仅在播放或有错误时显示) */}
      <div className="absolute top-4 left-4 z-50 pointer-events-none flex flex-col gap-2">
        <div className="bg-gradient-to-br from-gray-900/80 to-slate-900/80 backdrop-blur-lg px-3 py-1.5 rounded-full border border-gray-800/50 shadow-xl shadow-indigo-950/20 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-gradient-to-r from-green-500 to-teal-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-gray-600'}`} />
          <span className="text-xs font-mono text-gray-200 tracking-widest">{formatTime(currentTime)} / {formatTime(project.duration)}</span>
          <span className="text-[10px] text-gray-400 border-l border-gray-700/50 pl-2 ml-1">
            {visibleClips.length} {t('clip')}
          </span>
        </div>
        
        {Object.keys(errors).map(clipId => (
          <div key={clipId} className="bg-gradient-to-br from-red-500/90 to-rose-500/90 backdrop-blur-lg px-3 py-1.5 rounded-xl border border-red-500/50 shadow-xl shadow-red-500/20 text-[10px] text-white max-w-[200px] truncate">
            {t("errorPrefix")} {clipId}
          </div>
        ))}
      </div>

      {/* 背景层 - 确保显示主题色渐变 */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-50 to-gray-100" />
      
      {/* 视频层 */}
      <div className="absolute inset-0 z-10">
        {videoRenderItems.length > 0 ? (
          videoRenderItems.map(({ clip, isVisible }) => (
            <div 
              key={clip.id} 
              className={`absolute inset-0 flex items-center justify-center ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              style={{ zIndex: clip.layer || 1 }}
            >
              {/* 添加视频背景容器，确保视频外区域显示主题色 */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <PlayerItem 
                  clip={clip}
                  isPlaying={isPlaying}
                  isVisible={isVisible}
                  isMuted={isMuted}
                  setPlayer={handleSetPlayer}
                  onReady={handlePlayerReady}
                  onError={(e) => handlePlayerError(clip.id, e)}
                />
              </div>
              {isVisible && !isReady[clip.id] && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-slate-900/80 backdrop-blur-lg">
                  <Loader2 className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent animate-spin shadow-lg shadow-green-500/30" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-3">
            <div className="p-6 bg-gradient-to-br from-gray-900/90 to-slate-900/90 rounded-full border border-gray-800/50 shadow-xl shadow-indigo-950/20">
              <Film size={48} strokeWidth={1.5} className="text-gray-500" />
            </div>
            <p className="text-sm font-medium tracking-wide text-gray-400">{t("noVisibleAssets")}</p>
          </div>
        )}
      </div>

      {/* 字幕层 */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-end justify-center pb-12 pointer-events-none">
        {subtitleRenderItems
          .filter(({ isVisible }) => isVisible)
          .map(({ clip }) => (
            <div
              key={clip.id}
              className="px-6 py-4 bg-gradient-to-br from-gray-900/90 to-slate-900/90 backdrop-blur-lg rounded-xl max-w-[85%] text-center border border-gray-800/50 shadow-2xl shadow-indigo-950/20"
              style={{ zIndex: clip.layer || 100 }}
            >
              <p className="text-gray-200 text-lg leading-relaxed font-medium whitespace-pre-wrap break-words">
                {clip.text}
              </p>
            </div>
          ))}
      </div>

      {/* 音频层 (透明但占据微小空间以确保浏览器加载) */}
      <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden" aria-hidden="true" style={{ left: -100, top: -100 }}>
        {audioRenderItems.map(({ clip, isVisible }) => (
          <PlayerItem
            key={clip.id}
            clip={clip}
            isPlaying={isPlaying}
            isVisible={isVisible}
            isMuted={isMuted}
            setPlayer={handleSetPlayer}
            onReady={handlePlayerReady}
            onError={(e) => handlePlayerError(clip.id, e)}
          />
        ))}
      </div>

      {/* 预览控制遮罩 */}
      <div className="absolute bottom-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-gradient-to-br from-gray-900/90 to-slate-900/90 hover:bg-gradient-to-br from-gray-800/90 to-slate-800/90 text-gray-300 hover:text-white rounded-full backdrop-blur-lg border border-gray-800/50 shadow-xl shadow-indigo-950/20 transition-all active:scale-95"
          title={isMuted ? t('unmute') : t('mute')}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* 播放状态指示器 */}
      {!isPlaying && videoRenderItems.some(item => item.isVisible) && (
        <div className="absolute inset-0 z-20 bg-gradient-to-br from-black/20 to-transparent flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-900/80 to-slate-900/80 rounded-full flex items-center justify-center backdrop-blur-lg border border-gray-800/50 shadow-2xl shadow-indigo-950/30">
            <div className="w-0 h-0 border-l-[18px] border-l-gray-300 hover:border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1 transition-colors" />
          </div>
        </div>
      )}
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
