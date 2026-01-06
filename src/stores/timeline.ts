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
  selectedTrackId: undefined,
  project: createInitialProject(),
  past: [],
  future: [],
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

  // 缩放控制
  zoomIn: () => void;
  zoomOut: () => void;

  // 时间轴滚动
  scrollTimeline: (offset: number) => void;

  // 导入/导出
  importProject: (project: TimelineProject) => void;
  exportProject: () => TimelineProject;
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
      track.clips.push(newClip);

      // 更新项目总时长
      const clipEnd = newClip.startInTimeline + newClip.duration;
      if (clipEnd > state.project.duration) {
        state.project.duration = clipEnd;
      }

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
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),

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
}));
