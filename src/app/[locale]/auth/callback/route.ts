import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const locale = requestUrl.pathname.split('/')[1] || 'zh'

  console.log('[Auth Callback] URL:', requestUrl.href)
  console.log('[Auth Callback] Code:', code ? 'present' : 'missing')

  const cookieStore = await cookies()
  const response = NextResponse.redirect(new URL(`/${locale}`, requestUrl.origin))

  // 创建 Supabase 客户端,使用 NextResponse 来正确设置 cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Exchange error:', {
        message: error.message,
        status: error.status,
        code: error.code
      })

      // 如果是 refresh_token_not_found 错误，可能是 code 已经被使用过
      if (error.message?.includes('refresh_token_not_found') || error.code === 'refresh_token_not_found') {
        const { data: { session } } = await supabase.auth.getSession()

        // 如果已经有 session，说明认证成功，直接重定向
        if (session) {
          console.log('[Auth Callback] Session exists, redirecting to home')
          return response
        }

        // 如果没有 session，可能是 code 已过期或被使用
        console.warn('[Auth Callback] Code used/expired, no session found')
        return NextResponse.redirect(
          new URL(`/${locale}/auth/login?error=${encodeURIComponent('登录已过期，请重新登录')}`, requestUrl.origin)
        )
      }

      // 其他错误，重定向到登录页
      return NextResponse.redirect(
        new URL(`/${locale}/auth/login?error=${encodeURIComponent(error.message || '登录失败')}`, requestUrl.origin)
      )
    }

    // 验证 session 是否成功创建
    if (data.session) {
      console.log('[Auth Callback] Session created successfully:', {
        userId: data.session.user.id,
        email: data.session.user.email
      })
    } else {
      console.warn('[Auth Callback] No session in exchange response')
    }
  } else {
    // 如果没有 code，重定向到登录页
    console.warn('[Auth Callback] No code parameter found')
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, requestUrl.origin))
  }

  // 重定向到主页
  console.log('[Auth Callback] Redirecting to home')
  return response
}

