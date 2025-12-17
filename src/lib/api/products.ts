import { apiClient } from './client'

export type Product = {
  uuid: string
  product_id: number
  name: string
  description?: string
  price: number
  currency: string
  billing_type: 'onetime' | 'recurring'
  billing_period?: string
  points_amount: number
  status: string
  image_url?: string
  product_url?: string
}

export type ProductListResponse = {
  items: Product[]
  total: number
  page: number
  page_size: number
}

export const productsApi = {
  list: async (params: { billing_type?: string; status?: string; page?: number; page_size?: number } = {}) => {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') search.append(k, String(v))
    })
    const queryString = search.toString()
    const res = await apiClient.get<ProductListResponse>(`/api/v1/products${queryString ? `?${queryString}` : ''}`)
    // 后端可能返回 { data: ProductListResponse } 或直接返回 ProductListResponse
    return (res as any).data || res
  },
}

