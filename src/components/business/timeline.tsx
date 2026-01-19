'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useTimelineStore } from '../../stores/timeline';
import { TimelineTrack, TimelineTrackClip } from '../../types/timeline';
import { useTick } from '../../hooks/use-tick';
import { Plus, Trash2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play, Pause, Film, Music, Type, Lock, Edit2, RotateCcw, Undo, Redo, Volume2, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { findSnapPoint, checkOverlap, findNonOverlappingPosition } from '@/lib/timeline-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export const Timeline: React.FC = () => {
  const t = useTranslations('Timeline');
  const currentTime = useTimelineStore(state => state.currentTime);
  const isPlaying = useTimelineStore(state => state.isPlaying);
  const zoom = useTimelineStore(state => state.zoom);
  const visibleStartTime = useTimelineStore(state => state.visibleStartTime);
  const visibleEndTime = useTimelineStore(state => state.visibleEndTime);
  const selectedClipId = useTimelineStore(state => state.selectedClipId);
  const selectedClipIds = useTimelineStore(state => state.selectedClipIds);
  const selectedTrackId = useTimelineStore(state => state.selectedTrackId);
  const project = useTimelineStore(state => state.project);

  const addTrack = useTimelineStore(state => state.addTrack);
  const removeTrack = useTimelineStore(state => state.removeTrack);
  const renameTrack = useTimelineStore(state => state.renameTrack);
  const reorderTracks = useTimelineStore(state => state.reorderTracks);
  const addClip = useTimelineStore(state => state.addClip);
  const updateClip = useTimelineStore(state => state.updateClip);
  const selectClip = useTimelineStore(state => state.selectClip);
  const selectTrack = useTimelineStore(state => state.selectTrack);
  const toggleClipSelection = useTimelineStore(state => state.toggleClipSelection);
  const clearSelection = useTimelineStore(state => state.clearSelection);
  const selectAllClips = useTimelineStore(state => state.selectAllClips);
  const moveSelectedClips = useTimelineStore(state => state.moveSelectedClips);
  const deleteSelectedClips = useTimelineStore(state => state.deleteSelectedClips);
  const batchMoveClips = useTimelineStore(state => state.batchMoveClips);
  const zoomIn = useTimelineStore(state => state.zoomIn);
  const zoomOut = useTimelineStore(state => state.zoomOut);
  const scrollTimeline = useTimelineStore(state => state.scrollTimeline);
  const seek = useTimelineStore(state => state.seek);
  const trimClip = useTimelineStore(state => state.trimClip);
  const copySelectedClips = useTimelineStore(state => state.copySelectedClips);
  const pasteClips = useTimelineStore(state => state.pasteClips);
  const moveClip = useTimelineStore(state => state.moveClip);
  const removeClip = useTimelineStore(state => state.removeClip);
  const saveHistory = useTimelineStore(state => state.saveHistory);
  const undo = useTimelineStore(state => state.undo);
  const redo = useTimelineStore(state => state.redo);
  const canUndo = useTimelineStore(state => state.past.length > 0);
  const canRedo = useTimelineStore(state => state.future.length > 0);

  // 使用播放循环Hook
  useTick();

  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragTypeRef = useRef<'scroll' | 'moveClip' | 'trimStart' | 'trimEnd' | 'playhead' | null>(null);
  const draggedClipIdRef = useRef<string | null>(null);
  const draggedTrackIdRef = useRef<string | null>(null);
  const dragStartTimeRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragOriginalStartRef = useRef(0);
  const dragOriginalDurationRef = useRef(0);
  const dragOriginalSourceStartRef = useRef(0);
  const dragOriginalSourceEndRef = useRef(0);
  // 保存多选时所有clips的原始位置
  const dragOriginalClipsPositionsRef = useRef<Map<string, { trackId: string; startTime: number }>>(new Map());
  // 保存播放头拖动时的吸附时间
  const playheadDragSnappedTimeRef = useRef<number | null>(null);
  // 标记是否刚刚完成拖动（用于忽略拖动后的 click 事件）
  const justDraggedRef = useRef(false);

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 拖拽高亮状态
  const [dragHoverTrackId, setDragHoverTrackId] = useState<string | null>(null);
  const [draggingAssetType, setDraggingAssetType] = useState<string | null>(null);

  // 轨道拖拽排序状态
  const [draggingTrackIndex, setDraggingTrackIndex] = useState<number | null>(null);
  const [dragOverTrackIndex, setDragOverTrackIndex] = useState<number | null>(null);

  // 编辑模态框状态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddSubtitleModalOpen, setIsAddSubtitleModalOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [newSubtitleText, setNewSubtitleText] = useState('');
  const [newSubtitleDuration, setNewSubtitleDuration] = useState('2');
  const [editingClip, setEditingClip] = useState<TimelineTrackClip | null>(null);
  const [editingTrackType, setEditingTrackType] = useState<'audio' | 'text' | null>(null);
  const [editVolume, setEditVolume] = useState(100);
  const [editText, setEditText] = useState('');

  // 吸附配置
  const SNAP_THRESHOLD = 15 / zoom; // 15像素的吸附距离
  const [snapIndicator, setSnapIndicator] = useState<number | null>(null); // 显示吸附指示线

  // 检查素材类型是否与轨道兼容
  const isAssetCompatibleWithTrack = (assetType: string, trackType: string): boolean => {
    if (assetType === 'audio' && trackType === 'audio') return true;
    if (assetType === 'video' && trackType === 'video') return true;
    if (assetType === 'image' && trackType === 'video') return true;
    return false;
  };

  useEffect(() => {
    if (editingTrackId && inputRef.current) {
        inputRef.current.focus();
    }
  }, [editingTrackId]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只有在鼠标处于时间轴区域内，且没有打开编辑弹窗，且不在输入状态时才触发
      if (!isHovering || editingTrackId || isEditModalOpen || isAddSubtitleModalOpen) return;

      // 如果用户正在输入（如在其他页面的输入框），不处理快捷键
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + A: 全选
      if (ctrlOrCmd && e.key === 'a') {
        e.preventDefault();
        selectAllClips();
        return;
      }

      // Ctrl/Cmd + C: 复制
      if (ctrlOrCmd && e.key === 'c') {
        e.preventDefault();
        copySelectedClips();
        toast.success(t('copied'));
        return;
      }

      // Ctrl/Cmd + V: 粘贴
      if (ctrlOrCmd && e.key === 'v') {
        e.preventDefault();
        pasteClips();
        toast.success(t('pasted'));
        return;
      }

      // Delete/Backspace: 删除选中的片段
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipIds.length > 0) {
        e.preventDefault();
        deleteSelectedClips();
        toast.success(t('deletedClips', { count: selectedClipIds.length }));
        return;
      }

      // Escape: 清除选择
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        return;
      }

      // 方向键: 移动选中的片段
      if (selectedClipIds.length > 0 && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const shiftAmount = e.shiftKey ? 1 : 0.1; // Shift 键按住时移动 1 秒，否则 0.1 秒
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        moveSelectedClips(direction * shiftAmount);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHovering, editingTrackId, isEditModalOpen, isAddSubtitleModalOpen, selectedClipIds, selectAllClips, deleteSelectedClips, clearSelection, moveSelectedClips, copySelectedClips, pasteClips, t]);

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

  // 打开编辑模态框
  const handleOpenEditModal = (clip: TimelineTrackClip, trackType: 'audio' | 'text') => {
    setEditingClip(clip);
    setEditingTrackType(trackType);

    if (trackType === 'audio') {
      setEditVolume(Math.round((clip.volume ?? 1) * 100));
    } else if (trackType === 'text') {
      setEditText(clip.text || '');
    }

    setIsEditModalOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingClip) return;

    if (editingTrackType === 'audio') {
      updateClip(editingClip.id, { volume: editVolume / 100 });
      toast.success(t('volumeUpdated'));
    } else if (editingTrackType === 'text') {
      updateClip(editingClip.id, { text: editText });
      toast.success(t('textUpdated'));
    }

    setIsEditModalOpen(false);
    setEditingClip(null);
    setEditingTrackType(null);
  };

  // 关闭编辑模态框
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingClip(null);
    setEditingTrackType(null);
  };

  // 处理新增文案
  const handleAddSubtitle = () => {
    if (!newSubtitleText.trim()) {
      toast.error('请输入文案内容');
      return;
    }

    const duration = parseFloat(newSubtitleDuration);
    if (isNaN(duration) || duration <= 0) {
      toast.error('请输入有效的时长');
      return;
    }

    // 寻找第一个文字轨道
    const textTrack = project.tracks.find(t => t.type === 'text');
    if (!textTrack) {
      toast.error('未找到文字轨道');
      return;
    }

    addClip(textTrack.id, {
      url: '',
      text: newSubtitleText.trim(),
      startInTimeline: currentTime,
      duration: duration,
      sourceStart: 0,
      sourceEnd: duration,
      layer: textTrack.clips.length + 1,
      volume: 1,
    });

    toast.success('已添加文案到轨道');
    setIsAddSubtitleModalOpen(false);
    setNewSubtitleText('');
    setNewSubtitleDuration('2');
  };

  // 一键添加分镜所有素材到轨道
  const addShotAssetsToTracks = (shot: any) => {
    let addedCount = 0;

    // 计算时长
    const durationInSeconds = shot.video_duration || 5;

    // 使用当前播放头位置作为起始时间
    const startTime = currentTime;

    // 1. 添加视频到第一个视频轨道
    if (shot.video_url) {
      const videoTrack = project.tracks.find(t => t.type === 'video');
      if (videoTrack) {
        addClip(videoTrack.id, {
          url: shot.video_url,
          startInTimeline: startTime,
          duration: durationInSeconds,
          sourceStart: 0,
          sourceEnd: durationInSeconds,
          layer: videoTrack.clips.length + 1,
          volume: 0,
        });
        addedCount++;
      }
    }

    // 2. 添加音频到第一个音频轨道
    if (shot.audio_url) {
      const audioTrack = project.tracks.find(t => t.type === 'audio');
      if (audioTrack) {
        addClip(audioTrack.id, {
          url: shot.audio_url,
          startInTimeline: startTime,
          duration: durationInSeconds,
          sourceStart: 0,
          sourceEnd: durationInSeconds,
          layer: audioTrack.clips.length + 1,
          volume: 1,
        });
        addedCount++;
      }
    }

    // 3. 添加字幕到第一个文字轨道
    if (shot.narration && shot.narration.length > 0) {
      const textTrack = project.tracks.find(t => t.type === 'text');
      if (textTrack) {
        // 只保留内容，不显示发言人
        const subtitleText = shot.narration
          .map((item: any) => item.内容 || item.content || '')
          .filter((text: string) => text.trim())
          .join('\n');

        // 根据文本长度估算时长（原本按 3.5 字/秒计算，现缩短 1/3，按约 5.2 字/秒计算）
        const textLength = subtitleText.length;
        const estimatedDuration = Math.max(1.5, textLength / 5.2);

        addClip(textTrack.id, {
          url: '',
          text: subtitleText,
          startInTimeline: startTime,
          duration: estimatedDuration,
          sourceStart: 0,
          sourceEnd: estimatedDuration,
          layer: textTrack.clips.length + 1,
          volume: 1,
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(`已添加 ${addedCount} 个素材到播放头位置`);
    } else {
      toast.warning('该分镜没有可用的素材');
    }

    return addedCount;
  };

  // 处理键盘快捷键
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 只有在鼠标处于时间轴区域内，且没有打开编辑弹窗，且不在输入状态时才触发
      if (!isHovering || editingTrackId || isEditModalOpen || isAddSubtitleModalOpen) return;

      // 如果用户正在输入（如重命名轨道），则不触发快捷键
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const state = useTimelineStore.getState();
        if (state.isPlaying) {
          state.pause();
        } else {
          state.play();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          removeClip(selectedClipId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isHovering, editingTrackId, isEditModalOpen, isAddSubtitleModalOpen, selectedClipId, removeClip, undo, redo]);

  // 计算时间轴的总宽度（像素）
  const totalDuration = Math.max(project.duration, 30); // 至少显示30秒
  const totalWidth = totalDuration * zoom;

  // 计算当前时间对应的像素位置
  const getPixelPosition = (time: number) => {
    return time * zoom;
  };

  // 计算像素位置对应的时间
  const getTimeFromPixel = (pixel: number) => {
    return pixel / zoom;
  };

  // 渲染时间刻度
  const renderTimeRuler = () => {
    const interval = zoom > 50 ? 1 : 5; // 根据缩放级别调整时间刻度间隔
    const ticks: React.ReactNode[] = [];

    // 渲染整个项目时长的刻度，或者只渲染可见区域（为了性能）
    // 这里我们稍微扩大一点范围，确保滚动平滑
    const renderStart = Math.max(0, visibleStartTime - 5);
    const renderEnd = Math.min(totalDuration, visibleEndTime + 5);

    const startTick = Math.ceil(renderStart / interval) * interval;
    const endTick = Math.floor(renderEnd / interval) * interval;

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
      <div className="h-8 relative select-none" style={{ width: `${totalWidth}px` }}>
        {ticks}
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
    return project.tracks.map((track, index) => {
      // 判断当前是否是拖拽悬停状态
      const isHovering = dragHoverTrackId === track.id;
      const isCompatible = draggingAssetType ? isAssetCompatibleWithTrack(draggingAssetType, track.type) : false;

      // 轨道拖拽排序状态
      const isDragging = draggingTrackIndex === index;
      const isDragOver = dragOverTrackIndex === index;

      return (
      <div
        key={track.id}
        data-track-id={track.id}
        data-track-type={track.type}
        draggable={!track.isLocked}
        onDragStart={(e) => {
          if (track.isLocked) {
            e.preventDefault();
            return;
          }
          setDraggingTrackIndex(index);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', index.toString());
        }}
        onDragOver={(e) => {
          if (draggingTrackIndex !== null && draggingTrackIndex !== index) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverTrackIndex(index);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) {
            setDragOverTrackIndex(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingTrackIndex !== null && draggingTrackIndex !== index) {
            reorderTracks(draggingTrackIndex, index);
          }
          setDraggingTrackIndex(null);
          setDragOverTrackIndex(null);
        }}
        onDragEnd={() => {
          setDraggingTrackIndex(null);
          setDragOverTrackIndex(null);
        }}
        className={`h-16 border-b border-zinc-800/50 relative transition-all duration-200 ${
          selectedTrackId === track.id ? 'bg-zinc-900/80' : 'bg-zinc-950/30'
        } ${
          isDragging ? 'opacity-50' : ''
        } ${
          isDragOver ? 'border-t-2 border-t-blue-500' : ''
        } select-none group flex ${!track.isLocked ? 'cursor-move' : ''}`}
      >
        {/* 轨道头部 - 使用 sticky 保持可见 */}
        <div className={`sticky left-0 w-40 h-full border-r border-zinc-800/50 flex flex-col justify-center px-4 bg-zinc-900/90 backdrop-blur-md select-none z-20 transition-colors ${selectedTrackId === track.id ? 'border-r-blue-500/20' : ''}`}>
          
          {/* 轨道类型指示条 */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              track.type === 'video' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 
              track.type === 'audio' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
              'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
          }`} />

          <div className="flex items-center gap-2">
            {editingTrackId === track.id ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRenaming}
                    onKeyDown={handleKeyDown}
                    className="w-[90px] bg-black/50 text-[11px] text-white border border-blue-500 rounded px-1 py-0.5 outline-none"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <div 
                    className={`font-semibold text-[13px] truncate max-w-[90px] text-zinc-200 tracking-tight ${!track.isLocked ? 'cursor-text hover:text-white' : ''}`} 
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
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono bg-zinc-800/50 px-1 py-0.2 rounded">
                    {track.type === 'text' ? t('subtitle') : track.type === 'video' ? t('video') : t('audio')}
                </div>
                {track.isLocked && <Lock size={9} className="text-zinc-600" />}
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
          className="flex-1 relative h-full overflow-hidden"
          onClick={() => selectTrack(track.id)}
          style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // 从 window 对象读取素材类型
            const assetType = (window as any).__draggingAssetType;
            if (assetType) {
              setDraggingAssetType(assetType);
            }

            // 设置当前悬停的轨道
            setDragHoverTrackId(track.id);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // 只有当离开的是轨道本身（而不是子元素）时才清除高亮
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!e.currentTarget.contains(relatedTarget)) {
              setDragHoverTrackId(null);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // 在 dragover 中尝试从 dataTransfer.types 推断素材类型
            // 如果有 application/json 类型，说明是从素材管理器拖拽的
            if (e.dataTransfer.types.includes('application/json') && !draggingAssetType) {
              // 保持 dragover 事件允许 drop
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
              const data = JSON.parse(e.dataTransfer.getData('application/json'));

              if (data.type === 'shot') {
                // 处理分镜拖拽
                const shot = data.shot;

                // 计算drop位置对应的时间
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const dropTime = offsetX / zoom;

                // 使用shot的video_duration或默认5秒
                const durationInSeconds = shot.video_duration || 5;

                // 根据轨道类型添加不同的素材
                if (track.type === 'video') {
                  // 检查是否有视频
                  if (!shot.video_url) {
                    toast.error('该分镜没有视频，无法添加到视频轨道');
                    setDragHoverTrackId(null);
                    setDraggingAssetType(null);
                    return;
                  }
                  // 添加视频到视频轨道
                  addClip(track.id, {
                    url: shot.video_url,
                    startInTimeline: Math.max(0, dropTime),
                    duration: durationInSeconds,
                    sourceStart: 0,
                    sourceEnd: durationInSeconds,
                    layer: track.clips.length + 1,
                    volume: 0, // 视频静音（音频在单独的音频轨道）
                  });
                  toast.success(`已添加分镜 #${shot.shot_number} 视频到轨道`);
                } else if (track.type === 'audio') {
                  // 检查是否有音频
                  if (!shot.audio_url) {
                    toast.error('该分镜没有音频，无法添加到音频轨道');
                    setDragHoverTrackId(null);
                    setDraggingAssetType(null);
                    return;
                  }
                  // 添加音频到音频轨道
                  addClip(track.id, {
                    url: shot.audio_url,
                    startInTimeline: Math.max(0, dropTime),
                    duration: durationInSeconds,
                    sourceStart: 0,
                    sourceEnd: durationInSeconds,
                    layer: track.clips.length + 1,
                    volume: 1, // 默认音量100%
                  });
                  toast.success(`已添加分镜 #${shot.shot_number} 音频到轨道`);
                } else if (track.type === 'text') {
                  // 检查是否有字幕
                  if (!shot.narration || shot.narration.length === 0) {
                    toast.error('该分镜没有字幕，无法添加到文字轨道');
                    setDragHoverTrackId(null);
                    setDraggingAssetType(null);
                    return;
                  }
                  // 合并所有字幕内容（只保留内容，不显示发言人）
                  const subtitleText = shot.narration
                    .map((item: any) => item.内容 || item.content || '')
                    .filter((text: string) => text.trim())
                    .join('\n');

                  // 根据文本长度估算时长（原本按 3.5 字/秒计算，现缩短 1/3，按约 5.2 字/秒计算）
                  // 平均按每秒 5.2 个中文字符计算，最少 1.5 秒
                  const textLength = subtitleText.length;
                  const estimatedDuration = Math.max(1.5, textLength / 5.2);

                  // 添加字幕到文字轨道
                  addClip(track.id, {
                    url: '', // 文字轨道不需要URL
                    text: subtitleText,
                    startInTimeline: Math.max(0, dropTime),
                    duration: estimatedDuration,
                    sourceStart: 0,
                    sourceEnd: estimatedDuration,
                    layer: track.clips.length + 1,
                    volume: 1,
                  });
                  toast.success(`已添加分镜 #${shot.shot_number} 字幕到轨道`);
                }

                setDragHoverTrackId(null);
                setDraggingAssetType(null);
                return;
              }

              if (data.type === 'asset') {
                // 设置拖拽的素材类型用于验证
                const assetType = data.assetType;
                setDraggingAssetType(assetType);

                // 检查素材类型是否匹配轨道类型
                if (assetType === 'audio' && track.type !== 'audio') {
                  toast.error('音频素材只能添加到音频轨道');
                  // 清除高亮状态
                  setDragHoverTrackId(null);
                  setDraggingAssetType(null);
                  return;
                }
                if (assetType === 'video' && track.type !== 'video') {
                  toast.error('视频素材只能添加到视频轨道');
                  // 清除高亮状态
                  setDragHoverTrackId(null);
                  setDraggingAssetType(null);
                  return;
                }
                if (assetType === 'image' && track.type !== 'video') {
                  toast.error('图片素材只能添加到视频轨道');
                  // 清除高亮状态
                  setDragHoverTrackId(null);
                  setDraggingAssetType(null);
                  return;
                }

                // 计算drop位置对应的时间
                // 使用轨道内容区域的边界来计算,确保素材左侧对齐到鼠标位置
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const dropTime = offsetX / zoom;

                // 将duration从毫秒转换为秒(timeline使用秒作为单位)
                const durationInSeconds = data.duration ? data.duration / 1000 : 5;

                // 添加clip到轨道
                addClip(track.id, {
                  url: data.url,
                  startInTimeline: Math.max(0, dropTime),
                  duration: durationInSeconds,
                  sourceStart: 0,
                  sourceEnd: durationInSeconds,
                  layer: track.clips.length + 1,
                });

                toast.success(`已添加${data.name}到轨道`);
              }
            } catch (error) {
              console.error('Drop error:', error);
            } finally {
              // 清除高亮状态
              setDragHoverTrackId(null);
              setDraggingAssetType(null);
            }
          }}
        >
            {/* 轨道背景网格/纹理 */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                 style={{ backgroundImage: 'linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '100px 100%' }}>
            </div>

            {/* 拖拽高亮蒙版 - 兼容的轨道显示明亮的绿色 */}
            {isHovering && isCompatible && (
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/40 via-emerald-500/40 to-green-500/40 pointer-events-none z-10 animate-pulse">
                <div className="absolute inset-0 border-4 border-green-400 rounded-lg shadow-[0_0_20px_rgba(74,222,128,0.6)]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-green-500/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                    拖放到这里
                  </div>
                </div>
              </div>
            )}

            {/* 拖拽高亮蒙版 - 不兼容的轨道显示红色 */}
            {isHovering && !isCompatible && draggingAssetType && (
              <div className="absolute inset-0 bg-red-500/30 pointer-events-none z-10">
                <div className="absolute inset-0 border-4 border-red-400 rounded-lg shadow-[0_0_20px_rgba(248,113,113,0.6)]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg">
                    不支持此类型
                  </div>
                </div>
              </div>
            )}

          <div
            className="h-full relative py-1" // 给上下留一点padding
          >
            {track.clips.map((clip) => renderClip(clip, track.id, track.type))}
          </div>
        </div>
      </div>
      );
    });
  };

  // 渲染片段
  const renderClip = (clip: TimelineTrackClip, trackId: string, trackType: string) => {
    const clipPosition = getPixelPosition(clip.startInTimeline);
    const clipWidth = clip.duration * zoom;
    const isSelected = selectedClipId === clip.id || selectedClipIds.includes(clip.id);

    // 根据类型定义不同的渐变和边框颜色
    const styleClasses = trackType === 'video'
        ? `bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-blue-500/30 ${isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'hover:border-blue-500/50'}`
        : trackType === 'audio'
        ? `bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-emerald-500/30 ${isSelected ? 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'hover:border-emerald-500/50'}`
        : `bg-gradient-to-r from-orange-900/40 to-amber-900/40 border-orange-500/30 ${isSelected ? 'ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'hover:border-orange-500/50'}`;

    return (
      <div
        key={clip.id}
        className={`absolute h-[calc(100%-8px)] rounded-lg border backdrop-blur-sm cursor-move overflow-hidden select-none group ${styleClasses}`}
        style={{
          left: `${clipPosition}px`,
          width: `${Math.max(clipWidth, 4)}px`, // 最小宽度
          top: '4px',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transition: isDraggingRef.current && draggedClipIdRef.current === clip.id ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: isDraggingRef.current && draggedClipIdRef.current === clip.id ? 'left, width' : 'auto',
          zIndex: isDraggingRef.current && draggedClipIdRef.current === clip.id ? 100 : 1,
        }}
        onClick={(e) => {
          e.stopPropagation();
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
          const isMultiSelect = isMac ? e.metaKey : e.ctrlKey;
          if (isMultiSelect) {
            toggleClipSelection(clip.id, true);
          } else {
            selectClip(clip.id);
          }
        }}
        onMouseDown={(e) => {
          // 播放时禁止拖拽
          if (isPlaying) return;

          e.stopPropagation();
          e.preventDefault();

          // 检查是否按住了 Ctrl/Cmd 键（用于多选）
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
          const isMultiSelectKey = isMac ? e.metaKey : e.ctrlKey;

          // 如果没有按住多选键，且拖动的 clip 不在选中列表中，先选中它（清除其他选中）
          if (!isMultiSelectKey && !selectedClipIds.includes(clip.id)) {
            selectClip(clip.id);
          }

          // 保存所有选中clips的原始位置（用于多选拖动）
          const state = useTimelineStore.getState();
          const currentSelectedIds = state.selectedClipIds.length > 0 ? state.selectedClipIds : [clip.id];
          dragOriginalClipsPositionsRef.current.clear();

          state.project.tracks.forEach(track => {
            track.clips.forEach(c => {
              if (currentSelectedIds.includes(c.id)) {
                dragOriginalClipsPositionsRef.current.set(c.id, {
                  trackId: track.id,
                  startTime: c.startInTimeline
                });
              }
            });
          });

          saveHistory();
          isDraggingRef.current = true;
          dragTypeRef.current = 'moveClip';
          draggedClipIdRef.current = clip.id;
          draggedTrackIdRef.current = trackId;
          dragStartXRef.current = e.clientX;
          dragOriginalStartRef.current = clip.startInTimeline;
        }}
      >
        {/* 片段内容 */}
        <div className="h-full px-2 py-1 flex flex-col justify-between pointer-events-none">
          <div className="flex items-center gap-1 min-w-0">
            {trackType === 'video' && <Film size={10} className="text-blue-300/70 shrink-0" />}
            {trackType === 'audio' && <Music size={10} className="text-emerald-300/70 shrink-0" />}
            {trackType === 'text' && <Type size={10} className="text-orange-300/70 shrink-0" />}

            <span className="text-[10px] font-medium truncate text-zinc-100/90 tracking-tight">
                {trackType === 'text' ? (clip.text || t('untitledSubtitle')) : `${t('clip')} ${clip.id.split('-').pop()}`}
            </span>
          </div>

          {/* 编辑按钮 */}
          <div className="flex items-center gap-1 justify-between">
            {trackType === 'audio' && (
              <button
                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-900/30 hover:bg-emerald-800/50 rounded text-[9px] text-emerald-300 pointer-events-auto transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(clip, 'audio');
                }}
              >
                <Volume2 size={10} />
                <span>{Math.round((clip.volume ?? 1) * 100)}%</span>
              </button>
            )}
            {trackType === 'text' && (
              <button
                className="flex items-center gap-1 px-2 py-0.5 bg-orange-900/30 hover:bg-orange-800/50 rounded text-[9px] text-orange-300 pointer-events-auto transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(clip, 'text');
                }}
              >
                <FileText size={10} />
                <span>{t('editText')}</span>
              </button>
            )}

            <div className="flex-1"></div>

            <span className="text-[9px] font-mono text-zinc-300/60 bg-black/20 px-1 rounded">
              {clip.duration.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* 左右拖拽手柄 - 仅Hover显示 */}
        <div
          className="absolute left-0 top-0 h-full w-4 cursor-ew-resize opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center bg-gradient-to-r from-black/20 to-transparent transition-opacity"
          onMouseDown={(e) => {
            // 播放时禁止裁剪
            if (isPlaying) return;
            
            e.stopPropagation();
            e.preventDefault();
            saveHistory();
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
            // 播放时禁止裁剪
            if (isPlaying) return;
            
            e.stopPropagation();
            e.preventDefault();
            saveHistory();
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

  const rafRef = useRef<number | null>(null);

  // 处理鼠标拖拽移动时间轴和片段
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // 播放时禁止所有拖拽操作
      if (isPlaying) return;
      
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
        if (timelineRef.current) {
          timelineRef.current.scrollLeft -= deltaX;
          dragStartXRef.current = e.clientX;
        }
      } 
      else if (dragTypeRef.current === 'playhead') {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
          const rect = timelineRef.current?.getBoundingClientRect();
          if (rect) {
            const scrollLeft = timelineRef.current?.scrollLeft || 0;
            const clickX = e.clientX - rect.left + scrollLeft - 160;
            let newTime = Math.max(0, getTimeFromPixel(clickX));

            // 保存当前时间（不应用吸附）
            playheadDragSnappedTimeRef.current = newTime;

            // 获取最新状态
            const state = useTimelineStore.getState();
            const { project } = state;

            // 收集所有 clip 的起始和结束时间点作为吸附点
            const snapPoints: number[] = [0]; // 时间轴起点
            project.tracks.forEach(track => {
              track.clips.forEach(clip => {
                snapPoints.push(clip.startInTimeline); // 片段开始
                snapPoints.push(clip.startInTimeline + clip.duration); // 片段结束
              });
            });

            // 检查是否接近任何吸附点（仅用于显示指示线）
            const PLAYHEAD_SNAP_THRESHOLD = 0.2; // 播放头吸附阈值（秒）
            let snappedTime: number | null = null;

            for (const snapPoint of snapPoints) {
              if (Math.abs(newTime - snapPoint) < PLAYHEAD_SNAP_THRESHOLD) {
                snappedTime = snapPoint;
                break;
              }
            }

            // 显示吸附指示线，但不立即应用吸附
            if (snappedTime !== null) {
              setSnapIndicator(snappedTime);
            } else {
              setSnapIndicator(null);
            }

            // 播放头跟随鼠标移动到原始位置（不吸附）
            seek(newTime);
          }
        });
      }
      else if (dragTypeRef.current === 'moveClip') {
        const currentClipId = draggedClipIdRef.current;
        const currentTrackId = draggedTrackIdRef.current;
        
        if (currentClipId && currentTrackId) {
          // 使用 RAF 来优化性能，确保每帧只更新一次
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
          }

          rafRef.current = requestAnimationFrame(() => {
            const rawStartTime = Math.max(0, dragOriginalStartRef.current + timeDelta);

            // 获取最新的状态（避免闭包问题）
            const state = useTimelineStore.getState();
            const { project, currentTime: latestCurrentTime } = state;

            // 跨轨道拖拽：寻找当前鼠标位置下的轨道
            let targetTrackId = currentTrackId;
            const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
            const trackElement = elementsAtPoint.find(el => el.hasAttribute('data-track-id'));
            
            if (trackElement) {
              const hoverTrackId = trackElement.getAttribute('data-track-id')!;
              const hoverTrackType = trackElement.getAttribute('data-track-type')!;
              
              // 找到原始轨道以获取类型
              const sourceTrack = project.tracks.find(t => t.id === currentTrackId);
              const targetTrack = project.tracks.find(t => t.id === hoverTrackId);
              
              if (sourceTrack && targetTrack && sourceTrack.type === hoverTrackType && !targetTrack.isLocked) {
                targetTrackId = hoverTrackId;
                // 更新 ref 以便下一次 mousemove 使用
                draggedTrackIdRef.current = targetTrackId;
              }
            }

            // 找到当前轨道
            const currentTrack = project.tracks.find(t => t.id === targetTrackId);
            if (!currentTrack) return;

            // 找到被拖拽片段的引用（用于获取时长）
            const clipForDuration = currentTrack.clips.find(c => c.id === currentClipId) || 
                                    project.tracks.flatMap(t => t.clips).find(c => c.id === currentClipId);
            if (!clipForDuration) return;

            // 检查是否是多选状态
            const isMultiSelect = dragOriginalClipsPositionsRef.current.size > 1;

            // 对于多选，需要创建一个临时轨道来检查吸附，排除所有被选中的clips
            let trackForSnap = currentTrack;
            if (isMultiSelect) {
              const selectedIds = Array.from(dragOriginalClipsPositionsRef.current.keys());
              trackForSnap = {
                ...currentTrack,
                clips: currentTrack.clips.filter(c => !selectedIds.includes(c.id))
              };
            }

            // 检查吸附（包括播放头和其他片段）
            const snapResult = findSnapPoint(
              rawStartTime,
              clipForDuration.duration,
              trackForSnap,
              currentClipId,
              SNAP_THRESHOLD,
              [latestCurrentTime]
            );

            const finalStartTime = snapResult.time;
            const moveDelta = finalStartTime - dragOriginalStartRef.current;

            if (snapResult.snapped && snapResult.snapTime !== undefined) {
              setSnapIndicator(snapResult.snapTime);
            } else {
              setSnapIndicator(null);
            }

            if (isMultiSelect) {
              // 批量移动所有选中的片段 - 一次性更新，避免多次渲染
              const moves: Array<{ clipId: string; trackId: string; startTime: number }> = [];
              dragOriginalClipsPositionsRef.current.forEach((originalPos, clipId) => {
                const newStartTime = Math.max(0, originalPos.startTime + moveDelta);
                // 多选跨轨道暂不支持整体偏移轨道，仅支持同轨道批量移动或后续增强
                moves.push({
                  clipId,
                  trackId: originalPos.trackId,
                  startTime: newStartTime
                });
              });
              batchMoveClips(moves);
            } else {
              // 单个移动
              moveClip(currentClipId, targetTrackId, finalStartTime);
            }
          });
        }
      }
      else if (dragTypeRef.current === 'trimStart') {
        if (draggedClipIdRef.current && draggedTrackIdRef.current) {
          // 向右拖动 deltaX > 0 -> timeDelta > 0 -> duration 减少 -> start 增加
          // 限制：duration 不能小于 0.1s
          const maxDelta = dragOriginalDurationRef.current - 0.1;
          const actualTimeDelta = Math.min(Math.max(timeDelta, -dragOriginalSourceStartRef.current), maxDelta);
          
          let newStartTime = dragOriginalStartRef.current + actualTimeDelta;
          
          // 获取最新状态
          const state = useTimelineStore.getState();
          const { project, currentTime: latestCurrentTime } = state;
          
          // 找到当前轨道
          const currentTrack = project.tracks.find(t => t.id === draggedTrackIdRef.current);
          if (currentTrack) {
            // 裁剪开始位置也支持吸附
            const snapResult = findSnapPoint(
              newStartTime,
              0, // 裁剪时只考虑当前边缘
              currentTrack,
              draggedClipIdRef.current,
              SNAP_THRESHOLD,
              [latestCurrentTime]
            );
            if (snapResult.snapped) {
              newStartTime = snapResult.time;
              setSnapIndicator(snapResult.snapTime!);
            } else {
              setSnapIndicator(null);
            }
          }

          const finalDelta = newStartTime - dragOriginalStartRef.current;
          const newSourceStart = dragOriginalSourceStartRef.current + finalDelta;
          const newDuration = dragOriginalDurationRef.current - finalDelta;

          trimClip(draggedClipIdRef.current, newSourceStart, dragOriginalSourceEndRef.current);
          moveClip(draggedClipIdRef.current, draggedTrackIdRef.current, newStartTime);
        }
      }
      else if (dragTypeRef.current === 'trimEnd') {
        if (draggedClipIdRef.current && draggedTrackIdRef.current) {
          // 向右拖动 deltaX > 0 -> timeDelta > 0 -> duration 增加 -> end 增加
          // 限制：duration 不能小于 0.1s
          const minDuration = 0.1;
          let newDuration = Math.max(minDuration, dragOriginalDurationRef.current + timeDelta);
          let newEndTime = dragOriginalStartRef.current + newDuration;

          // 获取最新状态
          const state = useTimelineStore.getState();
          const { project, currentTime: latestCurrentTime } = state;

          // 找到当前轨道
          const currentTrack = project.tracks.find(t => t.id === draggedTrackIdRef.current);
          if (currentTrack) {
            // 裁剪结束位置也支持吸附
            const snapResult = findSnapPoint(
              newEndTime,
              0, // 裁剪时只考虑当前边缘
              currentTrack,
              draggedClipIdRef.current,
              SNAP_THRESHOLD,
              [latestCurrentTime]
            );
            if (snapResult.snapped) {
              newEndTime = snapResult.time;
              newDuration = newEndTime - dragOriginalStartRef.current;
              setSnapIndicator(snapResult.snapTime!);
            } else {
              setSnapIndicator(null);
            }
          }

          const newSourceEnd = dragOriginalSourceStartRef.current + newDuration;
          trimClip(draggedClipIdRef.current, dragOriginalSourceStartRef.current, newSourceEnd);
        }
      }
    };

    const handleMouseUp = () => {
      // 如果发生了拖动，立即设置标志以忽略后续的 click 事件（在应用吸附之前）
      if (isDraggingRef.current) {
        justDraggedRef.current = true;
        // 延迟后重置标志，防止影响后续的正常点击
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 100);
      }

      // 如果是播放头拖动，在松手时应用吸附
      if (dragTypeRef.current === 'playhead' && playheadDragSnappedTimeRef.current !== null) {
        const currentTime = playheadDragSnappedTimeRef.current;

        // 获取最新状态
        const state = useTimelineStore.getState();
        const { project } = state;

        // 收集所有 clip 的起始和结束时间点作为吸附点
        const snapPoints: number[] = [0]; // 时间轴起点
        project.tracks.forEach(track => {
          track.clips.forEach(clip => {
            snapPoints.push(clip.startInTimeline); // 片段开始
            snapPoints.push(clip.startInTimeline + clip.duration); // 片段结束
          });
        });

        // 检查是否接近任何吸附点
        const PLAYHEAD_SNAP_THRESHOLD = 0.2; // 播放头吸附阈值（秒）
        let snappedTime: number | null = null;

        for (const snapPoint of snapPoints) {
          if (Math.abs(currentTime - snapPoint) < PLAYHEAD_SNAP_THRESHOLD) {
            snappedTime = snapPoint;
            break;
          }
        }

        // 如果找到吸附点，应用吸附
        if (snappedTime !== null) {
          seek(snappedTime);
        }
      }

      // 清理状态
      isDraggingRef.current = false;
      dragTypeRef.current = null;
      draggedClipIdRef.current = null;
      draggedTrackIdRef.current = null;
      playheadDragSnappedTimeRef.current = null; // 清除播放头吸附时间
      setSnapIndicator(null); // 清除吸附指示线
    };

    const handleClick = (e: MouseEvent) => {
      // 如果刚刚完成拖动，忽略这个 click 事件
      if (justDraggedRef.current) {
        return;
      }

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


  // 当 zoom 或 visibleStartTime 改变时（如通过缩放控制），同步滚动位置
  useEffect(() => {
    if (timelineRef.current) {
      const targetScrollLeft = visibleStartTime * zoom;
      // 只有当偏差较大时才同步，避免循环触发 scroll 事件
      if (Math.abs(timelineRef.current.scrollLeft - targetScrollLeft) > 1) {
        timelineRef.current.scrollLeft = targetScrollLeft;
      }
    }
  }, [zoom, visibleStartTime]);

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

  // 处理滚动同步
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const viewportWidth = e.currentTarget.clientWidth - 160;
    
    // 更新 store 中的可见时间范围，确保 zoomIn/Out 正常工作
    const start = scrollLeft / zoom;
    const end = (scrollLeft + viewportWidth) / zoom;
    
    useTimelineStore.setState({
      visibleStartTime: start,
      visibleEndTime: end
    });
  };

  return (
    <div 
      className="w-full h-full flex flex-col bg-[#09090b] select-none"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 控制栏 */}
      <div className="h-14 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-800/50 shrink-0 relative">
        <div className="flex items-center gap-4">
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
            <div className="w-px h-4 bg-zinc-800 mx-1 self-center" />
            <button
                onClick={() => setIsAddSubtitleModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md hover:bg-purple-500/20 hover:border-purple-500/30 transition-all text-xs font-medium group"
            >
                <Edit2 size={14} className="group-hover:scale-110 transition-transform" />
                <span>新增文案</span>
            </button>
          </div>
        </div>

        {/* 居中的播放控制按钮 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-zinc-950/50 border border-zinc-800 p-1.5 rounded-xl shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1 pr-1 border-r border-zinc-800 mr-1">
            <button 
              onClick={undo} 
              disabled={!canUndo}
              title={t('undo') || '撤销 (Ctrl+Z)'}
              className={`p-2 rounded-lg transition-all ${canUndo ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'text-zinc-700 cursor-not-allowed'}`}
            >
              <Undo size={18} />
            </button>
            <button 
              onClick={redo} 
              disabled={!canRedo}
              title={t('redo') || '重做 (Ctrl+Shift+Z)'}
              className={`p-2 rounded-lg transition-all ${canRedo ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'text-zinc-700 cursor-not-allowed'}`}
            >
              <Redo size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              const state = useTimelineStore.getState();
              state.pause(); // 暂停播放
              state.seek(0); // 重置播放头到开头
            }}
            title={t('reset')}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={() => {
              const state = useTimelineStore.getState();
              if (state.isPlaying) {
                state.pause();
              } else {
                state.play();
              }
            }} 
            title={isPlaying ? t('pause') : t('play')}
            className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 w-12 flex justify-center"
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>
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
                    <div className="h-full bg-blue-500/50" style={{ width: `${Math.min(100, Math.max(0, ((zoom - 13) / (150 - 13)) * 100))}%` }}></div>
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

      {/* 选中片段状态栏 */}
      {selectedClipId && (
        <div className="h-10 flex items-center px-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/80 shrink-0 gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[11px] text-blue-400 font-medium">
            <span className="opacity-70">{t('selectedClip') || '已选中片段'}:</span>
            <span>{selectedClipId.split('-').pop()}</span>
          </div>
          
          <div className="h-4 w-[1px] bg-zinc-800 mx-1"></div>

          <button 
            onClick={() => {
                // TODO: 实现编辑功能
                toast.info(t('editFeatureComingSoon') || '编辑功能即将上线');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-md transition-all text-xs font-medium group"
          >
            <Edit2 size={14} className="group-hover:scale-110 transition-transform" />
            <span>{t('edit') || '编辑'}</span>
          </button>

          <button 
            onClick={() => {
              copySelectedClips();
              toast.success(t('copied'));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-md transition-all text-xs font-medium group"
          >
            <Plus size={14} className="group-hover:scale-110 transition-transform" />
            <span>{t('copy')}</span>
          </button>

          <button 
            onClick={() => removeClip(selectedClipId)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-md transition-all text-xs font-medium group"
          >
            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
            <span>{t('delete') || '删除'}</span>
          </button>

          <div className="flex-1"></div>
          
          <button 
            onClick={() => selectClip(undefined)}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all"
            title={t('deselect') || '取消选择'}
          >
            <Plus size={14} className="rotate-45" />
          </button>
        </div>
      )}

      {/* 时间轴 */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-auto relative select-none custom-scrollbar bg-[#09090b]"
        onScroll={handleScroll}
      >
        <div style={{ width: `${160 + totalWidth}px`, minWidth: '100%' }}>
          {/* 时间标尺与点击交互区 */}
          <div 
            className="h-8 border-b border-zinc-800/50 relative sticky top-0 z-30 timeline-click-area cursor-pointer group flex"
          >
            {/* 标尺左侧角落 - 覆盖滚动刻度 */}
            <div className="sticky left-0 w-40 h-full bg-zinc-900/95 backdrop-blur-md z-40 border-r border-zinc-800/50" />
            
            <div className="flex-1 h-full bg-zinc-950/90 backdrop-blur">
              {renderTimeRuler()}
            </div>
            
            {/* 播放头指示器（三角形） */}
            <div
                className="absolute top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-500 z-50 cursor-ew-resize filter drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                style={{ left: `${160 + getPixelPosition(currentTime) - 6}px` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  // 如果正在播放，先暂停
                  if (isPlaying) {
                    useTimelineStore.getState().pause();
                  }

                  isDraggingRef.current = true;
                  dragTypeRef.current = 'playhead';
                  playheadDragSnappedTimeRef.current = null; // 重置吸附时间
                }}
            />

            {/* 播放头线 - 贯穿整个时间轴 */}
            <div
                className="absolute top-8 bottom-0 w-[1px] bg-blue-500 z-40 cursor-ew-resize shadow-[0_0_4px_rgba(59,130,246,0.5)] h-[calc(100vh)]"
                style={{ left: `${160 + getPixelPosition(currentTime)}px` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  // 如果正在播放，先暂停
                  if (isPlaying) {
                    useTimelineStore.getState().pause();
                  }

                  isDraggingRef.current = true;
                  dragTypeRef.current = 'playhead';
                  playheadDragSnappedTimeRef.current = null; // 重置吸附时间
                }}
            >
              {/* 增加可点击区域的透明层 */}
              <div className="absolute top-0 bottom-0 -left-1.5 w-3 h-full cursor-ew-resize bg-transparent" />
            </div>

            {/* Hover时显示的幽灵指针 */}
            <div className="absolute top-0 bottom-0 w-[1px] bg-white/20 z-20 pointer-events-none h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                 style={{ left: 'var(--mouse-x, 0px)' }} />
          </div>

          {/* 专门的点击交互轨道 - 位于标尺下方，轨道上方 */}
          <div className="h-4 w-full bg-zinc-900/30 border-b border-zinc-800/30 relative z-20 timeline-click-area cursor-pointer hover:bg-zinc-800/50 transition-colors">
             <div className="absolute left-40 right-0 text-[10px] text-zinc-600 px-2 h-full flex items-center select-none pointer-events-none">
                {t('jumpPlayhead')}
             </div>
          </div>

          {/* 轨道 */}
          <div className="relative min-h-full pb-20">
            {renderTracks()}
            
            {/* 吸附指示线 */}
            {snapIndicator !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-yellow-400 z-50 pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse"
                style={{ left: `${160 + getPixelPosition(snapIndicator)}px` }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 编辑模态框 */}
      <Dialog open={isEditModalOpen} onOpenChange={handleCloseEditModal}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>
              {editingTrackType === 'audio' ? t('editVolume') : t('editSubtitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingTrackType === 'audio' ? '调整音频轨道音量大小' : '修改字幕文本内容'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editingTrackType === 'audio' && (
              <div className="space-y-3">
                <Label className="text-sm text-slate-300">
                  {t('volume')}: {editVolume}%
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={editVolume}
                  onChange={(e) => setEditVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-emerald-400 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-emerald-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-emerald-400"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {editingTrackType === 'text' && (
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">{t('subtitleText')}</Label>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={6}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  placeholder={t('enterSubtitleText')}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增文案模态框 */}
      <Dialog open={isAddSubtitleModalOpen} onOpenChange={setIsAddSubtitleModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>新增文案</DialogTitle>
            <DialogDescription>
              在播放头位置添加一段自定义文案。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">文案内容</Label>
              <Textarea
                value={newSubtitleText}
                onChange={(e) => setNewSubtitleText(e.target.value)}
                rows={4}
                className="bg-slate-800 border-slate-700 text-slate-200"
                placeholder="请输入文案内容..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-300">持续时长 (秒)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={newSubtitleDuration}
                onChange={(e) => setNewSubtitleDuration(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubtitleModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddSubtitle} className="bg-purple-600 hover:bg-purple-700">
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
