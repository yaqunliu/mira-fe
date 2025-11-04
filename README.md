# Novel2Video - 小说转视频应用

一个基于AI的小说转视频Web应用，支持多语言，面向海外C端用户。

## 🚀 功能特性

### 核心功能
- **小说管理**: 上传、管理小说，自动章节拆分
- **视频创作**: 将小说章节转换为视频
- **角色设计**: AI生成角色形象，支持风格选择
- **分镜生成**: 自动生成分镜描述和画面
- **视频合成**: 生成音频、字幕、BGM并合成最终视频

### 技术特性
- **多语言支持**: 中文、英文、日文
- **响应式设计**: 完美支持H5移动端
- **现代化UI**: 基于shadcn/ui组件库
- **类型安全**: 全TypeScript开发
- **状态管理**: Zustand + TanStack Query

## 🛠 技术栈

### 前端框架
- **Next.js 14** (App Router)
- **React 19**
- **TypeScript**

### UI & 样式
- **shadcn/ui** - 高质量组件库
- **Tailwind CSS** - 原子化CSS
- **Lucide React** - 图标库

### 状态管理
- **Zustand** - 轻量级状态管理
- **TanStack Query** - 服务端状态管理

### 国际化
- **next-intl** - 多语言支持

### 表单处理
- **React Hook Form** - 高性能表单
- **Zod** - Schema验证

### 其他工具
- **Axios** - HTTP客户端
- **react-dropzone** - 文件上传
- **react-player** - 视频播放

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/          # 多语言路由
│   │   ├── (auth)/        # 认证页面
│   │   └── (main)/        # 主要功能页面
├── components/            # 组件
│   ├── ui/               # shadcn/ui组件
│   ├── layouts/          # 布局组件
│   └── providers/        # 提供者组件
├── lib/                   # 工具函数
│   ├── api/              # API封装
│   ├── validations/      # 表单验证
│   └── utils.ts          # 工具函数
├── stores/                # 状态管理
├── types/                 # TypeScript类型
├── i18n/                  # 国际化配置
│   └── locales/          # 翻译文件
└── styles/               # 全局样式
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐)

### 安装依赖
```bash
pnpm install
```

### 环境配置
复制 `.env.example` 到 `.env.local` 并配置相关环境变量：

```bash
cp .env.example .env.local
```

### 启动开发服务器
```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📱 页面路由

### 认证页面
- `/auth/login` - 登录
- `/auth/register` - 注册

### 主要功能
- `/` - 首页
- `/novels` - 小说管理
- `/novels/upload` - 上传小说
- `/videos` - 视频管理
- `/create` - 小说转视频

## 🌍 多语言支持

支持以下语言：
- 英语 (en)
- 中文 (zh)
- 日语 (ja)

语言文件位于 `src/i18n/locales/` 目录。

## 🎨 UI组件

基于shadcn/ui组件库，包含以下常用组件：
- Button, Card, Input, Label
- Form, Select, Textarea
- Dialog, Sheet, Dropdown
- Badge, Avatar, Progress
- Toast (Sonner)

## 🔧 开发指南

### 添加新页面
1. 在 `src/app/[locale]/(main)/` 下创建页面文件
2. 添加对应的类型定义到 `src/types/`
3. 如需要API，在 `src/lib/api/` 下添加接口
4. 添加翻译到 `src/i18n/locales/`

### 添加新组件
1. 在 `src/components/` 下创建组件
2. 使用shadcn/ui组件作为基础
3. 添加必要的类型定义
4. 确保组件支持多语言

### 状态管理
- 全局状态使用Zustand (`src/stores/`)
- 服务端状态使用TanStack Query
- 表单状态使用React Hook Form

## 📦 构建部署

### 构建生产版本
```bash
pnpm build
```

### 启动生产服务器
```bash
pnpm start
```

### 部署到服务器

**详细的部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)**

部署方式包括：
- 🚀 Vercel 部署（推荐，最简单）
- 🖥️ 传统服务器部署（自有服务器/VPS）
- 🐳 Docker 部署（容器化）
- 📊 PM2 进程管理（生产环境推荐）
- 🔄 远程自动部署（使用 `deploy-remote.sh` 脚本）

#### 远程自动部署脚本

使用 `deploy-remote.sh` 脚本可以一键将应用部署到远程服务器：

**方式1: 使用配置文件（推荐）**

```bash
# 复制配置文件
cp deploy.env.example deploy.env

# 编辑配置
vim deploy.env

# 运行部署脚本
./deploy-remote.sh
```

配置文件 `deploy.env` 示例：
```bash
DEPLOY_HOST=your-server.com
DEPLOY_USER=root
DEPLOY_PORT=22
DEPLOY_SSH_KEY=~/.ssh/id_rsa  # 本地私钥路径（可选，留空使用默认）
DEPLOY_DIR=/var/www/novel2video
DEPLOY_BRANCH=master
```

**方式2: 使用环境变量**

```bash
# 注意：这些环境变量在本地设置，不是服务器上！
# 在本地项目目录执行：
export DEPLOY_HOST="your-server.com"      # 服务器地址（必填）
export DEPLOY_USER="root"                 # SSH 用户名（可选，默认 root）
export DEPLOY_PORT="22"                   # SSH 端口（可选，默认 22）
export DEPLOY_DIR="/var/www/novel2video"  # 远程项目目录（必填）
export DEPLOY_BRANCH="master"             # Git 分支（可选，默认 master）
export DEPLOY_SSH_KEY="$HOME/.ssh/id_rsa" # 本地私钥路径（可选，留空使用默认）

# 然后在本地运行部署脚本
./deploy-remote.sh
```

部署脚本功能：
- ✅ 自动 SSH 连接测试
- ✅ Git 代码同步
- ✅ 自动构建和部署
- ✅ PM2 进程管理

**团队协作**：如何与团队成员同步部署配置？请查看 [TEAM-DEPLOY-SYNC.md](./TEAM-DEPLOY-SYNC.md)

**SSH 密钥**：如何生成和使用 SSH 密钥？请查看 [SSH-KEY-GUIDE.md](./SSH-KEY-GUIDE.md)

### 静态导出 (可选)
```bash
pnpm build && pnpm export
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React框架
- [shadcn/ui](https://ui.shadcn.com/) - UI组件库
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Vercel](https://vercel.com/) - 部署平台