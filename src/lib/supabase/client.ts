'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // 检查是否在客户端环境
          if (typeof document === 'undefined') {
            return []
          }
          return document.cookie.split('; ').map(cookie => {
            const [name, ...rest] = cookie.split('=')
            return { name, value: rest.join('=') }
          }).filter(cookie => cookie.name)
        },
        setAll(cookiesToSet) {
          // 检查是否在客户端环境
          if (typeof document === 'undefined' || typeof window === 'undefined') {
            return
          }
          cookiesToSet.forEach(({ name, value, options }) => {
            // 确保 cookie 的 domain 设置正确，使用当前页面的 hostname
            const domain = options?.domain || window.location.hostname
            const path = options?.path || '/'
            const sameSite = options?.sameSite || 'lax'
            const secure = options?.secure || window.location.protocol === 'https:'
            const maxAge = options?.maxAge
            const expires = options?.expires
            
            let cookieString = `${name}=${value}; path=${path}; domain=${domain}; SameSite=${sameSite}`
            if (secure) {
              cookieString += '; Secure'
            }
            if (maxAge !== undefined) {
              cookieString += `; Max-Age=${maxAge}`
            }
            if (expires) {
              cookieString += `; Expires=${expires.toUTCString()}`
            }
            
            document.cookie = cookieString
          })
        },
      },
    }
  )
}

