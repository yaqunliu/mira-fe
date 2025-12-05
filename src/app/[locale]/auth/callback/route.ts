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
      // 如果是 refresh_token_not_found 错误，可能是 code 已经被使用过
      // 检查是否已经有有效的 session
      if (error.message?.includes('refresh_token_not_found') || error.code === 'refresh_token_not_found') {
        const { data: { session } } = await supabase.auth.getSession()
        
        // 如果已经有 session，说明认证成功，直接重定向
        if (session) {
          return NextResponse.redirect(new URL(`/${locale}`, requestUrl.origin))
        }
        
        // 如果没有 session，可能是 code 已过期或被使用，重定向到登录页
        console.warn('OAuth code 可能已被使用或已过期，但未找到有效 session')
        return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent('登录已过期，请重新登录')}`, requestUrl.origin))
      }
      
      // 其他错误，记录并重定向到登录页
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent(error.message || '登录失败')}`, requestUrl.origin))
    }

    // 如果成功但没有 session，也检查一下
    if (!data.session) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('Code 交换成功但未获取到 session')
        return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent('登录失败，请重试')}`, requestUrl.origin))
      }
    }
  } else {
    // 如果没有 code，检查是否已经有 session（可能是直接访问回调页面）
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, requestUrl.origin))
    }
  }

  // 重定向到主页
  return NextResponse.redirect(new URL(`/${locale}`, requestUrl.origin))
}

