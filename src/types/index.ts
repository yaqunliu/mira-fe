// 用户相关类型
export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  createdAt: string
  updatedAt: string
}


// 小说列表类型（用于mock数据）
export interface Novel {
  novelId: string
  title: string
  author: string
  uploadTime: string
  chapterList: ChapterListItem[]
  relatedCreations: string[]
  characterLibrary: string[]
}

export interface ChapterListItem {
  chapterId: string
  title: string
  order: number
}

export interface Chapter {
  id: string
  novelId: string
  title: string
  content: string
  order: number
  chapterId: string
  createdAt: string
  updatedAt: string
}

// 章节详情类型（用于mock数据）
export interface ChapterDetail {
  chapterId: string
  associatedNovelId: string
  content: string
  associatedCreation: string | null
}

// 角色详情类型（用于mock数据）
export interface Character {
  characterId: string
  name: string
  status: 'new' | 'old'
  basicInfo: string
  featureDescription: {
    appearance: string
    body: string
    hair: string
    clothing: string
    tags: string[]
  }
  imagePrompt: string
  visualStyle: string
  characterImage: string
}

// 分镜相关类型
export interface Storyboard {
  id: string
  chapterId: string
  order: number
  description: string
  narration: string
  imageUrl?: string
  prompt?: string
  createdAt: string
  updatedAt: string
}

// 分镜详情类型（用于mock数据）
export interface Shot {
  shotId: string
  title: string
  associatedCharacters: string[]
  sceneDescription: string
  narration: string
  imagePrompt: string
  shotImage: string
}

// 视频相关类型
export interface Video {
  id: string
  title: string
  description?: string
  novelId: string
  chapterId: string
  videoUrl: string
  thumbnailUrl?: string
  duration: number
  status: 'generating' | 'completed' | 'failed'
  audioUrl?: string
  subtitles?: Subtitle[]
  createdAt: string
  updatedAt: string
  step?: string
}

export interface Subtitle {
  id: string
  startTime: number
  endTime: number
  text: string
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 分页类型
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 文件上传类型
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// 生成选项类型
export interface GenerationOptions {
  audioStyle?: string
  bgmStyle?: string
  videoStyle?: string
  characterStyle?: string
}

// 场景相关类型
export interface SceneSetting {
  time: string
  address: string
  space: string
  background_elements: string
  atmosphere: string
}

// 场景设置类型（用于mock数据）
export interface SceneSettingDetail {
  time: string
  location: string
  space: string
  atmosphere: string
}

export interface StoryboardItem {
  storyboard_id: string
  storyboard_name: string
  storyboard_characters: string[]
  storyboard_description: string
  storyboard_prompt: string
  storyboard_narration?: string
}

export interface Scene {
  scene_id: string
  scene_title: string
  scene_duration: string
  scene_setting: SceneSetting
  storyboard_list: StoryboardItem[]
}

// 场景详情类型（用于mock数据）
export interface SceneDetail {
  sceneId: string
  title: string
  duration: string
  sceneSetting: SceneSettingDetail
  shotList: string[]
}

export interface SceneData {
  data: Scene[]
}

// AI生图结果类型
export interface AIGeneratedImage {
  image_id: string;
  title: string;
  image_url: string;
  prompt: string;
  narration: string;
  status?: 'generating' | 'completed' | 'failed';
  progress?: number;
  createdAt?: string;
}

// 场景分组类型
export interface SceneGroup {
  scene_id: string;
  scene_title: string;
  images: AIGeneratedImage[];
}


export interface AssociatedNovelChapter {
  chapterId: string
  novelId: string
}

export interface Creation {
  creationId: string
  title: string
  status: 'completed' | 'generating' | 'draft' | 'failed'
  createdAt: string
  updatedAt: string
  associatedNovelChapters: AssociatedNovelChapter[]
  characterLibrary: string[]
  sceneList: string[]
  videoUrl: string | null
  audioUrl: string | null
}
