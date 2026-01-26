'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { useQueryClient } from '@tanstack/react-query'
import { clearUserDataCache } from '@/lib/utils/clear-user-data'
import { authApi } from '@/lib/api/auth'
import type { User } from '@/types'

interface GoogleSignInProps {
  locale?: string
}

export function GoogleSignIn({ locale = 'zh' }: GoogleSignInProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { login } = useAuthStore()
  const queryClient = useQueryClient()

  const clearSupabaseLocalAuth = () => {
    try {
      const keys = [
        'sb-auth-token',
        'supabase.auth.token',
      ]
      keys.forEach((k) => localStorage.removeItem(k))
      Object.keys(localStorage)
        .filter((k) => k.toLowerCase().includes('supabase'))
        .forEach((k) => localStorage.removeItem(k))
    } catch (err) {
      console.warn('清理本地 Supabase 会话失败（忽略）', err)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      // 清理可能损坏的本地会话，避免 atob 解码失败
      clearSupabaseLocalAuth()
      await supabase.auth.signOut().catch(() => {
        /* ignore signOut errors */
      })
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // v2.83 使用 implicit flow,直接重定向到 home 页面
          // Supabase 会自动检测 URL 中的 token 并设置 session
          redirectTo: `${window.location.origin}/${locale}/home`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Google 登录失败，请重试')
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full h-12 clay-sm hover:clay transition-all duration-300"
    >
      {loading ? (
        <span className="text-gray-600">登录中...</span>
      ) : (
        <>
          <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-gray-700 font-medium">使用 Google 登录</span>
        </>
      )}
    </Button>
  )
}

