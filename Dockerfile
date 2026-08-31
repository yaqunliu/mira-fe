FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

# 留空 => 前端走 Next 同源代理（见 next.config.js 的 rewrites）
# 填绝对地址 => 浏览器直连该地址，rewrites 失效
# 不再给死域名做默认值：原默认 https://api-creator.mira-studio.ai 已不解析
ARG NEXT_PUBLIC_API_URL=""
# 同源代理的转发目标，通常是后端容器在共享网络上的别名 http://mira-api:8100
#
# ⚠️ 必须在构建阶段注入：Next 的 rewrites() 在 next build 时求值并固化进
#    .next/routes-manifest.json，standalone 产物里没有 next.config.js，
#    运行时再设这个变量完全无效。
ARG BACKEND_URL="http://mira-api:8100"
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8001

# runner 阶段这几个值只影响服务端渲染时的读取；
# 客户端 bundle 与 rewrites 都已在 builder 阶段固化。
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8001

USER node

CMD ["node", "server.js"]
