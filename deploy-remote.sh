#!/bin/bash

# Novel2Video 远程部署脚本
# 
# 说明：此脚本在本地运行，通过 SSH 连接到远程服务器执行部署操作
# 
# 使用方法: 
#   方式1: 使用配置文件（推荐）
#     在本地项目目录：
#     cp deploy.env.example deploy.env  # 或 .env.deploy
#     vim deploy.env  # 编辑配置
#     ./deploy-remote.sh
#   
#   方式2: 使用环境变量
#     在本地项目目录设置环境变量（不是服务器上）：
#     export DEPLOY_HOST="your-server.com"
#     export DEPLOY_USER="root"
#     export DEPLOY_DIR="/var/www/novel2video"
#     ./deploy-remote.sh

set -e

# 从配置文件加载配置（如果存在）
if [ -f ".env.deploy" ]; then
    set -a  # 自动导出所有变量
    source .env.deploy
    set +a
elif [ -f "deploy.env" ]; then
    set -a  # 自动导出所有变量
    source deploy.env
    set +a
fi

# 必需的环境变量
SSH_HOST="${DEPLOY_HOST}"
SSH_USER="${DEPLOY_USER:-root}"
SSH_PORT="${DEPLOY_PORT:-22}"
SSH_KEY="${DEPLOY_SSH_KEY}"
REMOTE_DIR="${DEPLOY_DIR}"
REMOTE_BRANCH="${DEPLOY_BRANCH:-master}"

# 检查必需的环境变量
if [ -z "$SSH_HOST" ] || [ -z "$REMOTE_DIR" ]; then
    echo "错误: 请设置环境变量 DEPLOY_HOST 和 DEPLOY_DIR"
    echo ""
    echo "方式1: 使用配置文件"
    echo "  cp deploy.env.example deploy.env"
    echo "  vim deploy.env  # 编辑配置"
    echo "  ./deploy-remote.sh"
    echo ""
    echo "方式2: 使用环境变量（在本地设置，不是服务器上）"
    echo "  export DEPLOY_HOST=\"your-server.com\""
    echo "  export DEPLOY_USER=\"root\""
    echo "  export DEPLOY_DIR=\"/var/www/novel2video\""
    echo "  export DEPLOY_SSH_KEY=\"\$HOME/.ssh/id_rsa\"  # 可选，本地私钥路径"
    echo "  ./deploy-remote.sh"
    exit 1
fi

# 构建 SSH 命令
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
    SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
SSH_CMD="$SSH_CMD -p $SSH_PORT $SSH_USER@$SSH_HOST"

# 构建 SCP 命令
SCP_CMD="scp"
if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
    SCP_CMD="$SCP_CMD -i $SSH_KEY"
fi
SCP_CMD="$SCP_CMD -P $SSH_PORT"

# 测试 SSH 连接
$SSH_CMD "echo 'SSH连接成功'" > /dev/null 2>&1 || {
    echo "错误: SSH 连接失败"
    exit 1
}

# 同步代码（Git方式）
$SSH_CMD "cd $REMOTE_DIR && git fetch origin && git checkout $REMOTE_BRANCH && git pull origin $REMOTE_BRANCH" || {
    echo "错误: Git 拉取失败"
    exit 1
}

# 同步环境变量文件
if [ -f ".env.production" ]; then
    $SCP_CMD .env.production $SSH_USER@$SSH_HOST:$REMOTE_DIR/.env.production
fi

# 在服务器上构建
$SSH_CMD "cd $REMOTE_DIR && \
    if ! command -v pnpm &> /dev/null; then npm install -g pnpm; fi && \
    pnpm install --frozen-lockfile && \
    pnpm build"

# 使用 PM2 启动
$SSH_CMD "cd $REMOTE_DIR && \
    if ! command -v pm2 &> /dev/null; then npm install -g pm2; fi && \
    mkdir -p logs && \
    if pm2 list | grep -q novel2video; then \
        pm2 restart novel2video; \
    else \
        pm2 start ecosystem.config.js; \
    fi && \
    pm2 save"

echo "部署完成"
