import { apiClient } from './client'
import { Product } from './products'

export type Subscription = {
  uuid: string
  subscription_id: number
  order_id: number
  user_id: number
  creem_subscription_id: string
  status: string
  billing_period: string
  current_period_start?: string
  current_period_end?: string
  next_billing_date?: string
  points_per_period: number
  last_points_issued_at?: string
  cancel_at_period_end?: boolean
  cancelled_at?: string
  metadata?: any
  product?: Product
  created_at?: string
  updated_at?: string
}

export type SubscriptionListResponse = {
  items: Subscription[]
  total: number
  page: number
  page_size: number
}

export type SubscriptionCancelRequest = {
  cancel_at_period_end?: boolean
}

export const subscriptionsApi = {
  // 查询订阅列表
  list: async (params?: { page?: number; page_size?: number }): Promise<SubscriptionListResponse> => {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.append(k, String(v))
      })
    }
    const res = await apiClient.get<SubscriptionListResponse>(
      `/api/v1/subscriptions${search.toString() ? `?${search}` : ''}`
    )
    // 处理不同的响应格式：可能是 { data: {...} } 或直接是 {...}
    const data = res.data || res
    // 确保返回有效的响应格式
    return {
      items: data?.items || [],
      total: data?.total || 0,
      page: data?.page || 1,
      page_size: data?.page_size || 50,
    }
  },

  // 查询当前用户活跃订阅
  getActive: async (): Promise<Subscription[]> => {
    const res = await apiClient.get<Subscription[]>(`/api/v1/subscriptions/active`)
    // 处理不同的响应格式：可能是 { data: [...] } 或直接是 [...]
    const data = res.data || res
    return Array.isArray(data) ? data : []
  },

  // 获取订阅客户门户 URL
  getPortalUrl: async (subscriptionUuid: string) => {
    const res = await apiClient.get<{ portal_url: string }>(
      `/api/v1/subscriptions/${subscriptionUuid}/portal-url`
    )
    const data = res.data || res
    return data?.portal_url || ''
  },

  // 取消订阅（保留此方法以备将来需要时使用）
  cancel: async (subscriptionUuid: string, body?: SubscriptionCancelRequest) => {
    const res = await apiClient.post<Subscription>(
      `/api/v1/subscriptions/${subscriptionUuid}/cancel`,
      body || {}
    )
    const data = res.data || res
    return data as Subscription
  },
}

