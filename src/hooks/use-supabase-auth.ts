'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { useQueryClient } from '@tanstack/react-query'
import { clearUserDataCache } from '@/lib/utils/clear-user-data'
import { authApi } from '@/lib/api/auth'
import type { User } from '@/types'
import { toast } from 'sonner'

export function useSupabaseAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const { login, logout: logoutStore } = useAuthStore()
  const queryClient = useQueryClient()

  const syncUserToBackend = useCallback(async (session: Session) => {
    try {
      // 从 JWT token 中解析数据
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))
      
      // 尝试同步到后端
      const syncResponse = await authApi.syncSupabaseUser(session.access_token)
      
      if (syncResponse.data) {
        const user: User = {
          id: syncResponse.data.user_id.toString(),
          email: syncResponse.data.email,
          username: syncResponse.data.username,
          avatar: syncResponse.data.avatar || '',
          createdAt: syncResponse.data.created_at || new Date().toISOString(),
          updatedAt: syncResponse.data.updated_at || new Date().toISOString(),
        }
        
        // 从 JWT token 中解析过期时间
        const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 3600
        
        login(user, session.access_token, expiresIn)
      }
    } catch (error) {
      // 即使同步失败，也使用 Supabase 用户信息
      if (session.user) {
        // 从 user_metadata 中提取头像，优先使用 avatar_url，其次使用 picture
        const userMetadata = session.user.user_metadata || {}
        const avatar = userMetadata.avatar_url || userMetadata.picture || ''
        
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.email?.split('@')[0] || 'user',
          avatar: avatar,
          createdAt: session.user.created_at || new Date().toISOString(),
          updatedAt: session.user.updated_at || new Date().toISOString(),
        }
        
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 3600
        
        login(user, session.access_token, expiresIn)
      }
    }
  }, [login])

  useEffect(() => {
    let mounted = true
    
    // 获取当前 session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return
      
      // 如果获取 session 时出错，但不影响继续处理
      if (error) {
        // 如果是 refresh_token_not_found 错误，说明没有有效的 refresh token
        // 这是正常的（用户未登录），不应该记录为错误
        if (error.code !== 'refresh_token_not_found') {
          console.warn('获取 session 时出错:', error)
        }
        setSession(null)
        setUser(null)
        if (mounted) {
          setLoading(false)
        }
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)

      // 如果有 session，先同步到后端和 store，然后再设置 loading 为 false
      if (session?.access_token) {
        try {
          await syncUserToBackend(session)
        } catch (error) {
          // 静默处理同步错误，不影响用户登录流程
        }
      }
      
      // 同步完成后再设置 loading 为 false
      if (mounted) {
        setLoading(false)
      }
    }).catch((error) => {
      // 捕获未预期的错误
      if (mounted) {
        console.warn('获取 session 时发生未预期的错误:', error)
        setSession(null)
        setUser(null)
        setLoading(false)
      }
    })

    // 监听 auth 状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session) {
        // 用户登录，同步到后端
        await syncUserToBackend(session)
      } else if (event === 'SIGNED_OUT') {
        // 用户登出，清空 store
        logoutStore()
        clearUserDataCache(queryClient)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token 刷新，更新 store
        await syncUserToBackend(session)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, syncUserToBackend, logoutStore, queryClient])

  const signOut = async () => {
    await supabase.auth.signOut()
    logoutStore()
    clearUserDataCache(queryClient)
    router.push('/zh')
  }

  return {
    user,
    session,
    loading,
    signOut,
  }
}

