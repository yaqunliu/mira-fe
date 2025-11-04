import { apiClient } from './client'
import type { User } from '@/types'
import type { LoginFormData, RegisterFormData } from '@/lib/validations/auth'

export const authApi = {
  // 登录
  login: async (data: LoginFormData) => {
    return apiClient.post<{ user: User; token: string }>('/auth/login', data)
  },

  // 注册
  register: async (data: RegisterFormData) => {
    return apiClient.post<{ user: User; token: string }>('/auth/register', data)
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    return apiClient.get<User>('/auth/me')
  },

  // 刷新token
  refreshToken: async () => {
    return apiClient.post<{ token: string }>('/auth/refresh')
  },

  // 登出
  logout: async () => {
    return apiClient.post('/auth/logout')
  },

  // 忘记密码
  forgotPassword: async (email: string) => {
    return apiClient.post('/auth/forgot-password', { email })
  },

  // 重置密码
  resetPassword: async (token: string, password: string) => {
    return apiClient.post('/auth/reset-password', { token, password })
  },
}
