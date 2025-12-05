import { apiClient } from './client'
import type { Novel, Chapter, PaginatedResponse, PaginationParams, Character } from '@/types'
import mockNovels from '@/lib/mock-data/novels.json'
import mockChapters from '@/lib/mock-data/chapters.json'

export const novelApi = {
  // 获取小说列表
  getNovels: async (params?: PaginationParams) => {
    // 构建查询参数
    const queryParams = new URLSearchParams()
    if (params?.page) {
      queryParams.append('page', params.page.toString())
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString())
    }
    if (params?.title) {
      queryParams.append('title', params.title)
    }
    
    const queryString = queryParams.toString()
    const url = `/api/v1/novels/${queryString ? `?${queryString}` : ''}`
    
    return apiClient.get<Novel[]>(url)
  },

  // 获取章节列表（支持分页）
  getChapters: async (novelId: string, params?: PaginationParams) => {
    // 构建查询参数
    const queryParams = new URLSearchParams()
    if (params?.page) {
      queryParams.append('page', params.page.toString())
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString())
    } else {
      // 默认每页10个
      queryParams.append('page_size', '10')
    }
    
    const queryString = queryParams.toString()
    const url = `/api/v1/novels/${novelId}/chapters${queryString ? `?${queryString}` : '?page_size=10'}`
    
    return apiClient.get<PaginatedResponse<Chapter>>(url)
  },

  getCharacters: async (novelId: string) => {
    // 小说详情接口已经返回了角色数据，这里返回空数组
    // 如果小说详情接口没有返回数据，前端会显示"暂无角色"
    return {
      success: true,
      data: {
        data: [],
      }
    }
  },

  getCreationsByNovelId: async (novelId: string) => {
    // 小说详情接口已经返回了创作数据，这里返回空数组
    // 如果小说详情接口没有返回数据，前端会显示"暂无创作"
    return {
      success: true,
      data: {
        data: [],
      }
    }
  },

  // 获取单个小说详情
  getNovel: async (id: string) => {
    return apiClient.get<Novel>(`/api/v1/novels/${id}`)
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
  updateNovel: async (id: string, data: { title?: string; author?: string; status?: string }) => {
    return apiClient.put<Novel>(`/api/v1/novels/${id}`, data)
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
    return apiClient.get<Chapter>(`/api/v1/novels/${novelId}/chapters/${chapterId}`)
  },

  // 更新章节
  updateChapter: async (novelId: string, chapterId: string, data: { title?: string }) => {
    return apiClient.put<Chapter>(`/api/v1/novels/${novelId}/chapters/${chapterId}`, data)
  },

  // 删除章节
  deleteChapter: async (novelId: string, chapterId: string) => {
    return apiClient.delete(`/api/v1/novels/${novelId}/chapters/${chapterId}`)
  },
}
