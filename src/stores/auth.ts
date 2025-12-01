import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { usePointsStore } from './points'

interface AuthState {
  user: User | null
  token: string | null
  tokenExpiresAt: number | null // token 过期时间戳（毫秒）
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string, expiresIn?: number) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateUser: (user: Partial<User>) => void
  updateToken: (token: string, expiresIn?: number) => void
  isTokenExpiringSoon: (bufferSeconds?: number) => boolean // 检查 token 是否即将过期
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: {
        id: 'fdajls',
        email: 'qq@qq.com',
        username: 'qq',
        avatar: '',
        createdAt: '',
        updatedAt: '',
      },
      token: null,
      tokenExpiresAt: null,
      isAuthenticated: true,
      isLoading: false,
      
      login: (user: User, token: string, expiresIn?: number) => {
        // 登录前清空其他 store 的数据，确保新用户数据干净
        usePointsStore.getState().clearBalance()
        
        // 如果提供了 expiresIn（秒），计算过期时间戳
        // 如果没有提供，尝试从 JWT token 中解析
        let expiresAt: number | null = null
        if (expiresIn) {
          expiresAt = Date.now() + expiresIn * 1000
        } else if (token) {
          // 尝试从 JWT 中解析过期时间
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            if (payload.exp) {
              expiresAt = payload.exp * 1000 // JWT exp 是秒，转换为毫秒
            }
          } catch {
            // 如果不是 JWT 格式，使用默认过期时间（1小时）
            expiresAt = Date.now() + 60 * 60 * 1000
          }
        }
        
        set({
          user,
          token,
          tokenExpiresAt: expiresAt,
          isAuthenticated: true,
          isLoading: false,
        })
      },
      
      logout: () => {
        // 退出登录时清空其他 store 的数据
        usePointsStore.getState().clearBalance()
        
        set({
          user: null,
          token: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          })
        }
      },
      
      updateToken: (token: string, expiresIn?: number) => {
        // 如果提供了 expiresIn（秒），计算过期时间戳
        // 如果没有提供，尝试从 JWT token 中解析
        let expiresAt: number | null = null
        if (expiresIn) {
          expiresAt = Date.now() + expiresIn * 1000
        } else if (token) {
          // 尝试从 JWT 中解析过期时间
          try {
            const payload = JSON.parse(atob(token.split('.')[1]))
            if (payload.exp) {
              expiresAt = payload.exp * 1000 // JWT exp 是秒，转换为毫秒
            }
          } catch {
            // 如果不是 JWT 格式，使用默认过期时间（1小时）
            expiresAt = Date.now() + 60 * 60 * 1000
          }
        }
        
        set({ token, tokenExpiresAt: expiresAt })
      },
      
      isTokenExpiringSoon: (bufferSeconds = 300) => {
        // 默认提前 5 分钟（300秒）刷新
        const { tokenExpiresAt } = get()
        if (!tokenExpiresAt) return false
        const now = Date.now()
        const buffer = bufferSeconds * 1000
        return tokenExpiresAt - now <= buffer
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
