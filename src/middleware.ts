import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // 匹配除以下之外的全部路径：
  //   api      —— 交给 next.config.js 的 rewrites 代理到后端。
  //               ⚠️ 不排除的话，next-intl 会先给 /api/v1/* 加上 locale 前缀
  //               （307 → /zh/api/v1/*），而该路径不匹配 rewrite 规则，最终 404。
  //               中间件的执行顺序早于 afterFiles rewrites，所以必须在这里排除。
  //               本项目没有 src/app/api，/api 下的请求全部属于后端。
  //   _next    —— 构建产物
  //   _vercel  —— 平台内部路径
  //   *.*      —— 带扩展名的静态资源
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};