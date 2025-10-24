import { apiClient } from './client'
import type { Novel, Chapter, PaginatedResponse, PaginationParams } from '@/types'
import { mockNovels } from '@/lib/mock-data'

export const novelApi = {
  // 获取小说列表
  getNovels: async (params?: PaginationParams) => {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            data: mockNovels,
            pagination: {
              page: 1,
              limit: 10,
              total: mockNovels.length,
              totalPages: 1,
            }
          }
        })
      }, 500)
    })
  },

  // 获取单个小说详情
  getNovel: async (id: string) => {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        const novel = mockNovels.find((n: Novel) => n.id === id)
        if (novel) {
          resolve({
            success: true,
            data: novel
          })
        } else {
          resolve({
            success: false,
            error: 'Novel not found'
          })
        }
      }, 300)
    })
  },

  // 上传小说
  uploadNovel: async (file: File, metadata: { title: string; author: string; description?: string }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', metadata.title)
    formData.append('author', metadata.author)
    if (metadata.description) {
      formData.append('description', metadata.description)
    }

    return apiClient.post<Novel>('/novels/upload', formData, {
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
    return apiClient.delete(`/novels/${id}`)
  },

  // 获取章节列表
  getChapters: async (novelId: string) => {
    return apiClient.get<Chapter[]>(`/novels/${novelId}/chapters`)
  },

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
