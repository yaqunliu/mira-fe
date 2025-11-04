# 远程部署脚本使用指南

## 📋 概述

`deploy-remote.sh` 是一个自动化部署脚本，用于将 Next.js 应用一键部署到远程服务器。支持多种部署方式和运行模式。

## 🚀 快速开始

### 1. 准备工作

#### 配置 SSH 访问

确保你可以通过 SSH 访问远程服务器：

```bash
# 测试 SSH 连接
ssh user@your-server.com

# 如果使用 SSH 密钥，确保密钥有正确的权限
chmod 600 ~/.ssh/id_rsa
```

#### 服务器环境要求

根据选择的部署模式，服务器需要安装相应的软件：

**PM2 模式（推荐）**：
- Node.js 18+
- pnpm
- PM2（脚本会自动安装）

**Docker 模式**：
- Docker
- docker-compose

**直接启动模式**：
- Node.js 18+
- pnpm

### 2. 配置部署参数

复制示例配置文件：

```bash
cp deploy-config.example.sh deploy-config.sh
```

编辑 `deploy-config.sh`，设置以下必需参数：

```bash
# SSH 连接配置
SSH_HOST="your-server.com"           # 服务器地址或IP
SSH_USER="root"                      # SSH 用户名
SSH_PORT="22"                        # SSH 端口
SSH_KEY=""                           # SSH 私钥路径（可选）
                                      # 注意：这是本地机器上的私钥路径，用于从本地连接到远程服务器
                                      # 示例：~/.ssh/id_rsa 或 /path/to/your/private/key
                                      # 留空则使用默认密钥（~/.ssh/id_rsa 等）

# 远程服务器配置
REMOTE_DIR="/var/www/novel2video"    # 远程项目目录
REMOTE_BRANCH="master"               # Git 分支

# 部署配置
DEPLOY_METHOD="git"                  # git 或 rsync
DEPLOY_MODE="pm2"                    # pm2, docker, 或 direct
```

### 3. 准备环境变量文件

确保有 `.env.production` 文件：

```bash
cp ENV.example.txt .env.production
vim .env.production  # 编辑环境变量
```

### 4. 首次部署（Git 方式）

如果使用 Git 方式部署，需要在服务器上初始化 Git 仓库：

```bash
# SSH 到服务器
ssh user@your-server.com

# 创建项目目录
mkdir -p /var/www/novel2video
cd /var/www/novel2video

# 初始化 Git 仓库或克隆现有仓库
git init
git remote add origin <your-repo-url>
git pull origin master
```

### 5. 运行部署脚本

```bash
# 基本部署
./deploy-remote.sh

# 使用自定义配置
./deploy-remote.sh --config my-config.sh

# 指定部署模式
./deploy-remote.sh --mode pm2 --method git
```

## 📚 详细用法

### 部署方式

#### Git 方式（推荐）

通过 Git 拉取代码更新：

```bash
./deploy-remote.sh --method git
```

**优点**：
- 支持版本控制
- 可以回滚到任意版本
- 适合团队协作

**要求**：
- 服务器上已配置 Git 仓库
- 有 Git 访问权限

#### Rsync 方式

通过 rsync 同步文件：

```bash
./deploy-remote.sh --method rsync
```

**优点**：
- 不需要 Git 仓库
- 同步速度快
- 适合单机部署

**要求**：
- 服务器上安装 rsync

### 运行模式

#### PM2 模式（推荐）

使用 PM2 进程管理：

```bash
./deploy-remote.sh --mode pm2
```

**优点**：
- 自动重启
- 日志管理
- 集群模式支持
- 内存监控

#### Docker 模式

使用 Docker 容器：

```bash
./deploy-remote.sh --mode docker
```

**要求**：
- 服务器上安装 Docker 和 docker-compose
- 项目根目录有 `docker-compose.yml` 文件

**优点**：
- 环境隔离
- 易于扩展
- 依赖管理简单

#### 直接启动模式

直接启动 Next.js 服务：

```bash
./deploy-remote.sh --mode direct
```

**注意**：不推荐生产环境使用，进程可能意外退出。

### 构建选项

#### 在服务器上构建（默认）

```bash
./deploy-remote.sh  # 默认 BUILD_ON_SERVER=true
```

**优点**：
- 本地不需要安装依赖
- 构建产物不占用本地空间

#### 在本地构建

```bash
./deploy-remote.sh --build-local
```

**优点**：
- 可以先验证构建是否成功
- 适合本地网络较慢的情况

#### 跳过构建

```bash
./deploy-remote.sh --skip-build
```

**适用场景**：
- 仅更新代码不重新构建
- 构建已在其他地方完成

### 回滚功能

如果部署出现问题，可以快速回滚：

```bash
./deploy-remote.sh --rollback
```

脚本会自动：
1. 查找最近的备份
2. 恢复 `.next` 目录
3. 重启服务

## 🔧 高级配置

### 自定义配置文件

创建多个配置文件用于不同环境：

```bash
# 生产环境
cp deploy-config.example.sh deploy-config.prod.sh
vim deploy-config.prod.sh

# 测试环境
cp deploy-config.example.sh deploy-config.staging.sh
vim deploy-config.staging.sh

# 使用不同配置部署
./deploy-remote.sh --config deploy-config.prod.sh
./deploy-remote.sh --config deploy-config.staging.sh
```

### 环境变量文件

可以指定不同的环境变量文件：

```bash
./deploy-remote.sh --env .env.production
./deploy-remote.sh --env .env.staging
```

### SSH 密钥配置

如果使用 SSH 密钥认证：

```bash
# 在 deploy-config.sh 中设置
SSH_KEY="$HOME/.ssh/id_rsa"
```

或者使用环境变量：

```bash
export SSH_KEY="$HOME/.ssh/id_rsa"
./deploy-remote.sh
```

## 📊 部署流程

脚本执行流程：

1. **连接测试** - 测试 SSH 连接
2. **创建备份** - 备份当前版本（.next 目录）
3. **同步代码** - Git pull 或 rsync 同步
4. **同步环境变量** - 上传 .env.production
5. **构建项目** - 安装依赖并构建
6. **启动服务** - 根据模式启动服务
7. **健康检查** - 验证服务是否正常运行

## 🐛 故障排查

### SSH 连接失败

```bash
# 手动测试连接
ssh -p 22 user@your-server.com

# 检查 SSH 密钥权限
chmod 600 ~/.ssh/id_rsa

# 检查配置文件中的 SSH 设置
cat deploy-config.sh
```

### 构建失败

```bash
# 查看服务器上的构建日志
ssh user@your-server.com "cd /var/www/novel2video && pm2 logs novel2video"

# 或 Docker 模式
ssh user@your-server.com "cd /var/www/novel2video && docker-compose logs"
```

### 健康检查失败

```bash
# 手动检查服务状态
ssh user@your-server.com "curl http://localhost:3000"

# 检查端口是否被占用
ssh user@your-server.com "netstat -tulpn | grep 3000"

# 查看服务日志
ssh user@your-server.com "cd /var/www/novel2video && pm2 logs"
```

### 权限问题

```bash
# 确保项目目录有正确的权限
ssh user@your-server.com "sudo chown -R $USER:$USER /var/www/novel2video"
```

## 📝 常用命令

### 查看部署状态

```bash
# PM2 模式
ssh user@your-server.com "cd /var/www/novel2video && pm2 status"

# Docker 模式
ssh user@your-server.com "cd /var/www/novel2video && docker-compose ps"
```

### 查看日志

```bash
# PM2 模式
ssh user@your-server.com "cd /var/www/novel2video && pm2 logs novel2video"

# Docker 模式
ssh user@your-server.com "cd /var/www/novel2video && docker-compose logs -f"
```

### 重启服务

```bash
# PM2 模式
ssh user@your-server.com "cd /var/www/novel2video && pm2 restart novel2video"

# Docker 模式
ssh user@your-server.com "cd /var/www/novel2video && docker-compose restart"
```

### 查看备份

```bash
ssh user@your-server.com "ls -lh /var/backups/novel2video"
```

## 💡 最佳实践

1. **使用 PM2 模式** - 生产环境推荐使用 PM2
2. **配置自动化备份** - 定期备份重要数据
3. **监控服务状态** - 设置监控告警
4. **使用 HTTPS** - 配置 SSL 证书
5. **环境隔离** - 区分开发、测试、生产环境
6. **版本控制** - 使用 Git 管理代码版本
7. **日志管理** - 定期清理日志文件

## 🎯 示例场景

### 场景 1：首次部署到新服务器

```bash
# 1. 配置 SSH 访问
ssh-copy-id user@your-server.com

# 2. 在服务器上初始化 Git 仓库
ssh user@your-server.com "mkdir -p /var/www/novel2video && cd /var/www/novel2video && git init"

# 3. 配置部署参数
cp deploy-config.example.sh deploy-config.sh
vim deploy-config.sh

# 4. 准备环境变量
cp ENV.example.txt .env.production
vim .env.production

# 5. 部署
./deploy-remote.sh --mode pm2 --method git
```

### 场景 2：快速更新代码

```bash
# 代码已提交到 Git，直接部署
./deploy-remote.sh --method git --mode pm2
```

### 场景 3：本地构建后部署

```bash
# 先在本地验证构建，再部署
pnpm build
./deploy-remote.sh --build-local --skip-build
```

### 场景 4：回滚到上一版本

```bash
# 如果新版本有问题，快速回滚
./deploy-remote.sh --rollback
```

## 📞 获取帮助

如果遇到问题：

1. 查看脚本输出日志
2. 检查服务器日志
3. 参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 文档
4. 查看项目 Issues

---

祝部署顺利！🎉

