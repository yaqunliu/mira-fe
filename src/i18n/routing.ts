import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // zh 保留在此以便将来重启中文（src/messages/zh.json 仍在仓库中），
  // 但因为 localeDetection: false，运行时不会被选中，对外只有英文。
  // 内部 QA 中文：把 localeDetection 改回 true，再手动设 NEXT_LOCALE=zh cookie。
  locales: ['en', 'zh'],
  defaultLocale: 'en',

  // URL 不带语言前缀：/home 而非 /en/home。
  // 中间件会把 /home rewrite 到内部的 /en/home，src/app/[locale]/ 目录结构不变。
  // ⚠️ 因此代码里不能再拼 `/${locale}/...`，那会变成 /en/en/... 而 404。
  localePrefix: 'never',

  // 不根据 accept-language / cookie 猜语言 —— 海外产品必须稳定给英文，
  // 否则中文浏览器会被自动切到 zh。
  localeDetection: false
});
