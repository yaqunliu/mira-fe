import { apiClient } from './client'
import type { Video, Character, Storyboard, PaginatedResponse, PaginationParams, GenerationOptions } from '@/types'
import { mockVideos } from '@/lib/mock-video-data'

export const videoApi = {
  // 获取视频列表
  getVideos: async (params?: PaginationParams) => {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            data: mockVideos,
            pagination: {
              page: 1,
              limit: 10,
              total: mockVideos.length,
              totalPages: 1,
            }
          }
        })
      }, 500)
    })
  },

  // 获取单个视频详情
  getVideo: async (id: string) => {
    return apiClient.get<Video>(`/videos/${id}`)
  },

  // 删除视频
  deleteVideo: async (id: string) => {
    return apiClient.delete(`/videos/${id}`)
  },

  // 获取角色列表
  getCharacters: async () => {
    return apiClient.get<Character[]>('/characters')
  },

  // 生成角色
  generateCharacter: async (data: { name: string; description: string; style: string }) => {
    return apiClient.post<Character>('/characters/generate', data)
  },

  // 重新生成角色
  regenerateCharacter: async (id: string, prompt: string) => {
    return apiClient.post<Character>(`/characters/${id}/regenerate`, { prompt })
  },

  // 更新角色
  updateCharacter: async (id: string, data: Partial<Character>) => {
    return apiClient.put<Character>(`/characters/${id}`, data)
  },

  // 删除角色
  deleteCharacter: async (id: string) => {
    return apiClient.delete(`/characters/${id}`)
  },

  // 生成分镜
  generateStoryboard: async (chapterId: string) => {
    return apiClient.post<Storyboard[]>(`/storyboards/generate`, { chapterId })
  },

  // 获取分镜列表
  getStoryboards: async (chapterId: string) => {
    return apiClient.get<Storyboard[]>(`/storyboards?chapterId=${chapterId}`)
  },

  // 更新分镜
  updateStoryboard: async (id: string, data: Partial<Storyboard>) => {
    return apiClient.put<Storyboard>(`/storyboards/${id}`, data)
  },

  // 生成分镜图片
  generateStoryboardImages: async (storyboardIds: string[]) => {
    return apiClient.post<Storyboard[]>(`/storyboards/generate-images`, { storyboardIds })
  },

  // 重新生成分镜图片
  regenerateStoryboardImage: async (id: string, prompt: string) => {
    return apiClient.post<Storyboard>(`/storyboards/${id}/regenerate-image`, { prompt })
  },

  // 生成音频
  generateAudio: async (data: { text: string; style: string }) => {
    return apiClient.post<{ audioUrl: string }>('/audio/generate', data)
  },

  // 生成视频
  generateVideo: async (data: {
    chapterId: string
    storyboardIds: string[]
    options: GenerationOptions
  }) => {
    return apiClient.post<Video>('/videos/generate', data)
  },

  // 合成最终视频
  synthesizeVideo: async (videoId: string) => {
    return apiClient.post<Video>(`/videos/${videoId}/synthesize`)
  },

  // 获取生成选项
  getGenerationOptions: async () => {
    return apiClient.get<{
      audioStyles: string[]
      bgmStyles: string[]
      videoStyles: string[]
      characterStyles: string[]
    }>('/generation/options')
  },
}
