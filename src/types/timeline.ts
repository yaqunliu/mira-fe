// 视频轨道相关类型
export interface TimelineTrackClip {
  id: string;          // 片段唯一标识符
  url: string;         // 视频/音频URL
  text?: string;       // 字幕文本（仅字幕）
  startInTimeline: number; // 在时间轴上的起始位置（秒）
  duration: number;    // 在时间轴上的显示长度（秒）
  sourceStart: number; // 素材裁剪：从原视频/音频的起始位置（秒）
  sourceEnd: number;   // 素材裁剪：到原视频/音频的结束位置（秒）
  layer: number;       // 轨道层级
  volume?: number;     // 音量（仅音频）
  opacity?: number;    // 透明度（仅视频）
  isMuted?: boolean;   // 是否静音（仅音频）
  isVisible?: boolean; // 是否可见（仅视频）
}

export interface TimelineTrack {
  id: string;              // 轨道唯一标识符
  type: 'video' | 'audio' | 'text'; // 轨道类型
  name: string;            // 轨道名称
  isLocked?: boolean;      // 是否锁定（例如初始轨道不可删除/重命名）
  clips: TimelineTrackClip[]; // 轨道上的片段
}

export interface TimelineProject {
  projectId: string;       // 项目ID
  duration: number;        // 总时长（秒）
  fps: number;             // 帧率
  tracks: TimelineTrack[]; // 轨道列表
}

export interface TimelineState {
  currentTime: number;      // 当前播放时间（秒）
  isPlaying: boolean;       // 是否正在播放
  zoom: number;             // 缩放比例（像素/秒）
  visibleStartTime: number; // 可见时间范围起始（秒）
  visibleEndTime: number;   // 可见时间范围结束（秒）
  selectedClipId?: string;  // 当前选中的片段ID
  selectedTrackId?: string; // 当前选中的轨道ID
  project: TimelineProject; // 项目数据
}
