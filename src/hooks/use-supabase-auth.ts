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
    console.log('[useSupabaseAuth] Syncing user to backend...', {
      hasAccessToken: !!session.access_token,
      userEmail: session.user?.email,
    })

    try {
      // 从 JWT token 中解析数据
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))

      // 尝试同步到后端
      const syncResponse = await authApi.syncSupabaseUser(session.access_token)

      console.log('[useSupabaseAuth] Backend sync response:', syncResponse)

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

        console.log('[useSupabaseAuth] Logging in user:', { user, expiresIn })
        login(user, session.access_token, expiresIn)
      }
    } catch (error) {
      console.error('[useSupabaseAuth] Backend sync failed:', error)

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

        console.log('[useSupabaseAuth] Using fallback Supabase user:', { user, expiresIn })
        login(user, session.access_token, expiresIn)
      }
    }
  }, [login])

  useEffect(() => {
    let mounted = true

    console.log('[useSupabaseAuth] Initializing auth...')
    console.log('[useSupabaseAuth] Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A')

    // 获取当前 session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return

      console.log('[useSupabaseAuth] Initial session check:', {
        hasSession: !!session,
        hasError: !!error,
        userEmail: session?.user?.email,
        hasAccessToken: !!session?.access_token,
        error: error?.message,
      })

      setSession(session)
      setUser(session?.user ?? null)

      // 如果有 session，先同步到后端和 store，然后再设置 loading 为 false
      if (session?.access_token) {
        try {
          await syncUserToBackend(session)
        } catch (error) {
          // 静默处理同步错误，不影响用户登录流程
          console.error('[useSupabaseAuth] Sync error during init:', error)
        }
      } else {
        // 如果没有 session，确保 loading 被设置为 false
        console.log('[useSupabaseAuth] No session found, setting loading to false')
      }

      // 同步完成后再设置 loading 为 false（无论是否有 session）
      if (mounted) {
        setLoading(false)
      }
    }).catch((error) => {
      // 如果 getSession 本身出错，也要设置 loading 为 false
      console.error('[useSupabaseAuth] Error getting session:', error)
      if (mounted) {
        setLoading(false)
      }
    })

    // 监听 auth 状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useSupabaseAuth] Auth state change:', {
        event,
        hasSession: !!session,
        userEmail: session?.user?.email,
      })

      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session) {
        // 用户登录，同步到后端
        await syncUserToBackend(session)
        // 确保 loading 状态更新
        setLoading(false)
        // 触发相关查询的刷新
        queryClient.invalidateQueries({ queryKey: ['novels'] })
        queryClient.invalidateQueries({ queryKey: ['creations'] })
        queryClient.invalidateQueries({ queryKey: ['points'] })
      } else if (event === 'SIGNED_OUT') {
        // 用户登出，清空 store
        console.log('[useSupabaseAuth] User signed out')
        logoutStore()
        clearUserDataCache(queryClient)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token 刷新，更新 store
        console.log('[useSupabaseAuth] Token refreshed')
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

