import { apiClient } from './client'
import type { Novel, Chapter, PaginatedResponse, PaginationParams, Character } from '@/types'
import mockNovels from '@/lib/mock-data/novels.json'
import mockChapters from '@/lib/mock-data/chapters.json'
import mockCharacters from '@/lib/mock-data/characters.json'
import mockCreations from '@/lib/mock-data/creations.json'

export const novelApi = {
  // 获取小说列表
  getNovels: async (params?: PaginationParams) => {
    // 模拟API调用
    return apiClient.get<Novel[]>('/api/v1/novels/?page=1&page_size=100')
  },

  getChapters: async (novelId: string) => {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            data: mockChapters,
            pagination: {
              page: 1,
              limit: 10,
              total: mockChapters.length,
              totalPages: 1,
            }
          }
        })
      }, 1000)
    })
  },

  getCharacters: async (novelId: string) => {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            data: mockCharacters,
          }
        })
      }, 1000)
    })
  },

  getCreationsByNovelId: async (novelId: string) => {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            data: mockCreations,
          }
        })
      }, 1000)
    })
  },

  // 获取单个小说详情
  getNovel: async (id: string) => {
    // 模拟API调用
    return new Promise((resolve) => {
    })
  },

  // 上传小说
  uploadNovel: async (file: File, metadata: { title: string; author: string; description?: string }) => {
    const formData = new FormData()
    formData.append('file', file)
    // formData.append('title', metadata.title)
    // formData.append('author', metadata.author)
    // if (metadata.description) {
    //   formData.append('description', metadata.description)
    // }

    return apiClient.post<Novel>('/api/v1/novels/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // 更新小说信息
  updateNovel: async (id: string, data: Partial<Novel>) => {
    return apiClient.put<Novel>(`/novels/${id}`, data)
  },

  // 删除小说
  deleteNovel: async (id: string) => {
    return apiClient.delete(`/api/v1/novels/${id}`)
  },

  // 获取章节列表
  // getChapters: async (novelId: string) => {
  //   return apiClient.get<Chapter[]>(`/novels/${novelId}/chapters`)
  // },

  // 获取单个章节
  getChapter: async (novelId: string, chapterId: string) => {
    return apiClient.get<Chapter>(`/novels/${novelId}/chapters/${chapterId}`)
  },

  // 更新章节
  updateChapter: async (novelId: string, chapterId: string, data: Partial<Chapter>) => {
    return apiClient.put<Chapter>(`/novels/${novelId}/chapters/${chapterId}`, data)
  },

  // 删除章节
  deleteChapter: async (novelId: string, chapterId: string) => {
    return apiClient.delete(`/novels/${novelId}/chapters/${chapterId}`)
  },
}
