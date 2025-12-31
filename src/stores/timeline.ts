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
  zoom: 100, // 100px per second
  visibleStartTime: 0,
  visibleEndTime: 30, // 初始显示30秒
  selectedClipId: undefined,
  selectedTrackId: undefined,
  project: createInitialProject(),
};

export const useTimelineStore = create<TimelineState & {
  // 播放控制
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;

  // 轨道操作
  addTrack: (type: 'video' | 'audio' | 'text', name: string) => void;
  removeTrack: (trackId: string) => void;
  renameTrack: (trackId: string, name: string) => void;

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

  // 轨道操作
  addTrack: (type, name) => set(produce((state) => {
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
      state.project.tracks = state.project.tracks.filter((t: TimelineTrack) => t.id !== trackId);
      if (state.selectedTrackId === trackId) {
        state.selectedTrackId = undefined;
      }
    }
  })),

  renameTrack: (trackId, name) => set(produce((state) => {
    const track = state.project.tracks.find((t: TimelineTrack) => t.id === trackId);
    if (track) {
      track.name = name;
    }
  })),

  // 片段操作
  addClip: (trackId, clipData) => set(produce((state) => {
    const track = state.project.tracks.find((t: TimelineTrack) => t.id === trackId);
    if (track) {
      const newClip: TimelineTrackClip = {
        ...clipData,
        id: `clip-${Date.now()}`,
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
    const newZoom = Math.min(state.zoom * 1.5, 1000); // 最大1000px/s
    // 保持当前时间在视窗中心
    const centerTime = (state.visibleStartTime + state.visibleEndTime) / 2;
    const newVisibleDuration = (state.visibleEndTime - state.visibleStartTime) / 1.5;
    return {
      zoom: newZoom,
      visibleStartTime: centerTime - newVisibleDuration / 2,
      visibleEndTime: centerTime + newVisibleDuration / 2,
    };
  }),

  zoomOut: () => set((state) => {
    const newZoom = Math.max(state.zoom / 1.5, 10); // 最小10px/s
    // 保持当前时间在视窗中心
    const centerTime = (state.visibleStartTime + state.visibleEndTime) / 2;
    const newVisibleDuration = (state.visibleEndTime - state.visibleStartTime) * 1.5;
    return {
      zoom: newZoom,
      visibleStartTime: Math.max(0, centerTime - newVisibleDuration / 2),
      visibleEndTime: Math.min(
        state.project.duration,
        centerTime + newVisibleDuration / 2
      ),
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
  importProject: (project) => set((state) => ({
    ...state,
    project,
    visibleEndTime: Math.min(30, project.duration), // 重置可见范围
  })),

  exportProject: () => get().project,
}));
