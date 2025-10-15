// 用户相关类型
export interface User {
  id: string
  email: string
  username: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

// 小说相关类型
export interface Novel {
  id: string
  title: string
  description?: string
  coverImage?: string
  author: string
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  chapters: Chapter[]
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  novelId: string
  title: string
  content: string
  order: number
  createdAt: string
  updatedAt: string
}

// 角色相关类型
export interface Character {
  id: string
  name: string
  description: string
  imageUrl: string
  prompt: string
  style: string
  createdAt: string
  updatedAt: string
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
