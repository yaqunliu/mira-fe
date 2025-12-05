import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, {
                  ...options,
                  // 确保 cookie 设置正确
                  httpOnly: options?.httpOnly ?? true,
                  sameSite: options?.sameSite ?? 'lax',
                  secure: options?.secure ?? process.env.NODE_ENV === 'production',
                })
              } catch (err) {
                // 记录单个 cookie 设置失败，但不影响其他 cookie
                console.warn(`Failed to set cookie ${name}:`, err)
              }
            })
          } catch (err) {
            // 记录错误，但不抛出异常，避免影响认证流程
            console.warn('Error setting cookies:', err)
          }
        },
      },
    }
  )
}

