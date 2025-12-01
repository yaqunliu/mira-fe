import { apiClient } from './client'
import type {
  PointsBalance,
  PointsRecordsParams,
  PointsRecordsResponse,
  CheckinResponse,
  PointsStatistics,
  PointsStatisticsParams,
  PointsCheckParams,
  PointsCheckResponse,
} from '@/types/points'

export const pointsApi = {
  // 获取积分余额
  getBalance: async (): Promise<PointsBalance> => {
    const response = await apiClient.get<PointsBalance>('/api/v1/points/balance')
    return response.data!
  },

  // 获取积分记录
  getRecords: async (params?: PointsRecordsParams): Promise<PointsRecordsResponse> => {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const url = `/api/v1/points/records${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiClient.get<PointsRecordsResponse>(url)
    return response.data!
  },

  // 每日签到
  checkin: async (): Promise<CheckinResponse> => {
    const response = await apiClient.post<CheckinResponse>('/api/v1/points/checkin')
    return response.data!
  },

  // 获取积分统计
  getStatistics: async (params?: PointsStatisticsParams): Promise<PointsStatistics> => {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const url = `/api/v1/points/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await apiClient.get<PointsStatistics>(url)
    return response.data!
  },

  // 检查积分是否充足
  checkPoints: async (params: PointsCheckParams): Promise<PointsCheckResponse> => {
    const response = await apiClient.post<PointsCheckResponse>('/api/v1/points/check', params)
    return response.data!
  },
}

