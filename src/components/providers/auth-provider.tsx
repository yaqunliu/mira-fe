'use client'

import { useSupabaseAuth } from '@/hooks/use-supabase-auth'
import { useEffect } from 'react'

/**
 * 全局认证提供者
 * 确保 Supabase session 在所有页面加载时都被同步到 auth store
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 初始化 Supabase 认证，确保 session 同步到 auth store
  useSupabaseAuth()

  return <>{children}</>
}

