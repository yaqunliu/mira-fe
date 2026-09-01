# mira-fe 英文可交付改造计划

## Context

`mira-fe` 面向海外客户交付,但当前默认语言是中文:`src/i18n/routing.ts:4-5` 配置 `locales: ['zh','en']` / `defaultLocale: 'zh'`,URL 形如 `/zh/home`,访问 `/` 会跳到 `/zh`。

更关键的是,**把 `defaultLocale` 改成 `en`并不会让应用变成英文**。实测统计:

| 项 | 现状 |
|---|---|
| 使用 `useTranslations` 的文件 | 56 / 205 |
| 仍硬编码中文的文件 | **109**,去重后 **1646 条**用户可见字符串 |
| `en.json` 缺失的 key | 20 个(会渲染成裸 key 路径) |
| 手工拼接 `` `/${locale}/…` `` | 126 处 / 39 文件 |
| 微信支付专用路由 | `src/app/[locale]/payment/wechat/`(~320 行,全中文) |
| 后端 Chinese 直出前端的位置 | `src/lib/api/client.ts:125` 把后端 `message` 原文 toast |

`en.json` 本身是**真翻译过的**(988 条中仅 1 条中文,是语言选择器的 `"zh": "中文"` 标签),所以已 i18n 的那 56 个文件英文可用;问题全在剩下那一半。

**本次目标**:URL 去掉语言前缀(`/home`、`/pricing`),默认且实际只对外提供英文;`zh.json` 保留在仓库但不暴露入口;移除微信支付页;所有硬编码中文抽成 key 进 `en.json`。

**范围边界**:本轮**只改前端**。后端 `mira-service` 完全没有 i18n(无 `Accept-Language` 处理)、40 份 LLM prompt 全中文(`app/prompt/agent_video_prompt_gen.md:125` 明写「必须使用中文」)、54 个文件的报错 `detail` 是中文。因此本轮交付的是**英文 UI 外壳**;AI 生成的剧本/角色/旁白仍会是中文。后端待办在最后一节列清单,不执行。TTS 音色按决定暂不动(仍固定 `language: "zh"`)。

---

## Phase 0 — 基线闸门与 key 对齐

**新增 `scripts/check-i18n.mjs`**:扫描 `src/`(排除 `src/messages`、`src/mock`),报告字符串字面量与 JSX 文本中的残留中文,按文件排序输出计数,有残留则非 0 退出。同时校验 `en.json` / `zh.json` 的 key 集合一致。在 `package.json` 加 `"check:i18n": "node scripts/check-i18n.mjs"`。

这是后续每个批次的验收标准,也是唯一能证明「抽干净了」的手段。**必须先做**。

**白名单**(脚本需跳过,否则永远报红):
- 数据契约中的中文键 —— `narration: { 角色: string; 内容: string }`,见 `src/types/index.ts:58,71,262-263`、`src/types/scene.ts:21-22`、`src/components/agent/shot-detail-dialog.tsx:140,149,180-190`、`src/components/modals/storyboard-edit-modal.tsx:135`。这是后端 LLM 输出的 JSON 字段名,**不能翻译**,只能等后端改契约。
- 注释、`console.*`、`src/mock/`、`tests/mocks/api-mock.ts` 的 fixture 数据。

**补齐 key**:
- 向 `en.json` 补 20 个缺失 key:`Editor.{generate,generationStarted,regenerating,previousShot,nextShot}`、`createVideo.{selectProject,createProject,addChapter}`、`novel.{typeAll,typeNovel,typeScript,searchPlaceholder}`、`novelDetail.{editTitle,save,cancel,editNovelTitle,editChapterTitle,updateSuccess,updateFailed,preview}`
- 向 `zh.json` 补 3 个:`novel.noNovelsDescription`、`novel.totalNovels`、`sidebar.novels`

---

## Phase 1 — 路由:英文默认 + 去掉语言前缀

### `src/i18n/routing.ts`(核心两行变四行)

```ts
export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'never',
  localeDetection: false,
});
```

已确认 next-intl 4.3.12 支持这三个选项(`node_modules/next-intl/dist/types/routing/config.d.ts`)。

**机制与后果**(必须理解,否则 Phase 1 会到处 404):
- 中间件把 `/home` **rewrite**(非 redirect)到内部 `/en/home`,`src/app/[locale]/` 目录结构**不动**,`params.locale` 仍返回 `'en'`。
- 外部访问 `/en/home` 会被再加一层前缀变成 `/en/en/home` → **404**。所以 126 处 `` `/${locale}/…` `` 必须全部去前缀。
- `localeDetection: false` 让 `accept-language` 和 cookie 都不参与判定 —— 中国大陆浏览器也稳定拿到英文。代价是 `zh` 在运行时**不可达**(`zh.json` 作为休眠文件保留)。若需内部 QA 中文,改回 `localeDetection: true` 并手动设 `NEXT_LOCALE=zh` cookie 即可,无需其他改动。
- `/zh/*` 老链接会 404。若有对外散出的中文链接,在 `next.config.js` 加一条 `redirects()`:`/zh/:path*` → `/:path*`。

### 去前缀改造(39 文件 / 126 处)

统一规则:`` router.push(`/${locale}/home`) `` → `router.push('/home')`,`` href={`/${locale}/x`} `` → `href="/x"`,`window.open` / `router.replace` / `window.location.href` 同理。

**pathname 比较的 6 处要特殊处理** —— 因为中间件是 rewrite,`next/navigation` 的 `usePathname()` 在服务端渲染时可能返回改写后的内部路径。这些位置改用 next-intl 的 `usePathname`(它保证返回去前缀路径):

```ts
import { usePathname } from '@/i18n/navigation'   // 该文件目前 0 引用,终于用上
```

涉及 `src/components/business/sidebar-wrapper.tsx:8`、`src/components/business/app-sidebar.tsx:143-144`、`src/app/[locale]/workspace/page.tsx:63,82`、`src/app/[locale]/create/page.tsx:322,362`、`src/components/agent/mode-switcher.tsx:26,101`、`src/components/shared/editor-toolbar.tsx:204`。

普通 `href` / `router.push` 保持用 `next/link` / `next/navigation` 即可 —— 无前缀场景下它们本来就正确。

### 清掉 zh 残留(约 20 处)

- **8 处 `params.locale || 'zh'`** → 直接删掉整个 locale 变量:`payment/success/page.tsx:22`、`payment/cancel/page.tsx:14`、`subscriptions/page.tsx:184`、`points/page.tsx:36`、`pricing/page.tsx:138`、`components/business/app-sidebar.tsx:55`(`payment/wechat/page.tsx:18` 随 Phase 2 删除)
- **4 处从 pathname 解析 locale** → 删除:`dynamic-comic-editor/page.tsx:2563`、`mode-switcher.tsx:26,101`、`editor-toolbar.tsx:204`
- **5 个 auth 组件的 `locale = 'zh'` prop 默认值** → 删除 prop,redirect URL 写成无前缀:`email-sign-in.tsx:39`、`email-register.tsx:31`、`google-sign-in.tsx:18`、`reset-password.tsx:30`、`forgot-password.tsx:25`。对应 redirect:`google-sign-in.tsx:53` → `${origin}/home`,`forgot-password.tsx:42` → `${origin}/auth/reset-password`
- **`src/hooks/use-supabase-auth.ts:143`** `router.push('/zh')` → `router.push('/')`(全仓唯一真硬编码 `/zh`)
- **9 处 `toLocaleDateString('zh-CN', …)`** → `'en-US'`:`src/lib/utils.ts:35`、`subscriptions/page.tsx:28`、`scripts/page.tsx:36`、`chat-message-item.tsx:147,154`、`timeline/{scene,character,shot}-image-history-dialog.tsx:109/109/112`、`timeline/export-preview-dialog.tsx:64`

### 语言切换器与死代码

- 删 `src/components/business/language-toggle.tsx` 及 `app-sidebar.tsx:35,503` 的引用(唯一使用点)
- 删 `src/stores/ui.ts` 的 `language` 字段(`:6,9,16,26,32`) —— 全仓 0 个读取方,是残留状态
- 删 `src/app/[locale]/debug-auth/` —— 公开可路由的调试页,`:65` 直接 dump `localStorage` 的 `auth-storage`,不该上线
- 修 `src/components/auth/email-register.tsx:75` 的 `emailRedirectTo` → `/auth/callback`,但 `src/app/[locale]/auth/` 下**没有 `callback/` 目录**,注册确认邮件的链接是 404。改指向已存在的 `/auth/confirm`

### 元数据(英文交付必需)

全仓**没有任何** `generateMetadata` 或 `export const metadata`,`src/app/[locale]/layout.tsx` 只有 `:29` 一个 favicon link —— 浏览器标签页无标题、无 description、无 OG。海外站这是硬伤。

在 `src/app/[locale]/layout.tsx` 加:

```ts
export const metadata: Metadata = {
  title: { default: '…', template: '%s · …' },
  description: '…',
  openGraph: { locale: 'en_US', type: 'website', … },
};
```

同时 `:35` 的 `<NextIntlClientProvider messages={messages}>` 补上 `locale={locale}`(现在靠 server context 隐式传递,是脆弱写法)。

另外 `src/app/` 下**没有根 layout,也没有 `not-found.tsx`** —— `layout.tsx:23` 的 `notFound()` 没有承接页面,会渲染到 `<html>` 之外。新增 `src/app/not-found.tsx`(需自带 `<html>`/`<body>`,因为没有根 layout)。

`src/app/[locale]/page.tsx:6` 的 `redirect(`/${locale}/home`)` → `redirect('/home')`。

`src/middleware.ts:7-12` 的注释解释了为什么必须排除 `/api`(中间件早于 `afterFiles` rewrites,否则 `/api/v1/*` 会被 307 到 `/zh/api/v1/*` 而 404)—— 逻辑依然成立,但注释里的 `/zh` 举例要更新为 `/en`。matcher 不动。

---

## Phase 2 — 移除微信支付

- 删整个 `src/app/[locale]/payment/wechat/` 目录
- 删 `public/wechat-pay-{button-label,green-logo,instruction,logo,tab-label}.png`(5 个)
- 卸 `qrcode` + `@types/qrcode`(`package.json:52,71`) —— 全仓唯一引用方就是被删的那个页面
- **`src/app/[locale]/pricing/page.tsx:144-145`**:`const language = locale === 'zh' ? 'zh' : 'en'` → 固定 `'en'`。这个值传给 `productsApi.list({ language })`(`:149,154`),后端商品目录按语言分区且该字段必填(`src/lib/api/products.ts:27`),`'en'` 天然全部走 Creem
- **`pricing/page.tsx:212-219`**:删掉 `payment_method === 'wechat'` 分支,只留 Creem 的 `window.location.href = checkout_url`。若后端意外返回 `wechat`,给一条英文错误提示而不是静默
- **`src/app/[locale]/subscriptions/page.tsx`**:移除微信特判 —— `:60-63` 的 `isManualRenewal` 去掉 `payment_method === 'wechat'`,以及 `:116,155,166` 的相关分支
- `src/lib/api/orders.ts:14` 的 `payment_method: 'creem' | 'wechat'` 类型**保留**(后端契约仍可能返回),只是前端不再处理
- `pricing/page.tsx:21-29` 的兜底商品目录:`currency` 已是 `'USD'`,但商品名是中文(`'8000 积分'`、`'月付 · 20000积分/月'` 等),产品 API 失败时会原样渲染 → 改英文
- 三份重复的 `formatPrice`(`pricing/page.tsx:32-40`、`subscriptions/page.tsx:14-21`、`payment/success/page.tsx:167-171`)默认已是 USD,不动;顺手把 `payment/wechat` 那份随目录删除。是否合并这三份重复实现属可选清理

> 注:全仓**没有**支付宝/银联、没有手机号登录、没有 ICP/备案文本、没有微博/抖音等中国社交链接 —— 这些都不用处理。
> `terms/page.tsx` 和 `privacy/page.tsx` 已各有**完整英文分支**(`:30` 处 `locale === 'zh' ?` 三元),Phase 1 去掉 locale 后直接保留英文分支即可,**不需要重写法务文案**。但两份英文文本都没有 GDPR/CCPA 条款、无 cookie 同意、年龄门槛写的是 13 岁(GDPR 部分成员国要求 16)—— 这是**法务待办,不在工程范围**,需提示业务方。

---

## Phase 3 — 文案抽取(主体工作量:1646 条 / 109 文件)

### 约定

- **沿用现有 26 个顶层命名空间**(`common`、`auth`、`home`、`homePage`、`createVideo`、`scene`、`character`、`user`、`novelDetail`、`novel`、`creation`、`video`、`storyboard`、`navigation`、`errors`、`language`、`points`、`pricing`、`payment`、`sidebar`、`subscriptions`、`Editor`、`Timeline`、`createDynamicComic`、`agentCreation`、`createAgent`);确实无处归属的再开新命名空间
- 优先 `useTranslations('namespace')` 的带命名空间写法(现有 35 处)而非根作用域 `useTranslations()`(现有 28 处);顺手修掉 `src/components/business/create-settings/story-setting.tsx:34` 的 `useTranslations("")`
- **key 同时写入 `en.json`(英文译文)和 `zh.json`(原中文)**。中文原文就在手边,同步成本几乎为零,能让休眠的 `zh.json` 保持完整,将来重启中文零返工
- `src/app/[locale]/dynamic-comic-editor/page.tsx:62` 有一份内嵌的中文 `fallbackMessages` 字典(约 60 条),且 `:11` 在 `'use client'` 页面里又套了一层 `NextIntlClientProvider`(外层 layout 已有)。这份兜底字典**整体删除**,依赖正常的 `en.json`
- **不动**数据契约中文键(见 Phase 0 白名单)。若某处把 `角色`/`内容` 当**界面标签**渲染,加一层 `{ 角色: t('...'), 内容: t('...') }` 的展示映射,数据字段名保持不变

### 批次(每批一个 commit,收尾跑 `pnpm check:i18n`)

| 批次 | 范围 | 文件 | 字符串 |
|---|---|---|---|
| 3a | `components/ui` + `components/shared` + `components/auth` | 12 | 131 |
| 3b | `components/business` | 18 | 299 |
| 3c | `components/modals` + `components/timeline` | 14 | 296 |
| 3d | `components/agent` | 22 | 287 |
| 3e | `components/v2` | 2 | 66 |
| 3f | `app/[locale]` 各页面 | 24 | 461 |
| 3g | `lib/` + `hooks/` + `stores/` + `types/` | 14 | ~106 |

先做 3a(共享组件,改一处收益覆盖全站),最后做 3f(页面文案最多但彼此独立,可并行/分人)。

单文件最重的几个,建议单独开 commit:`dynamic-comic-editor/page.tsx`(135)、`agent/shot-detail-dialog.tsx`(56)、`v2/video-generation.tsx`(52)、`create-settings/character-setting.tsx`(46)、`modals/shot-edit-modal.tsx`(44)。

---

## Phase 4 — 前端侧的中文防线(应对后端仍返回中文)

后端本轮不改,但必须让中文**不至于漏到英文界面上**。

- **`src/lib/api/client.ts:125`** 是总闸门:`error.response?.data?.message || error.message || '服务异常'`。后端任何 `message` 都会被 83 处 `toast.error` 原文抛出。改为:**生产环境只用前端英文兜底文案**(可按 HTTP status / 业务 code 映射),后端原文仅在 `process.env.NODE_ENV === 'development'` 时附加显示。这是本轮能给出的最强隔离
- `client.ts:113,118` 的 `new Error('认证已过期，请重新登录')` → `t`/英文常量
- **Chinese 枚举标签映射**(纯前端,但绕过了 next-intl,**今天在 `/en` 上就渲染中文**):
  - `src/types/creation.ts:18-41` `CreationStatusMap` —— 8 个进行中状态都是 `"进行中"`,`COMPLETED`→`"已完成"`,`FAILED`→`"出错了"`。消费方 `app/[locale]/creations/page.tsx:14`、`components/business/creation-overview.tsx:12,48`
  - `src/components/agent/agent-sidebar.tsx:152-161` `getStatusText()`
  - `src/app/[locale]/subscriptions/page.tsx:39-47` 的 `t(..., { default: '活跃' | '逾期' | … })` 中文 default
  - `src/components/timeline/export-trigger-dialog.tsx:104,190` `getStatusText()`
- `src/lib/agent/form-configs.ts` —— agent 动态表单的 `title`/`description`/`label` 全中文(27 行),这些是 agent 请求配置时展示给用户的表单标签
- `src/hooks/use-agent-chat.ts` 大量 `agent 返回值 || '中文兜底'`(`:260,266,273,276,282`)与中文 toast(`:520,575,731,767,776,779,809,812`)→ 兜底改英文 key。注意:兜底改了,但 agent **真返回**中文时仍会显示中文 —— 这是后端问题,前端无解
- `src/app/[locale]/auth/register/page.tsx:51` 与 `components/auth/email-register.tsx:88`:把中文 `'请检查您的邮箱以验证账户'` **编码进 URL query** 再渲染。改为传 message code,由目标页 `t()` 渲染

---

## Phase 5 — 测试与验收

### 测试改造(必做,否则全红)

`tests/e2e/` 6 个 spec 里**47 处 `page.goto('/zh/…')`**,`localePrefix: 'never'` 之后全部 404:
- `compatibility.spec.ts:17,25,38,50,61,69,86,111,119,127,135,143,151`(13)
- `sse-events.spec.ts:21,38,53,68,81,101,114,128,148,156`(10)
- `board-linkage.spec.ts:15,37,59,80,95,113`(6)
- `performance.spec.ts:15,42,69,93,105,139`(6)
- `mode-switch.spec.ts:16,38,60,77,94,110`(6)
- `agent-creation-flow.spec.ts`(6)

统一去掉 `/zh` 前缀。`playwright.config.ts:31` 的 `baseURL: 'http://localhost:3001'` 不含 locale 段,不用改。注意 `:44-65` 配了 5 个 project,每条 goto 跑 5 遍。

**7 处中文断言**改英文(需与 Phase 3 抽取后的 `en.json` 实际文案对齐):`mode-switch.spec.ts:101,104,105,106,122`、`compatibility.spec.ts:33`、`agent-creation-flow.spec.ts:119`。

### 验收

```bash
pnpm check:i18n          # Phase 0 的闸门:残留中文应为 0(白名单外)
pnpm type-check          # 必跑 —— next.config.js:9 有 typescript.ignoreBuildErrors:true,
                         # build 不会因类型错误失败,去前缀改造的类型问题只有这里能抓到
pnpm build
pnpm test                # Playwright,5 个 project
```

手动过一遍(全程不应出现中文,URL 不应出现语言前缀):

1. `/` → 应 rewrite 到英文首页(不再跳 `/zh`),`<html lang="en">`,标签页有标题
2. `/zh/home` → 404(或走新加的 redirect 到 `/home`)
3. 注册 → 确认邮件 → 登录 → 登出(登出应落到 `/` 而非 `/zh`)。**Supabase 邮件模板在控制台配置,不在仓库里,大概率是中文 —— 需人工去 Supabase Dashboard 改英文**
4. `/pricing` → 只出现 Creem 结算,不再有微信二维码页;金额 `$`
5. `/subscriptions` → 日期为 `en-US` 格式,状态标签英文
6. 创作主流程:上传小说 → 剧本 → 角色 → 分镜 → 视频。**预期仍会看到中文的 AI 生成内容** —— 这是已知的后端边界,不是 bug
7. 制造一次 API 失败(断开后端),确认 toast 是英文兜底而非后端中文原文
8. `/debug-auth` → 404(已删)

---

## 已知遗留(本轮不做)

**后端 `mira-service` 待办** —— 不做这些,「英文可交付」就只是外壳:

1. 40 份 `app/prompt/*.md` + `app/agent/knowledge/prompts/*.md` 全中文,`agent_video_prompt_gen.md:125` 明写「必须使用中文」→ AI 生成的剧本、角色、场景、分镜、旁白、video_prompt 全是中文
2. 无 `Accept-Language` / locale 处理(全仓 0 命中);前端目前也只在商品接口传 `language`
3. 54 个文件的报错 `detail` 为中文,如 `app/tasks/character_task.py:72` `f"角色不存在: character_id={character_id}"` → 建议改「错误码 + 英文 detail」
4. `app/agent/tools/save_tools.py:132,222` 等处 `status_detail = "等待重新生成图片"` 之类中文状态值会直接进 UI
5. 数据契约中文键:`{"角色": …, "内容": …}`(`app/tasks/creation_task.py:958`、`step7/step8` 等)、`出镜角色`/`声音角色`(`creation_task.py:158`),以及默认角色名 `"旁白"` → 建议改 `role`/`content`/`narrator`,前后端同步
6. `/voices?language=` 默认 `zh`(`app/api/api_v1/endpoints/voices.py:24`),英文音色库是否有数据待确认

**前端遗留**:
- TTS 音色按决定暂不动 —— `create-settings/voice-selector.tsx:223` 与 `agent/character-detail-dialog.tsx:153` 仍硬编码 `language: "zh"`,英文用户拿到的是中文音色列表
- `tests/mocks/api-mock.ts` 的 fixture 是中文内容(27 行),locale 无关,可留
- `public/{amu,anduming,atian,article-cover,novel-cover}.png` 是拼音命名的样例角色图,海外上线建议业务方复核(纯素材,不阻塞)
- `README.md:3,15,68,110-115` 声称支持中/英/**日**三语且译文在 `src/i18n/locales/` —— 均为过期描述(实际在 `src/messages/`,无日语),随 Phase 1 更新
- `terms`/`privacy` 英文版缺 GDPR/CCPA 条款、无 cookie 同意、年龄门槛 13 岁 —— **法务待办**

---

## 顺序与依赖

```
Phase 0 (闸门+key对齐)
   ↓
Phase 1 (路由/去前缀)  ←── 最高风险,独立 PR,先合先验
   ↓
Phase 2 (微信移除)     ←── 依赖 Phase 1 已去掉 locale 分支
   ↓
Phase 3 (a→g 分批抽取) ←── 工作量主体,可并行分人
   ↓
Phase 4 (中文防线)     ←── 依赖 Phase 3 的命名空间已就位
   ↓
Phase 5 (测试+验收)    ←── 断言文案依赖 Phase 3 定稿
```

Phase 1 建议单独 PR 合并并部署验证 —— 它改的是 39 个文件的路由行为,`typescript.ignoreBuildErrors: true` 会掩盖类型错误,必须靠 `pnpm type-check` + 实际点击验证,不要和 1646 条文案改动混在一个 PR 里 review。
