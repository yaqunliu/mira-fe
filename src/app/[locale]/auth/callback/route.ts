import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const locale = requestUrl.pathname.split('/')[1] || 'zh'

  const supabase = await createClient()

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // 处理 flow_state_not_found 错误（OAuth state 丢失或过期）
      if (error.code === 'flow_state_not_found' || error.message?.includes('flow state')) {
        console.warn('OAuth flow state 未找到，可能是 state 已过期或丢失')
        // 检查是否已经有有效的 session
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // 如果已经有 session，说明认证可能已经成功，直接重定向
            return NextResponse.redirect(new URL(`/${locale}`, requestUrl.origin))
          }
        } catch (sessionError) {
          // 忽略 getSession 的错误，继续处理
        }
        // 如果没有 session，重定向到登录页
        return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent('登录流程已过期，请重新登录')}`, requestUrl.origin))
      }
      
      // 处理 refresh_token_not_found 错误（code 已被使用或过期）
      if (error.code === 'refresh_token_not_found' || error.message?.includes('refresh_token_not_found')) {
        console.warn('Refresh token 未找到，可能是 code 已被使用或已过期')
        // 检查是否已经有有效的 session
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // 如果已经有 session，说明认证成功，直接重定向
            return NextResponse.redirect(new URL(`/${locale}`, requestUrl.origin))
          }
        } catch (sessionError) {
          // 忽略 getSession 的错误，继续处理
        }
        // 如果没有 session，重定向到登录页
        return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent('登录已过期，请重新登录')}`, requestUrl.origin))
      }
      
      // 其他错误，记录并重定向到登录页
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent(error.message || '登录失败')}`, requestUrl.origin))
    }

    // 如果成功但没有 session，也检查一下
    if (!data.session) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.warn('Code 交换成功但未获取到 session')
          return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent('登录失败，请重试')}`, requestUrl.origin))
        }
      } catch (sessionError) {
        // 如果 getSession 失败，可能是 refresh token 问题，但不影响已成功的认证
        // 直接重定向，让客户端处理
        console.warn('获取 session 时出错，但 code 交换已成功:', sessionError)
      }
    }
  } else {
    // 如果没有 code，检查是否已经有 session（可能是直接访问回调页面）
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return NextResponse.redirect(new URL(`/${locale}/auth/login`, requestUrl.origin))
      }
    } catch (sessionError) {
      // 如果 getSession 失败，重定向到登录页
      console.warn('获取 session 时出错:', sessionError)
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, requestUrl.origin))
    }
  }

  // 重定向到主页
  return NextResponse.redirect(new URL(`/${locale}`, requestUrl.origin))
}

