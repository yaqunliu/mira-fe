import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const locale = requestUrl.pathname.split('/')[1] || 'zh'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL(`/${locale}/auth/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }
  }

  // 重定向到主页
  return NextResponse.redirect(new URL(`/${locale}`, requestUrl.origin))
}

