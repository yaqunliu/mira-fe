import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);
export const config = {
  // 匹配除静态资源外的全部路径
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
};