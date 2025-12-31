'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTimelineStore } from '../../stores/timeline';
import { TimelineTrack, TimelineTrackClip } from '../../types/timeline';
import { useTick } from '../../hooks/use-tick';
import { Plus, Trash2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play, Pause, Square, Film, Music, Type, Scissors, Lock, Edit2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const Timeline: React.FC = () => {
  const t = useTranslations('Timeline');
  const {
    currentTime,
    isPlaying,
    zoom,
    visibleStartTime,
    visibleEndTime,
    selectedClipId,
    selectedTrackId,
    project,
    addTrack,
    removeTrack,
    renameTrack,
    addClip,
    updateClip,
    selectClip,
    selectTrack,
    zoomIn,
    zoomOut,
    scrollTimeline,
    seek,
    trimClip,
    moveClip,
  } = useTimelineStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragTypeRef = useRef<'scroll' | 'moveClip' | 'trimStart' | 'trimEnd' | null>(null);
  const draggedClipIdRef = useRef<string | null>(null);
  const draggedTrackIdRef = useRef<string | null>(null);
  const dragStartTimeRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragOriginalStartRef = useRef(0);
  const dragOriginalDurationRef = useRef(0);
  const dragOriginalSourceStartRef = useRef(0);
  const dragOriginalSourceEndRef = useRef(0);

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTrackId && inputRef.current) {
        inputRef.current.focus();
    }
  }, [editingTrackId]);

  const handleStartRenaming = (track: TimelineTrack) => {
    if (track.isLocked) return;
    setEditingTrackId(track.id);
    setEditingName(track.name);
  };

  const handleFinishRenaming = () => {
    if (editingTrackId) {
        if (editingName.trim()) {
            renameTrack(editingTrackId, editingName.trim());
        }
        setEditingTrackId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleFinishRenaming();
    } else if (e.key === 'Escape') {
        setEditingTrackId(null);
    }
  };

  // 计算时间轴的总宽度（像素）
  const visibleDuration = visibleEndTime - visibleStartTime;
  const timelineWidth = visibleDuration * zoom;

  // 计算当前时间对应的像素位置
  const getPixelPosition = (time: number) => {
    if (time < visibleStartTime) return 0;
    if (time > visibleEndTime) return timelineWidth;
    return (time - visibleStartTime) * zoom;
  };

  // 计算像素位置对应的时间
  const getTimeFromPixel = (pixel: number) => {
    return visibleStartTime + (pixel / zoom);
  };

  // 渲染时间刻度
  const renderTimeRuler = () => {
    const interval = zoom > 50 ? 1 : 5; // 根据缩放级别调整时间刻度间隔
    const ticks: React.ReactNode[] = [];

    const startTick = Math.ceil(visibleStartTime / interval) * interval;
    const endTick = Math.floor(visibleEndTime / interval) * interval;

    for (let time = startTick; time <= endTick; time += interval) {
      const position = getPixelPosition(time);
      ticks.push(
        <div
          key={time}
          className="absolute top-0 h-full border-l border-zinc-800/50 select-none pointer-events-none group"
          style={{ left: `${position}px` }}
        >
          <div className="absolute bottom-0 h-1.5 w-[1px] bg-zinc-600"></div>
          <div className="absolute -top-6 text-[10px] text-zinc-500 w-16 -ml-8 text-center font-mono font-medium tracking-wider group-hover:text-blue-400 transition-colors">
            {formatTime(time)}
          </div>
        </div>
      );
    }

    return (
      <div className="h-8 border-b border-zinc-800 relative bg-zinc-950/80 backdrop-blur-sm select-none">
        {ticks}
        {/* 播放头指示器（三角形） */}
        <div
            className="absolute top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-500 z-20 pointer-events-none filter drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            style={{ left: `${(currentTime - visibleStartTime) * zoom - 6}px` }}
        />
      </div>
    );
  };

  // 格式化时间为 HH:MM:SS:FF (Assuming 30fps for frames)
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    // const f = Math.floor((seconds % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 渲染轨道
  const renderTracks = () => {
    return project.tracks.map((track) => (
      <div
        key={track.id}
        className={`h-24 border-b border-zinc-800/50 relative transition-colors duration-200 ${selectedTrackId === track.id ? 'bg-zinc-900/80' : 'bg-zinc-950/30'} select-none group`}
      >
        {/* 轨道头部 */}
        <div className={`absolute left-0 w-40 h-full border-r border-zinc-800/50 flex flex-col justify-center px-4 bg-zinc-900/90 backdrop-blur-md select-none z-10 transition-colors ${selectedTrackId === track.id ? 'border-r-blue-500/20' : ''}`}>
          
          {/* 轨道类型指示条 */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              track.type === 'video' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 
              track.type === 'audio' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
              'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
          }`} />

          <div className="flex items-center gap-2 mb-1">
             {track.type === 'video' && <Film size={14} className="text-blue-400" />}
             {track.type === 'audio' && <Music size={14} className="text-emerald-400" />}
             {track.type === 'text' && <Type size={14} className="text-orange-400" />}
            
            {editingTrackId === track.id ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRenaming}
                    onKeyDown={handleKeyDown}
                    className="w-[90px] bg-black/50 text-xs text-white border border-blue-500 rounded px-1 py-0.5 outline-none"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <div 
                    className={`font-semibold text-sm truncate max-w-[90px] text-zinc-200 tracking-tight ${!track.isLocked ? 'cursor-text hover:text-white' : ''}`} 
                    title={track.isLocked ? `${getTrackName(track)} (${t('locked')})` : `${track.name} (${t('doubleClickRename')})`}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartRenaming(track);
                    }}
                >
                    {getTrackName(track)}
                </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono bg-zinc-800/50 px-1.5 py-0.5 rounded">
                    {track.type === 'text' ? t('subtitle') : track.type === 'video' ? t('video') : t('audio')}
                </div>
                {track.isLocked && <Lock size={10} className="text-zinc-600" />}
            </div>
            
            {!track.isLocked && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartRenaming(track);
                        }}
                        className="text-zinc-600 hover:text-blue-400 p-1 hover:bg-zinc-800 rounded transition-colors"
                        title={t('rename')}
                    >
                        <Edit2 size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            removeTrack(track.id);
                        }}
                        className="text-zinc-600 hover:text-red-400 p-1 hover:bg-zinc-800 rounded transition-colors"
                        disabled={track.clips.length > 0}
                        title={t('deleteTrack')}
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
          </div>
        </div>

        {/* 轨道内容 */}
        <div
          className="absolute left-40 w-full h-full overflow-hidden"
          onClick={() => selectTrack(track.id)}
        >
            {/* 轨道背景网格/纹理 */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '100px 100%' }}>
            </div>

          <div
            className="h-full relative py-3" // 给上下留一点padding
            style={{ width: `${timelineWidth}px` }}
          >
            {track.clips.map((clip) => renderClip(clip, track.id, track.type))}
          </div>
        </div>
      </div>
    ));
  };

  // 渲染片段
  const renderClip = (clip: TimelineTrackClip, trackId: string, trackType: string) => {
    const clipPosition = getPixelPosition(clip.startInTimeline);
    const clipWidth = clip.duration * zoom;
    const isSelected = selectedClipId === clip.id;

    // 根据类型定义不同的渐变和边框颜色
    const styleClasses = trackType === 'video' 
        ? `bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-blue-500/30 ${isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'hover:border-blue-500/50'}`
        : trackType === 'audio'
        ? `bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-emerald-500/30 ${isSelected ? 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'hover:border-emerald-500/50'}`
        : `bg-gradient-to-r from-orange-900/40 to-amber-900/40 border-orange-500/30 ${isSelected ? 'ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'hover:border-orange-500/50'}`;

    return (
      <div
        key={clip.id}
        className={`absolute h-[calc(100%-8px)] rounded-lg border backdrop-blur-sm cursor-move overflow-hidden select-none transition-all duration-200 group ${styleClasses}`}
        style={{
          left: `${clipPosition}px`,
          width: `${Math.max(clipWidth, 4)}px`, // 最小宽度
          top: '4px',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onClick={(e) => {
          e.stopPropagation();
          selectClip(clip.id);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          isDraggingRef.current = true;
          dragTypeRef.current = 'moveClip';
          draggedClipIdRef.current = clip.id;
          draggedTrackIdRef.current = trackId;
          dragStartXRef.current = e.clientX;
          dragOriginalStartRef.current = clip.startInTimeline;
        }}
      >
        {/* 片段内容 */}
        <div className="h-full px-2 py-1.5 flex flex-col justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 min-w-0">
            {trackType === 'video' && <Film size={12} className="text-blue-300/70 shrink-0" />}
            {trackType === 'audio' && <Music size={12} className="text-emerald-300/70 shrink-0" />}
            {trackType === 'text' && <Type size={12} className="text-orange-300/70 shrink-0" />}
            
            <span className="text-[11px] font-medium truncate text-zinc-100/90 tracking-wide">
                {trackType === 'text' ? (clip.text || t('untitledSubtitle')) : `${t('clip')} ${clip.id.split('-').pop()}`}
            </span>
          </div>
          
          <div className="flex justify-between items-end">
             <span className="text-[10px] text-zinc-400/60 truncate max-w-[70%]">
                {trackType === 'text' ? '' : clip.url.split('/').pop()}
             </span>
             <span className="text-[10px] font-mono text-zinc-300/60 bg-black/20 px-1 rounded">
                {clip.duration.toFixed(1)}s
             </span>
          </div>
        </div>

        {/* 左右拖拽手柄 - 仅Hover显示 */}
        <div
          className="absolute left-0 top-0 h-full w-4 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center bg-gradient-to-r from-black/20 to-transparent transition-opacity"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            isDraggingRef.current = true;
            dragTypeRef.current = 'trimStart';
            draggedClipIdRef.current = clip.id;
            draggedTrackIdRef.current = trackId;
            dragStartXRef.current = e.clientX;
            dragOriginalStartRef.current = clip.startInTimeline;
            dragOriginalDurationRef.current = clip.duration;
            dragOriginalSourceStartRef.current = clip.sourceStart;
            dragOriginalSourceEndRef.current = clip.sourceEnd;
          }}
        >
            <div className="w-[2px] h-4 bg-white/20 rounded-full"></div>
        </div>
        <div
          className="absolute right-0 top-0 h-full w-4 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center bg-gradient-to-l from-black/20 to-transparent transition-opacity"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            isDraggingRef.current = true;
            dragTypeRef.current = 'trimEnd';
            draggedClipIdRef.current = clip.id;
            draggedTrackIdRef.current = trackId;
            dragStartXRef.current = e.clientX;
            dragOriginalStartRef.current = clip.startInTimeline;
            dragOriginalDurationRef.current = clip.duration;
            dragOriginalSourceStartRef.current = clip.sourceStart;
            dragOriginalSourceEndRef.current = clip.sourceEnd;
          }}
        >
             <div className="w-[2px] h-4 bg-white/20 rounded-full"></div>
        </div>
      </div>
    );
  };

  // 处理鼠标拖拽移动时间轴和片段
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.target === timelineRef.current || e.target === timelineRef.current?.firstChild) {
        e.preventDefault(); // 防止默认行为
        isDraggingRef.current = true;
        dragTypeRef.current = 'scroll';
        dragStartXRef.current = e.clientX;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - dragStartXRef.current;
      const timeDelta = deltaX / zoom;

      if (dragTypeRef.current === 'scroll') {
        scrollTimeline(-timeDelta);
        dragStartXRef.current = e.clientX;
      } 
      else if (dragTypeRef.current === 'moveClip') {
        if (draggedClipIdRef.current && draggedTrackIdRef.current) {
          const newStartTime = Math.max(0, dragOriginalStartRef.current + timeDelta);
          moveClip(draggedClipIdRef.current, draggedTrackIdRef.current, newStartTime);
        }
      } 
      else if (dragTypeRef.current === 'trimStart') {
        if (draggedClipIdRef.current && draggedTrackIdRef.current) {
          // 向右拖动 deltaX > 0 -> timeDelta > 0 -> duration 减少 -> start 增加
          // 限制：duration 不能小于 0.1s
          const maxDelta = dragOriginalDurationRef.current - 0.1;
          const actualTimeDelta = Math.min(Math.max(timeDelta, -dragOriginalSourceStartRef.current), maxDelta);
          
          const newSourceStart = dragOriginalSourceStartRef.current + actualTimeDelta;
          const newDuration = dragOriginalDurationRef.current - actualTimeDelta;
          const newStartTime = dragOriginalStartRef.current + actualTimeDelta;

          trimClip(draggedClipIdRef.current, newSourceStart, dragOriginalSourceEndRef.current);
          moveClip(draggedClipIdRef.current, draggedTrackIdRef.current, newStartTime);
        }
      }
      else if (dragTypeRef.current === 'trimEnd') {
        if (draggedClipIdRef.current && draggedTrackIdRef.current) {
          // 向右拖动 deltaX > 0 -> timeDelta > 0 -> duration 增加 -> end 增加
          // 限制：duration 不能小于 0.1s
          const minDuration = 0.1;
          const newDuration = Math.max(minDuration, dragOriginalDurationRef.current + timeDelta);
          const newSourceEnd = dragOriginalSourceStartRef.current + newDuration;

          trimClip(draggedClipIdRef.current, dragOriginalSourceStartRef.current, newSourceEnd);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      dragTypeRef.current = null;
      draggedClipIdRef.current = null;
      draggedTrackIdRef.current = null;
    };

    const handleClick = (e: MouseEvent) => {
      // 只有在没有发生拖动的情况下才处理点击 seek
      const target = e.target as HTMLElement;
      
      // 检查是否点击了点击区域或者时间轴容器
      if (target.closest('.timeline-click-area') || target === timelineRef.current || target === timelineRef.current?.firstChild) {
        // 如果是点击了轨道内容区域但不是具体的片段
        // 或者是点击了标尺、专门的点击轨道
        
        // 修正：我们需要获取点击位置相对于 timeline-content 的偏移
        const rect = timelineRef.current?.getBoundingClientRect();
        if (rect) {
            const scrollLeft = timelineRef.current?.scrollLeft || 0;
            // 160px 是轨道头部的宽度
            const clickX = e.clientX - rect.left + scrollLeft - 160;
            
            if (clickX >= 0) {
                const clickTime = getTimeFromPixel(clickX);
                seek(Math.max(0, clickTime));
            }
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick);
    };
  }, [zoom, visibleStartTime, visibleEndTime, scrollTimeline, seek, moveClip, trimClip]);

  // 使用播放头逻辑Hook
  const { visibleClips } = useTick();

  const getTrackName = (track: TimelineTrack) => {
      if (track.isLocked) {
          switch (track.type) {
              case 'video': return t('videoTrack'); // Or 'video' depending on preference, but 'videoTrack' seems safer for "Video Track"
              case 'audio': return t('audioTrack');
              case 'text': return t('subtitleTrack');
              default: return track.name;
          }
      }
      return track.name;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#09090b] select-none">
      {/* 控制栏 */}
      <div className="h-12 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-4">
          {/* 播放控制按钮 */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button onClick={() => useTimelineStore.getState().stop()} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <Square size={14} fill="currentColor" />
            </button>
            <button onClick={() => useTimelineStore.getState().play()} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <Play size={14} fill="currentColor" />
            </button>
            <button onClick={() => useTimelineStore.getState().pause()} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <Pause size={14} fill="currentColor" />
            </button>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800 mx-2"></div>

          <div className="flex gap-2">
            <button
                onClick={() => addTrack('video', `${t('videoTrack')} ${project.tracks.filter(t => t.type === 'video').length + 1}`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md hover:bg-blue-500/20 hover:border-blue-500/30 transition-all text-xs font-medium group"
            >
                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                <span>{t('video')}</span>
            </button>
            <button
                onClick={() => addTrack('audio', `${t('audioTrack')} ${project.tracks.filter(t => t.type === 'audio').length + 1}`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all text-xs font-medium group"
            >
                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                <span>{t('audio')}</span>
            </button>
            <button
                onClick={() => addTrack('text', `${t('subtitleTrack')} ${project.tracks.filter(t => t.type === 'text').length + 1}`)}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md hover:bg-orange-500/20 hover:border-orange-500/30 transition-all text-xs font-medium group"
            >
                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                <span>{t('subtitle')}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                <button onClick={() => scrollTimeline(-5)} className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors">
                    <ChevronLeft size={14} />
                </button>
                <button onClick={() => scrollTimeline(5)} className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors">
                    <ChevronRight size={14} />
                </button>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={zoomOut} className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors">
                    <ZoomOut size={16} />
                </button>
                <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/50" style={{ width: `${Math.min(100, Math.max(0, (zoom / 200) * 100))}%` }}></div>
                </div>
                <button onClick={zoomIn} className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors">
                    <ZoomIn size={16} />
                </button>
            </div>

            <div className="font-mono text-sm font-medium tracking-wider text-zinc-300 bg-black/40 px-3 py-1 rounded border border-zinc-800/50">
                {formatTime(currentTime)}
            </div>
        </div>
      </div>

      {/* 时间轴 */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-auto relative select-none custom-scrollbar bg-[#09090b]"
      >
        <div className="w-full">
          {/* 时间标尺与点击交互区 */}
          <div 
            className="h-8 border-b border-zinc-800/50 relative sticky top-0 z-30 timeline-click-area cursor-pointer group"
          >
            <div className="absolute left-40 w-full h-full overflow-hidden bg-zinc-950/90 backdrop-blur">
              {renderTimeRuler()}
            </div>
            
            {/* 播放头线 - 贯穿整个时间轴 */}
            <div
                className="absolute top-8 bottom-0 w-[1px] bg-blue-500 z-40 pointer-events-none shadow-[0_0_4px_rgba(59,130,246,0.5)] h-[calc(100vh)]"
                style={{ left: `${160 + getPixelPosition(currentTime)}px` }}
            />

            {/* Hover时显示的幽灵指针 */}
            <div className="absolute top-0 bottom-0 w-[1px] bg-white/20 z-20 pointer-events-none h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                 style={{ left: 'var(--mouse-x, 0px)' }} />
          </div>

          {/* 专门的点击交互轨道 - 位于标尺下方，轨道上方 */}
          <div className="h-4 w-full bg-zinc-900/30 border-b border-zinc-800/30 relative z-20 timeline-click-area cursor-pointer hover:bg-zinc-800/50 transition-colors">
             <div className="absolute left-40 text-[10px] text-zinc-600 px-2 h-full flex items-center select-none pointer-events-none">
                {t('jumpPlayhead')}
             </div>
          </div>

          {/* 轨道 */}
          <div className="w-full relative min-h-full pb-20">
            {renderTracks()}
          </div>
        </div>
      </div>
    </div>
  );
};
