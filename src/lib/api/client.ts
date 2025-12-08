import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types'

class ApiClient {
  private client: AxiosInstance

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
        const originalRequest = error.config as InternalAxiosRequestConfig

        // 如果是401错误，直接登出（登录和注册请求的401错误除外）
        const isAuthRequest = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')
        
        if (error.response?.status === 401 && !isAuthRequest) {
          useAuthStore.getState().logout()
          const errorMessage = error.response?.data?.message || error.message || '认证失败，请重新登录'
          return Promise.reject(new Error(errorMessage))
        }

        // 其他错误正常处理
        const errorMessage = error.response?.data?.message || error.message || '服务异常'
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
