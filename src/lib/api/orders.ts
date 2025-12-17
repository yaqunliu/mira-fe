import { apiClient } from './client'

export type OrderCreateRequest = {
  product_uuid: string
  order_type: 'onetime' | 'subscription'
  success_url?: string
  cancel_url?: string
  metadata?: Record<string, any>
}

export type Order = {
  uuid: string
  order_number: string
  status: string
  order_type: 'onetime' | 'subscription'
  amount: number
  currency: string
  points_amount: number
  points_issued: number
  checkout_url?: string
  creem_checkout_id?: string
  creem_transaction_id?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

export type OrderListResponse = {
  items: Order[]
  total: number
  page: number
  page_size: number
}

export const ordersApi = {
  // 创建订单
  create: async (payload: OrderCreateRequest) => {
    const res = await apiClient.post<Order>('/api/v1/orders', payload)
    return (res as any).data || res
  },

  // 查询单个订单
  get: async (orderUuid: string) => {
    const res = await apiClient.get<Order>(`/api/v1/orders/${orderUuid}`)
    return (res as any).data || res
  },

  // 查询订单列表
  list: async (params?: {
    status?: string
    order_type?: 'onetime' | 'subscription'
    page?: number
    page_size?: number
  }) => {
    const search = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.append(k, String(v))
      })
    }
    const res = await apiClient.get<OrderListResponse>(
      `/api/v1/orders${search.toString() ? `?${search}` : ''}`
    )
    return (res as any).data || res
  },
}
