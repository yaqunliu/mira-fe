import { apiClient } from './client'

export type Subscription = {
  uuid: string
  status: string
  creem_subscription_id: string
  product_uuid: string
  points_amount: number
  billing_period: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  cancelled_at?: string
  created_at: string
  updated_at: string
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
  list: async (params?: { page?: number; page_size?: number }) => {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.append(k, String(v))
      })
    }
    const res = await apiClient.get<SubscriptionListResponse>(
      `/api/v1/subscriptions${search.toString() ? `?${search}` : ''}`
    )
    return res.data!
  },

  // 取消订阅
  cancel: async (subscriptionUuid: string, body?: SubscriptionCancelRequest) => {
    const res = await apiClient.post<Subscription>(
      `/api/v1/subscriptions/${subscriptionUuid}/cancel`,
      body || {}
    )
    return res.data!
  },
}

