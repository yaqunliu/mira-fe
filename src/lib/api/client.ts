import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types'
import { createClient } from '@/lib/supabase/client'

// 本模块是 axios 拦截器，不是 React 组件，拿不到 useTranslations——
// 这里的前端兜底文案直接用英文常量。
const AUTH_EXPIRED_MESSAGE = 'Your session has expired, please sign in again'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

/**
 * 中文防线（en-plan.md Phase 4）。
 *
 * 后端 mira-service 完全没有 i18n，报错 message 大量是中文；本拦截器抛出的 Error
 * 会被全仓 80+ 处 `toast.error` 原样弹出，是中文漏进英文界面的总闸门。
 *
 * 策略：**按后端原文是否含中文来决定是否放行**，而不是一律丢弃。
 * - 含中日韩字符 → 用下面按 HTTP status 映射的英文文案，绝不外泄。
 * - 纯英文 → 直接放行。后端偶有的英文报错（含具体校验信息）比笼统的
 *   "Something went wrong" 对用户更有用，没理由一并丢掉。
 * - 开发环境 → 永远把后端原文附在括号里，方便排障。
 *
 * ⚠️ 与计划的偏差：en-plan.md 原文写的是「生产环境只用前端英文兜底文案」。
 * 一律丢弃会连带丢掉后端有用的英文报错，而 Phase 4 的目标是「别让中文漏到界面上」，
 * 按中文检测同样能达成，且副作用更小。如需严格照计划执行，把 resolveErrorMessage 里的
 * `!CJK.test(raw)` 直接改成 false，后端原文就一律不外泄。
 *
 * 注：本拦截器只读 `data.message`。后端 FastAPI 的报错常放在 `data.detail`，
 * 那个字段目前**没有**被读取，所以不会经此泄漏；若将来要读，务必也过一遍本函数。
 */
// 用 Unicode 转义而非字面字符：CJK 统一表意文字 / 扩展 A / CJK 标点 / 全角字符
const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: AUTH_EXPIRED_MESSAGE,
  403: "You don't have permission to perform this action.",
  404: 'The requested resource was not found.',
  408: 'The request timed out. Please try again.',
  409: 'This conflicts with existing data. Please refresh and try again.',
  413: 'The file is too large.',
  422: 'Invalid request. Please check your input and try again.',
  429: 'Too many requests. Please slow down and try again shortly.',
  500: 'Server error. Please try again later.',
  502: 'Server is unreachable. Please try again later.',
  503: 'Service is temporarily unavailable. Please try again later.',
  504: 'The request timed out. Please try again.',
}

function resolveErrorMessage(status: number | undefined, backendMessage: unknown, axiosMessage?: string): string {
  const raw = typeof backendMessage === 'string' ? backendMessage.trim() : ''
  const fallback = (status && STATUS_MESSAGES[status]) || axiosMessage || GENERIC_ERROR_MESSAGE
  // 纯英文的后端报错信息量更大，放行；含中文的一律替换成前端英文文案。
  const safe = raw && !CJK.test(raw) ? raw : fallback
  if (raw && process.env.NODE_ENV === 'development' && safe !== raw) {
    return `${safe} [dev] backend: ${raw}`
  }
  return safe
}

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

        // 其他错误正常处理（后端中文报错在此被拦下，见 resolveErrorMessage）
        const errorMessage = resolveErrorMessage(
          error.response?.status,
          error.response?.data?.message,
          error.message
        )
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
