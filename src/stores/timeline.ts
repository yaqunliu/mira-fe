import { create } from 'zustand';
import { produce } from 'immer';
import { TimelineState, TimelineProject, TimelineTrack, TimelineTrackClip } from '../types';

// 创建初始项目数据
const createInitialProject = (): TimelineProject => ({
  projectId: 'project-1',
  duration: 120,
  fps: 30,
  tracks: [
    {
      id: 'track-1',
      type: 'video',
      name: '视频轨道 1',
      clips: [],
    },
    {
      id: 'track-2',
      type: 'audio',
      name: '音频轨道 1',
      clips: [],
    },
  ],
});

// 创建初始状态
const initialState: TimelineState = {
  currentTime: 0,
  isPlaying: false,
  zoom: 44, // 44px per second (相当于从100缩小2次)
  visibleStartTime: 0,
  visibleEndTime: 30, // 初始显示30秒
  selectedClipId: undefined,
  selectedClipIds: [],
  selectedTrackId: undefined,
  project: createInitialProject(),
  past: [],
  future: [],
  clipboard: undefined,
};

export const useTimelineStore = create<TimelineState & {
  // 播放控制
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;

  // 历史记录
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // 轨道操作
  addTrack: (type: 'video' | 'audio' | 'text', name: string) => void;
  removeTrack: (trackId: string) => void;
  renameTrack: (trackId: string, name: string) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;

  // 片段操作
  addClip: (trackId: string, clip: Omit<TimelineTrackClip, 'id'>) => void;
  updateClip: (clipId: string, updates: Partial<TimelineTrackClip>) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, trackId: string, startTime: number) => void;
  trimClip: (clipId: string, sourceStart: number, sourceEnd: number) => void;

  // 选择操作
  selectClip: (clipId?: string) => void;
  selectTrack: (trackId?: string) => void;
  toggleClipSelection: (clipId: string, isMultiSelect: boolean) => void;
  clearSelection: () => void;
  selectAllClips: () => void;

  // 批量操作
  moveSelectedClips: (deltaTime: number) => void;
  deleteSelectedClips: () => void;
  batchMoveClips: (moves: Array<{ clipId: string; trackId: string; startTime: number }>) => void;

  // 缩放控制
  zoomIn: () => void;
  zoomOut: () => void;

  // 时间轴滚动
  scrollTimeline: (offset: number) => void;

  // 导入/导出
  importProject: (project: TimelineProject) => void;
  exportProject: () => TimelineProject;

  // 剪贴板操作
  copySelectedClips: () => void;
  pasteClips: () => void;
}>((set, get) => ({
  ...initialState,

  // 播放控制
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  seek: (time) => set({ currentTime: time }),

  // 历史记录
  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    return {
      project: previous,
      past: newPast,
      future: [state.project, ...state.future].slice(0, 50),
    };
  }),
  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      project: next,
      past: [...state.past, state.project].slice(-50),
      future: newFuture,
    };
  }),
  saveHistory: () => set(produce((state) => {
    state.past.push(JSON.parse(JSON.stringify(state.project)));
    if (state.past.length > 50) state.past.shift();
    state.future = [];
  })),

  // 轨道操作
  addTrack: (type, name) => set(produce((state) => {
    // 保存历史
    state.past.push(JSON.parse(JSON.stringify(state.project)));
    if (state.past.length > 50) state.past.shift();
    state.future = [];

    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      type,
      name,
      clips: [],
    };
    state.project.tracks.push(newTrack);
  })),

  removeTrack: (trackId) => set(produce((state) => {
    // 不能删除包含片段的轨道
    const track = state.project.tracks.find((t: TimelineTrack) => t.id === trackId);
    if (track && track.clips.length === 0) {
      // 保存历史
      state.past.push(JSON.parse(JSON.stringify(state.project)));
      if (state.past.length > 50) state.past.shift();
      state.future = [];

      state.project.tracks = state.project.tracks.filter((t: TimelineTrack) => t.id !== trackId);
      if (state.selectedTrackId === trackId) {
        state.selectedTrackId = undefined;
      }
    }
  })),

  renameTrack: (trackId, name) => set(produce((state) => {
    const track = state.project.tracks.find((t: TimelineTrack) => t.id === trackId);
    if (track && track.name !== name) {
      // 保存历史
      state.past.push(JSON.parse(JSON.stringify(state.project)));
      if (state.past.length > 50) state.past.shift();
      state.future = [];

      track.name = name;
    }
  })),

  reorderTracks: (fromIndex, toIndex) => set(produce((state) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= state.project.tracks.length) return;
    if (toIndex < 0 || toIndex >= state.project.tracks.length) return;

    // 保存历史
    state.past.push(JSON.parse(JSON.stringify(state.project)));
    if (state.past.length > 50) state.past.shift();
    state.future = [];

    // 重新排序
    const [movedTrack] = state.project.tracks.splice(fromIndex, 1);
    state.project.tracks.splice(toIndex, 0, movedTrack);
  })),

  // 片段操作
  addClip: (trackId, clipData) => set(produce((state) => {
    const track = state.project.tracks.find((t: TimelineTrack) => t.id === trackId);
    if (track) {
      // 保存历史
      state.past.push(JSON.parse(JSON.stringify(state.project)));
      if (state.past.length > 50) state.past.shift();
      state.future = [];

      // 使用更安全的ID生成方式，避免同一毫秒内的冲突
      const newClip: TimelineTrackClip = {
        ...clipData,
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        layer: track.clips.length + 1,
      };

      // 检查是否有重叠的片段，如果有，将后面的片段向后移动
      const newClipStart = newClip.startInTimeline;
      const newClipEnd = newClipStart + newClip.duration;

      // 找出所有在新片段结束时间之后开始的片段（这些不需要移动）
      // 以及所有与新片段有重叠的片段（这些需要移动）
      const overlappingClips = track.clips.filter((clip: TimelineTrackClip) => {
        const clipEnd = clip.startInTimeline + clip.duration;
        // 如果现有片段的结束时间 > 新片段的开始时间，说明有重叠
        return clipEnd > newClipStart && clip.startInTimeline < newClipEnd;
      });

      // 如果有重叠的片段，将它们及其后面的所有片段向后移动
      if (overlappingClips.length > 0) {
        // 找出需要移动的最小起始时间
        const minOverlapStart = Math.min(...overlappingClips.map((c: TimelineTrackClip) => c.startInTimeline));

        // 计算需要移动的距离（新片段的结束时间 - 最早重叠片段的开始时间）
        const shiftAmount = newClipEnd - minOverlapStart;

        // 将所有起始时间 >= minOverlapStart 的片段向后移动
        track.clips.forEach((clip: TimelineTrackClip) => {
          if (clip.startInTimeline >= minOverlapStart) {
            clip.startInTimeline += shiftAmount;
          }
        });
      }

      track.clips.push(newClip);

      // 更新项目总时长
      const maxClipEnd = Math.max(
        ...track.clips.map((c: TimelineTrackClip) => c.startInTimeline + c.duration),
        state.project.duration
      );
      state.project.duration = maxClipEnd;

      // 选择新添加的片段
      state.selectedClipId = newClip.id;
      state.selectedTrackId = trackId;
    }
  })),

  updateClip: (clipId, updates) => set(produce((state) => {
    for (const track of state.project.tracks) {
      const clip = track.clips.find((c: TimelineTrackClip) => c.id === clipId);
      if (clip) {
        Object.assign(clip, updates);

        // 如果更新了时间，需要更新项目总时长
        if (updates.startInTimeline !== undefined || updates.duration !== undefined) {
          const newEnd = (updates.startInTimeline ?? clip.startInTimeline) +
            (updates.duration ?? clip.duration);
          if (newEnd > state.project.duration) {
            state.project.duration = newEnd;
          }
        }
        break;
      }
    }
  })),

  removeClip: (clipId) => set(produce((state) => {
    for (const track of state.project.tracks) {
      const clipIndex = track.clips.findIndex((c: TimelineTrackClip) => c.id === clipId);
      if (clipIndex !== -1) {
        // 保存历史 (删除片段是单次操作，保留自动保存)
        state.past.push(JSON.parse(JSON.stringify(state.project)));
        if (state.past.length > 50) state.past.shift();
        state.future = [];

        track.clips.splice(clipIndex, 1);
        if (state.selectedClipId === clipId) {
          state.selectedClipId = undefined;
        }
        break;
      }
    }
  })),

  moveClip: (clipId, trackId, startTime) => set(produce((state) => {
    let clipToMove: TimelineTrackClip | undefined;
    let sourceTrack: TimelineTrack | undefined;

    // 找到要移动的片段
    for (const track of state.project.tracks) {
      const clip = track.clips.find((c: TimelineTrackClip) => c.id === clipId);
      if (clip) {
        clipToMove = clip;
        sourceTrack = track;
        break;
      }
    }

    if (!clipToMove || !sourceTrack) return;

    // 从原轨道移除片段
    sourceTrack.clips = sourceTrack.clips.filter((c) => c.id !== clipId);

    // 找到目标轨道
    const targetTrack = state.project.tracks.find((t: TimelineTrack) => t.id === trackId);
    if (!targetTrack) return;

    // 更新片段位置
    clipToMove.startInTimeline = startTime;

    // 添加到目标轨道
    targetTrack.clips.push(clipToMove);

    // 更新项目总时长
    const clipEnd = startTime + clipToMove.duration;
    if (clipEnd > state.project.duration) {
      state.project.duration = clipEnd;
    }

    // 更新选择状态
    state.selectedTrackId = trackId;
  })),

  trimClip: (clipId, sourceStart, sourceEnd) => set(produce((state) => {
    for (const track of state.project.tracks) {
      const clip = track.clips.find((c: TimelineTrackClip) => c.id === clipId);
      if (clip) {
        clip.sourceStart = sourceStart;
        clip.sourceEnd = sourceEnd;
        clip.duration = sourceEnd - sourceStart;
        break;
      }
    }
  })),

  // 选择操作
  selectClip: (clipId) => set({
    selectedClipId: clipId,
    selectedClipIds: clipId ? [clipId] : []
  }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),

  // 批量选择功能
  toggleClipSelection: (clipId, isMultiSelect) => set((state) => {
    if (!isMultiSelect) {
      // 单选模式：清除之前的选择，只选中当前片段
      return {
        selectedClipId: clipId,
        selectedClipIds: [clipId]
      };
    } else {
      // 多选模式：切换当前片段的选中状态
      const isSelected = state.selectedClipIds.includes(clipId);
      const newSelectedIds = isSelected
        ? state.selectedClipIds.filter(id => id !== clipId)
        : [...state.selectedClipIds, clipId];

      return {
        selectedClipId: newSelectedIds.length > 0 ? newSelectedIds[0] : undefined,
        selectedClipIds: newSelectedIds
      };
    }
  }),

  clearSelection: () => set({
    selectedClipId: undefined,
    selectedClipIds: []
  }),

  selectAllClips: () => set((state) => {
    const allClipIds: string[] = [];
    state.project.tracks.forEach(track => {
      track.clips.forEach(clip => {
        allClipIds.push(clip.id);
      });
    });
    return {
      selectedClipId: allClipIds.length > 0 ? allClipIds[0] : undefined,
      selectedClipIds: allClipIds
    };
  }),

  // 批量移动选中的片段
  moveSelectedClips: (deltaTime) => set(produce((state) => {
    if (state.selectedClipIds.length === 0) return;

    // 保存历史
    state.past.push(JSON.parse(JSON.stringify(state.project)));
    if (state.past.length > 50) state.past.shift();
    state.future = [];

    // 移动所有选中的片段
    state.project.tracks.forEach((track: TimelineTrack) => {
      track.clips.forEach((clip: TimelineTrackClip) => {
        if (state.selectedClipIds.includes(clip.id)) {
          const newStartTime = Math.max(0, clip.startInTimeline + deltaTime);
          clip.startInTimeline = newStartTime;
        }
      });
    });

    // 更新项目总时长
    let maxEnd = 0;
    state.project.tracks.forEach((track: TimelineTrack) => {
      track.clips.forEach((clip: TimelineTrackClip) => {
        const clipEnd = clip.startInTimeline + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;
      });
    });
    state.project.duration = Math.max(maxEnd, state.project.duration);
  })),

  // 批量删除选中的片段
  deleteSelectedClips: () => set(produce((state) => {
    if (state.selectedClipIds.length === 0) return;

    // 保存历史
    state.past.push(JSON.parse(JSON.stringify(state.project)));
    if (state.past.length > 50) state.past.shift();
    state.future = [];

    // 从所有轨道中删除选中的片段
    state.project.tracks.forEach((track: TimelineTrack) => {
      track.clips = track.clips.filter((clip: TimelineTrackClip) =>
        !state.selectedClipIds.includes(clip.id)
      );
    });

    // 清除选择
    state.selectedClipId = undefined;
    state.selectedClipIds = [];
  })),

  // 批量移动多个clips（一次性更新，避免多次渲染）
  batchMoveClips: (moves) => set(produce((state) => {
    if (moves.length === 0) return;

    // 为每个要移动的clip创建映射
    const moveMap = new Map(moves.map(m => [m.clipId, m]));

    // 第一步：直接更新所有clips的位置（不移除）
    state.project.tracks.forEach((track: TimelineTrack) => {
      track.clips.forEach((clip: TimelineTrackClip) => {
        const moveInfo = moveMap.get(clip.id);
        if (moveInfo && moveInfo.trackId === track.id) {
          // 同轨道移动：直接更新位置
          clip.startInTimeline = moveInfo.startTime;
        }
      });
    });

    // 第二步：处理跨轨道移动（如果有的话）
    const clipsToMove: Array<{ clip: TimelineTrackClip; fromTrackId: string; toTrackId: string; newStartTime: number }> = [];

    state.project.tracks.forEach((track: TimelineTrack) => {
      track.clips.forEach((clip: TimelineTrackClip) => {
        const moveInfo = moveMap.get(clip.id);
        if (moveInfo && moveInfo.trackId !== track.id) {
          // 跨轨道移动：记录下来
          clipsToMove.push({
            clip,
            fromTrackId: track.id,
            toTrackId: moveInfo.trackId,
            newStartTime: moveInfo.startTime
          });
        }
      });
    });

    // 执行跨轨道移动
    clipsToMove.forEach(({ clip, fromTrackId, toTrackId, newStartTime }) => {
      // 从源轨道移除
      const sourceTrack = state.project.tracks.find((t: TimelineTrack) => t.id === fromTrackId);
      if (sourceTrack) {
        sourceTrack.clips = sourceTrack.clips.filter((c: TimelineTrackClip) => c.id !== clip.id);
      }

      // 添加到目标轨道
      const targetTrack = state.project.tracks.find((t: TimelineTrack) => t.id === toTrackId);
      if (targetTrack) {
        clip.startInTimeline = newStartTime;
        targetTrack.clips.push(clip);
      }
    });

    // 更新项目总时长
    let maxEnd = 0;
    state.project.tracks.forEach((track: TimelineTrack) => {
      track.clips.forEach((clip: TimelineTrackClip) => {
        const clipEnd = clip.startInTimeline + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;
      });
    });
    state.project.duration = Math.max(maxEnd, state.project.duration);
  })),

  // 缩放控制
  zoomIn: () => set((state) => {
    const oldZoom = state.zoom;
    const newZoom = Math.min(oldZoom * 1.5, 150); // 最大150px/s (44是中间值)
    if (newZoom === oldZoom) return state;

    const oldVisibleDuration = state.visibleEndTime - state.visibleStartTime;
    // 保持像素宽度恒定: newVisibleDuration * newZoom = oldVisibleDuration * oldZoom
    const newVisibleDuration = (oldVisibleDuration * oldZoom) / newZoom;
    
    // 保持当前播放时间在视窗中的相对位置
    const centerTime = state.currentTime;
    // 计算当前播放时间在旧视窗中的百分比位置
    const relativePos = (state.currentTime - state.visibleStartTime) / oldVisibleDuration;
    
    return {
      zoom: newZoom,
      visibleStartTime: centerTime - relativePos * newVisibleDuration,
      visibleEndTime: centerTime + (1 - relativePos) * newVisibleDuration,
    };
  }),

  zoomOut: () => set((state) => {
    const oldZoom = state.zoom;
    const newZoom = Math.max(oldZoom / 1.5, 13); // 最小13px/s (使44成为中间值)
    if (newZoom === oldZoom) return state;

    const oldVisibleDuration = state.visibleEndTime - state.visibleStartTime;
    const newVisibleDuration = (oldVisibleDuration * oldZoom) / newZoom;
    
    const centerTime = state.currentTime;
    const relativePos = (state.currentTime - state.visibleStartTime) / oldVisibleDuration;
    
    let newStartTime = centerTime - relativePos * newVisibleDuration;
    let newEndTime = centerTime + (1 - relativePos) * newVisibleDuration;

    // 边界处理
    if (newStartTime < 0) {
        newEndTime -= newStartTime;
        newStartTime = 0;
    }
    
    return {
      zoom: newZoom,
      visibleStartTime: newStartTime,
      visibleEndTime: newEndTime,
    };
  }),

  // 时间轴滚动
  scrollTimeline: (offset: number) => set((state) => {
    const timeOffset = offset / state.zoom;
    const newStartTime = Math.max(0, state.visibleStartTime + timeOffset);
    const newEndTime = Math.min(
      state.project.duration,
      state.visibleEndTime + timeOffset
    );
    return {
      visibleStartTime: newStartTime,
      visibleEndTime: newEndTime,
    };
  }),

  // 导入/导出
  importProject: (project) => set((state) => {
    // 只在非初始状态时保存历史（避免初次加载时有撤销历史）
    const isInitialState = state.project.tracks.every(track => track.clips.length === 0) && state.past.length === 0;
    const past = isInitialState
      ? []
      : [...state.past, JSON.parse(JSON.stringify(state.project))].slice(-50);

    return {
      ...state,
      project,
      past,
      future: [],
      visibleEndTime: Math.min(30, project.duration), // 重置可见范围
    };
  }),

  exportProject: () => get().project,

  copySelectedClips: () => set((state) => {
    const selectedIds = state.selectedClipIds.length > 0 
      ? state.selectedClipIds 
      : (state.selectedClipId ? [state.selectedClipId] : []);
    
    if (selectedIds.length === 0) return state;

    const selectedClips: TimelineTrackClip[] = [];
    state.project.tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (selectedIds.includes(clip.id)) {
          selectedClips.push(JSON.parse(JSON.stringify(clip)));
        }
      });
    });

    return { clipboard: selectedClips };
  }),

  pasteClips: () => set(produce((state) => {
    if (!state.clipboard || state.clipboard.length === 0) return;

    // 找到第一个选中的轨道，或者第一个视频轨道
    let targetTrackId = state.selectedTrackId;
    if (!targetTrackId) {
      const firstVideoTrack = state.project.tracks.find((t: TimelineTrack) => t.type === 'video');
      if (firstVideoTrack) targetTrackId = firstVideoTrack.id;
    }

    if (!targetTrackId) return;

    // 保存历史
    state.past.push(JSON.parse(JSON.stringify(state.project)));
    if (state.past.length > 50) state.past.shift();
    state.future = [];

    // 计算偏移量：以剪贴板中第一个片段的起始时间为基准，粘贴到当前时间
    const baseStartTime = Math.min(...state.clipboard.map((c: TimelineTrackClip) => c.startInTimeline));
    const offset = state.currentTime - baseStartTime;

    const newClips: string[] = [];
    state.clipboard.forEach((clip: TimelineTrackClip) => {
      const newClip: TimelineTrackClip = {
        ...clip,
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startInTimeline: Math.max(0, clip.startInTimeline + offset),
      };

      // 粘贴到原始轨道类型匹配的第一个可用轨道，或者当前选中轨道
      const originalTrack = state.project.tracks.find((t: TimelineTrack) => t.clips.some((c: TimelineTrackClip) => c.id === clip.id));
      const targetTrack = state.project.tracks.find((t: TimelineTrack) => t.id === targetTrackId) || 
                          state.project.tracks.find((t: TimelineTrack) => t.type === (originalTrack?.type || 'video'));

      if (targetTrack) {
        targetTrack.clips.push(newClip);
        newClips.push(newClip.id);
      }
    });

    if (newClips.length > 0) {
      state.selectedClipIds = newClips;
      state.selectedClipId = newClips.length === 1 ? newClips[0] : undefined;
    }
  })),
}));
