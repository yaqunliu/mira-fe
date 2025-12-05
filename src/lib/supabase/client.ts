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
            try {
              const path = options?.path || '/'
              const sameSite = options?.sameSite || 'lax'
              const secure = options?.secure ?? (window.location.protocol === 'https:')
              const maxAge = options?.maxAge
              const expires = options?.expires
              
              // 构建 cookie 字符串
              let cookieString = `${name}=${value}; path=${path}; SameSite=${sameSite}`
              
              // 只在明确指定 domain 且不是 localhost 时设置 domain
              // localhost 和 IP 地址不应该设置 domain
              if (options?.domain && 
                  options.domain !== 'localhost' && 
                  !/^\d+\.\d+\.\d+\.\d+$/.test(options.domain)) {
                cookieString += `; domain=${options.domain}`
              }
              
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
            } catch (error) {
              // 记录单个 cookie 设置失败，但不影响其他 cookie
              console.warn(`Failed to set cookie ${name}:`, error)
            }
          })
        },
      },
    }
  )
}

