import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // 排除 auth/callback 路由,让 Route Handler 直接处理
  const pathname = request.nextUrl.pathname;
  if (pathname.includes('/auth/callback')) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // 匹配除静态资源外的全部路径
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
};