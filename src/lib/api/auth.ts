import { apiClient } from './client'
import type { User } from '@/types'
import type { LoginFormData, RegisterFormData } from '@/lib/validations/auth'

export const authApi = {
  // 登录
  login: async (data: LoginFormData) => {
    const formData = new URLSearchParams()
    formData.append('username', data.username)
    formData.append('password', data.password)
    
    return apiClient.post<{ access_token: string; token_type: string }>('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
  },

  // 注册
  register: async (data: RegisterFormData) => {
    return apiClient.post<{ user: User; token: string }>('/api/v1/auth/register', data)
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    return apiClient.get<User>('/api/v1/auth/me')
  },

  // 忘记密码
  forgotPassword: async (email: string) => {
    return apiClient.post('/api/v1/auth/forgot-password', { email })
  },

  // 重置密码
  resetPassword: async (token: string, password: string) => {
    return apiClient.post('/api/v1/auth/reset-password', { token, password })
  },

  // 同步 Supabase 用户到后端
  syncSupabaseUser: async (supabaseToken: string) => {
    return apiClient.post<{
      user_id: number
      username: string
      email: string
      avatar?: string
      created_at?: string
      updated_at?: string
    }>('/api/v1/auth/sync', {}, {
      headers: {
        'Authorization': `Bearer ${supabaseToken}`,
      },
    })
  },
}
