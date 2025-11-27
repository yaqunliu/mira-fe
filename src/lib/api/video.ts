import { apiClient } from './client'
import type { Video, ApiResponse } from '@/types'

const videoApi = {
    getVideos: async (): Promise<{ data: Video[] }> => {
        return apiClient.get<ApiResponse<Video[]>>('/api/v1/videos') as unknown as Promise<{ data: Video[] }>
    }
}

export default videoApi;