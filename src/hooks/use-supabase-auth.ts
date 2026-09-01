'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback, useRef } from 'react'
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
  const syncingRef = useRef<boolean>(false)
  const syncedSessionRef = useRef<string | null>(null)

  const syncUserToBackend = useCallback(async (session: Session) => {
    // Prevent duplicate sync calls for the same session
    if (syncingRef.current || syncedSessionRef.current === session.access_token) {
      return
    }

    syncingRef.current = true

    try {
      // 从 JWT token 中解析数据
      const payload = JSON.parse(atob(session.access_token.split('.')[1]))
      const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 3600

      // First, set the token in the store immediately
      // This ensures API calls can use the token right away
      const authStore = useAuthStore.getState()
      authStore.updateToken(session.access_token, expiresIn)

      // Then sync to backend
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

        login(user, session.access_token, expiresIn)
        syncedSessionRef.current = session.access_token
      }
    } catch (error) {
      console.error('[useSupabaseAuth] Backend sync failed:', error)

      // 即使同步失败，也使用 Supabase 用户信息
      if (session.user) {
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
        syncedSessionRef.current = session.access_token
      }
    } finally {
      syncingRef.current = false
    }
  }, [login])

  useEffect(() => {
    let mounted = true

    // 获取当前 session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      // 如果有 session，先同步到后端和 store，然后再设置 loading 为 false
      if (session?.access_token) {
        try {
          await syncUserToBackend(session)
        } catch (error) {
          console.error('[useSupabaseAuth] Sync error during init:', error)
        }
      }

      if (mounted) {
        setLoading(false)
      }
    }).catch((error) => {
      console.error('[useSupabaseAuth] Error getting session:', error)
      if (mounted) {
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
        await syncUserToBackend(session)
      } else if (event === 'SIGNED_OUT') {
        logoutStore()
        clearUserDataCache(queryClient)
      } else if (event === 'TOKEN_REFRESHED' && session) {
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
    router.push('/')
  }

  return {
    user,
    session,
    loading,
    signOut,
  }
}

