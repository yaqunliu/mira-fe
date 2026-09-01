import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types'
import { createClient } from '@/lib/supabase/client'

// 本模块是 axios 拦截器，不是 React 组件，拿不到 useTranslations——
// 这两条前端自产的兜底文案直接用英文常量。
//
// ⚠️ 注意 errorMessage 仍会优先透出后端的 `message` 原文（可能是中文）。
// 把后端原文限制在开发环境、生产只用前端英文兜底，是 en-plan.md Phase 4 的工作，本轮不做。
const AUTH_EXPIRED_MESSAGE = 'Your session has expired, please sign in again'
const GENERIC_ERROR_MESSAGE = 'Service error'

class ApiClient {
  private client: AxiosInstance
  private isRefreshing = false
  private refreshSubscribers: Array<(token: string) => void> = []

  constructor() {
    // 如果设置了完整的 API URL（不以 / 开头），直接使用
    // 否则使用空字符串，让 Next.js rewrites 处理代理
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const baseURL = apiUrl && !apiUrl.startsWith('/') ? apiUrl : '';

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token))
    this.refreshSubscribers = []
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback)
  }

  private setupInterceptors() {
    // 请求拦截器 - 添加认证token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // 如果设置了 skip-auth，跳过认证
        if (config.headers['skip-auth']) {
          return config
        }

        const authStore = useAuthStore.getState()
        const token = authStore.token

        // 如果有token，添加到请求头
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器 - 处理错误
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        // 如果是401错误
        const isAuthRequest = originalRequest.url?.includes('/auth/login') ||
                             originalRequest.url?.includes('/auth/register') ||
                             originalRequest.url?.includes('/auth/sync-supabase-user')

        if (error.response?.status === 401 && !isAuthRequest && !originalRequest._retry) {
          if (this.isRefreshing) {
            // 如果正在刷新，将请求加入队列
            return new Promise((resolve) => {
              this.addRefreshSubscriber((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`
                resolve(this.client(originalRequest))
              })
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            // 尝试刷新 token
            const supabase = createClient()
            const { data, error: refreshError } = await supabase.auth.refreshSession()

            if (data.session?.access_token) {
              // 刷新成功
              const payload = JSON.parse(atob(data.session.access_token.split('.')[1]))
              const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 3600

              // 更新 store 中的 token
              useAuthStore.getState().updateToken(data.session.access_token, expiresIn)

              // 更新原请求的 Authorization header
              originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`

              // 通知所有等待的请求
              this.onRefreshed(data.session.access_token)

              // 重试原请求
              return this.client(originalRequest)
            } else {
              // 刷新失败，登出用户
              console.error('[ApiClient] Token refresh failed:', refreshError)
              useAuthStore.getState().logout()
              return Promise.reject(new Error(AUTH_EXPIRED_MESSAGE))
            }
          } catch (refreshError) {
            console.error('[ApiClient] Token refresh error:', refreshError)
            useAuthStore.getState().logout()
            return Promise.reject(new Error(AUTH_EXPIRED_MESSAGE))
          } finally {
            this.isRefreshing = false
          }
        }

        // 其他错误正常处理
        const errorMessage = error.response?.data?.message || error.message || GENERIC_ERROR_MESSAGE
        return Promise.reject(new Error(errorMessage))
      }
    )
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config)
    return response.data
  }

  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  }
}

export const apiClient = new ApiClient()
