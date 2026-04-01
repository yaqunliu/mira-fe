# mira-fe Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `mira-fe` 可以通过 Docker 在服务器上启动，并固定通过正式后端域名访问接口。

**Architecture:** 使用多阶段 Docker 构建前端镜像，在 `Next.js` 中开启 `standalone` 输出。用前端仓库自己的 `docker-compose.yml` 启动单个前端容器，对外暴露 `8001` 端口，并通过环境变量把后端地址设置为 `https://api-creator.mira-studio.ai`。

**Tech Stack:** Next.js 15, React 19, pnpm, Docker, Docker Compose

---

### Task 1: 让 Next.js 构建产物适合容器运行

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: 修改 Next.js 配置，开启 standalone 输出**

```js
const nextConfig = {
  output: 'standalone',
};
```

- [ ] **Step 2: 重新检查现有重写逻辑是否仍然成立**

确认下面逻辑保留不变：

```js
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (apiUrl && !apiUrl.startsWith('/')) {
  return [];
}
```

预期结果：当环境变量是正式后端域名时，前端不再走本地转发。

### Task 2: 新增前端 Docker 构建文件

**Files:**
- Create: `Dockerfile`
- Modify: `.dockerignore`

- [ ] **Step 1: 新增多阶段 Dockerfile**

内容需要覆盖：

```dockerfile
FROM node:20-alpine AS base
FROM base AS deps
FROM base AS builder
FROM base AS runner
```

并且在构建阶段传入：

```dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

- [ ] **Step 2: 检查 .dockerignore 不要挡住构建必须文件**

确保不会把下面文件挡掉：

```text
package.json
pnpm-lock.yaml
next.config.js
src/
public/
```

### Task 3: 新增前端 compose 启动文件

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.docker.example`

- [ ] **Step 1: 新增 docker-compose.yml**

文件需要包含：

```yaml
services:
  mira-fe:
    build:
      context: .
    ports:
      - "8001:8001"
    restart: unless-stopped
```

并设置：

```yaml
NEXT_PUBLIC_API_URL: https://api-creator.mira-studio.ai
```

- [ ] **Step 2: 新增 Docker 环境变量示例**

示例文件至少包含：

```env
PORT=8001
NEXT_PUBLIC_API_URL=https://api-creator.mira-studio.ai
```

### Task 4: 更新项目说明文档

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 补充 Docker 部署说明**

需要给出实际可执行步骤：

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

- [ ] **Step 2: 补充常用运维命令**

至少包含：

```bash
docker compose ps
docker compose logs -f mira-fe
docker compose restart mira-fe
```

### Task 5: 验证 Docker 配置可用

**Files:**
- Test: `docker-compose.yml`
- Test: `Dockerfile`

- [ ] **Step 1: 校验 compose 配置**

Run: `docker compose --env-file .env.docker.example config`
Expected: 成功输出解析后的配置，没有语法错误

- [ ] **Step 2: 构建前端镜像**

Run: `docker compose --env-file .env.docker.example build mira-fe`
Expected: 镜像构建成功

- [ ] **Step 3: 自检文档和示例文件**

确认下面三件事：

- 端口默认是 `8001`
- 后端地址默认是 `https://api-creator.mira-studio.ai`
- 启动命令和文件名在文档中一致
