// i18n-ignore-file：本文件含后端 LLM 输出的中文 JSON 字段名（角色 / 内容）与
// 约定的默认值（旁白）。它们是数据契约的一部分，翻译会直接破坏与后端的对接，
// 必须等后端把契约改成 role / content / narrator 后再同步修改。
// 见 en-plan.md Phase 0 白名单与「已知遗留 · 后端待办 5」。
// 用户相关类型
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// 小说列表类型
export interface Novel {
  novel_id: string;
  uuid: string;
  title: string;
  author: string;
  update_time: string;
  chapter_count: number;
  creation_ids: string[];
  character_ids: string[];
  type?: string; // 'novel' | 'script'
  chapters?: Chapter[]; // 可选，章节数据通过章节列表接口单独获取
}

export interface ChapterListItem {
  chapter_id: string;
  uuid: string;
  title: string;
  order: number;
}

export interface Chapter {
  chapter_id: string;
  uuid: string;
  title: string;
  chapter_number: number;
  word_count: number;
  preview: string;
  created_at: string;
  createdAt: string;
  updatedAt: string;
}

// 章节详情类型（用于mock数据）
export interface ChapterDetail {
  chapterId: string;
  associatedNovelId: string;
  content: string;
  associatedCreation: string | null;
}

// 分镜相关类型
export interface Storyboard {
  id: string;
  chapterId: string;
  order: number;
  description: string;
  narration: { 角色: string; 内容: string }[];
  imageUrl?: string;
  prompt?: string;
  createdAt: string;
  updatedAt: string;
}

// 分镜详情类型（用于mock数据）
export interface Shot {
  shotId: string;
  title: string;
  associatedCharacters: string[];
  sceneDescription: string;
  narration: { 角色: string; 内容: string }[];
  imagePrompt: string;
  shotImage: string;
}

// 视频相关类型
export interface Video {
  id: string;
  title: string;
  description?: string;
  novelId: string;
  chapterId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  status: "generating" | "completed" | "failed";
  audioUrl?: string;
  subtitles?: Subtitle[];
  createdAt: string;
  updatedAt: string;
  step?: string;
}

export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页类型
export interface PaginationParams {
  page?: number;
  page_size?: number;
  title?: string; // 可选的小说/创作标题筛选参数
  type?: string; // 可选的小说/文案类型筛选参数
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 文件上传类型
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// 生成选项类型
export interface GenerationOptions {
  audioStyle?: string;
  bgmStyle?: string;
  videoStyle?: string;
  characterStyle?: string;
}

// 场景相关类型
export interface SceneSetting {
  time: string;
  address: string;
  space: string;
  background_elements: string;
  atmosphere: string;
}

// 场景设置类型（用于mock数据）
export interface SceneSettingDetail {
  time: string;
  location: string;
  space: string;
  atmosphere: string;
}

export interface StoryboardItem {
  storyboard_id: string;
  storyboard_name: string;
  storyboard_characters: string[];
  storyboard_description: string;
  storyboard_prompt: string;
  storyboard_narration?: string[];
}

export interface Scene {
  scene_id: string;
  scene_title: string;
  scene_duration: string;
  scene_setting: SceneSetting;
  storyboard_list: StoryboardItem[];
}

// 场景详情类型（用于mock数据）
export interface SceneDetail {
  sceneId: string;
  title: string;
  duration: string;
  sceneSetting: SceneSettingDetail;
  shotList: string[];
}

export interface SceneData {
  data: Scene[];
}

// AI生图结果类型
export interface AIGeneratedImage {
  image_id: string;  // 应该是UUID，但为了向后兼容保留为string
  uuid?: string;  // 分镜的UUID，优先使用此字段
  title: string;
  image_url: string;
  prompt: string;
  narration: NarrationItem[];
  status?: "pending" | "generating" | "completed" | "failed";
  progress?: number;
  createdAt?: string;
  characters?: import("./character").ICharacter[];
}

// 场景分组类型
export interface SceneGroup {
  scene_id: string;
  scene_title: string;
  images: AIGeneratedImage[];
}

export interface AssociatedNovelChapter {
  chapterId: string;
  novelId: string;
}

export interface Task {
  taskId: string;
  taskType: TaskType;
  status: TaskStatus;
  message: string;
  progress: {
    current: number;
    total: number;
    percent: number;
    status: string;
    stage: string;
    success_count: number;
    error_count: number;
  };
  resource: any;
}

export enum TaskType {
  NOVEL_UPLOAD = "novel_upload",
  CREATION_INIT = "creation_init",
  CHARACTER_ANALYSIS = "character_analysis",
  CHARACTER_IMAGE_GENERATION = "character_image_generation",
  SCENE_DESCRIPTION_GENERATION = "scene_description_generation",
  SHOT_IMAGE_GENERATION = "shot_image_generation",
  BATCH_SHOT_IMAGE_GENERATION = "batch_shot_image_generation",
  VIDEO_MERGE = "video_merge",
}

export enum TaskStatus {
  PENDING = "PENDING",
  STARTED = "STARTED",
  PROGRESS = "PROGRESS",
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  RETRY = "RETRY",
  REVOKED = "REVOKED",
}

// 分镜生成任务相关类型
export interface ShotGenerationProgress {
  total: number;
  completed: number;
  success_count: number;
  failed_count: number;
}

export interface NarrationItem {
  角色: string;
  内容: string;
}

export interface GeneratedShot {
  shot_id: number;
  uuid?: string;  // UUID字段
  title: string;
  image_url: string;
  status: "pending" | "generating" | "completed" | "failed";
  narration: NarrationItem[];
  prompt?: string;
  image_prompt?: string; // API 可能返回 image_prompt 字段
}

export interface GeneratedScene {
  scene_id: number;
  title: string;
  shots: GeneratedShot[];
}

export interface ShotsTaskResponse {
  task_id: string;
  status: TaskStatus;
  progress: ShotGenerationProgress;
  creation_id: number;
  scenes: GeneratedScene[];
}

// 导出语音相关类型
export * from './voice';

// 导出积分相关类型
export * from './points';

// 导出视频轨道相关类型
export * from './timeline';

