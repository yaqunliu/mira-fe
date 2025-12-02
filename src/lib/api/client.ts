import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types'

class ApiClient {
  private client: AxiosInstance
  private refreshTokenPromise: Promise<string> | null = null
  private isRefreshing = false

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // 请求拦截器 - 检查token并主动刷新，然后添加认证token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // 跳过刷新token请求本身，避免循环
        if (config.url?.includes('/auth/refresh') || config.headers['skip-auth']) {
          const token = useAuthStore.getState().token
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
          return config
        }

        const authStore = useAuthStore.getState()
        const token = authStore.token

        // 如果没有token，直接返回
        if (!token) {
          return config
        }

        // 检查token是否即将过期或已经过期（提前5分钟刷新）
        const { tokenExpiresAt } = authStore
        const shouldRefresh = 
          !tokenExpiresAt || // tokenExpiresAt 为 null，需要刷新
          tokenExpiresAt <= Date.now() || // token 已经过期
          authStore.isTokenExpiringSoon(300) // token 即将过期（5分钟内）

        if (shouldRefresh) {
          // 如果已经在刷新中，等待刷新完成
          if (this.isRefreshing && this.refreshTokenPromise) {
            try {
              const newToken = await this.refreshTokenPromise
              config.headers.Authorization = `Bearer ${newToken}`
              return config
            } catch (refreshError) {
              // 刷新失败，继续使用旧token（后续401会处理）
              config.headers.Authorization = `Bearer ${token}`
              return config
            }
          }

          // 如果还没有开始刷新，主动刷新token
          if (!this.isRefreshing) {
            this.isRefreshing = true
            this.refreshTokenPromise = this.handleRefreshToken()
              .then((newToken) => {
                authStore.updateToken(newToken)
                return newToken
              })
              .catch((error) => {
                // 刷新失败，清除状态
                this.isRefreshing = false
                this.refreshTokenPromise = null
                throw error
              })
              .finally(() => {
                this.isRefreshing = false
                this.refreshTokenPromise = null
              })

            try {
              const newToken = await this.refreshTokenPromise
              config.headers.Authorization = `Bearer ${newToken}`
              return config
            } catch (refreshError) {
              // 刷新失败，继续使用旧token（后续401会处理）
              config.headers.Authorization = `Bearer ${token}`
              return config
            }
          }
        }

        // token未过期或刷新中，使用当前token
        config.headers.Authorization = `Bearer ${token}`
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 响应拦截器 - 处理错误和自动刷新token
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        // 如果是刷新token的请求失败，直接登出
        if (error.config?.url?.includes('/auth/refresh')) {
          useAuthStore.getState().logout()
          const errorMessage = error.response?.data?.message || error.message || 'Token刷新失败'
          return Promise.reject(new Error(errorMessage))
        }

        // 如果是401错误且不是刷新token的请求，尝试刷新token
        if (error.response?.status === 401 && !originalRequest._retry) {
          // 如果已经在刷新中，等待刷新完成
          if (this.isRefreshing && this.refreshTokenPromise) {
            try {
              const newToken = await this.refreshTokenPromise
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              return this.client(originalRequest)
            } catch (refreshError) {
              return Promise.reject(refreshError)
            }
          }

          // 标记正在刷新，防止并发刷新
          originalRequest._retry = true
          this.isRefreshing = true

          try {
            // 创建刷新token的Promise
            this.refreshTokenPromise = this.handleRefreshToken()

            const newToken = await this.refreshTokenPromise

            // 更新token
            useAuthStore.getState().updateToken(newToken)

            // 使用新token重试原请求
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return this.client(originalRequest)
          } catch (refreshError) {
            // 刷新失败，清除状态并登出
            this.isRefreshing = false
            this.refreshTokenPromise = null
            useAuthStore.getState().logout()
            const errorMessage = refreshError instanceof Error ? refreshError.message : 'Token刷新失败'
            return Promise.reject(new Error(errorMessage))
          } finally {
            this.isRefreshing = false
            this.refreshTokenPromise = null
          }
        }

        // 其他错误正常处理
        const errorMessage = error.response?.data?.message || error.message || '服务异常'
        return Promise.reject(new Error(errorMessage))
      }
    )
  }

  /**
   * 处理刷新token的逻辑
   * 使用独立的axios实例避免循环调用拦截器
   */
  private async handleRefreshToken(): Promise<string> {
    // 创建一个独立的axios实例用于刷新token，避免触发拦截器
    const refreshClient = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 为刷新请求添加当前token（如果有的话）
    refreshClient.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    try {
      const response = await refreshClient.post<ApiResponse<{ access_token?: string; token?: string }>>(
        '/api/v1/auth/refresh'
      )

      // 根据API返回的字段名获取新token
      const newToken = response.data.data?.access_token || response.data.data?.token
      
      if (!newToken) {
        throw new Error('刷新token失败：未返回新token')
      }

      return newToken
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message || '刷新token失败'
        throw new Error(errorMessage)
      }
      throw error
    }
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
