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
GIT_REPO_URL="${DEPLOY_GIT_REPO_URL}"

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
    echo "  export DEPLOY_GIT_REPO_URL=\"git@github.com:username/repo.git\"  # 可选，首次部署时需要"
    echo "  ./deploy-remote.sh"
    exit 1
fi

# 构建 SSH 命令
SSH_CMD="ssh"

# 处理 SSH 密钥路径（支持 ~ 展开）
if [ -n "$SSH_KEY" ]; then
    # 展开 ~ 到完整路径
    SSH_KEY="${SSH_KEY/#\~/$HOME}"
    
    # 检查是否是公钥文件（.pub 结尾），如果是则提示错误
    if [[ "$SSH_KEY" == *.pub ]]; then
        echo "错误: DEPLOY_SSH_KEY 应该是私钥路径，不是公钥路径"
        echo "公钥文件: $SSH_KEY"
        echo "请使用私钥路径，例如: ~/.ssh/id_rsa（不是 ~/.ssh/id_rsa.pub）"
        exit 1
    fi
    
    # 检查私钥文件是否存在
    if [ ! -f "$SSH_KEY" ]; then
        echo "警告: 指定的私钥文件不存在: $SSH_KEY"
        echo "将尝试使用 SSH 默认密钥"
    else
        SSH_CMD="$SSH_CMD -i $SSH_KEY"
    fi
fi

SSH_CMD="$SSH_CMD -p $SSH_PORT $SSH_USER@$SSH_HOST"

# 构建 SCP 命令
SCP_CMD="scp"
if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
    SCP_CMD="$SCP_CMD -i $SSH_KEY"
fi
SCP_CMD="$SCP_CMD -P $SSH_PORT"

# 测试 SSH 连接
echo "正在测试 SSH 连接..."
if ! $SSH_CMD "echo 'SSH连接成功'" > /dev/null 2>&1; then
    echo "错误: SSH 连接失败"
    echo ""
    echo "调试信息:"
    echo "  使用的 SSH 命令: $SSH_CMD"
    echo "  服务器: $SSH_USER@$SSH_HOST:$SSH_PORT"
    if [ -n "$SSH_KEY" ]; then
        echo "  私钥路径: $SSH_KEY"
        echo "  私钥存在: $([ -f "$SSH_KEY" ] && echo '是' || echo '否')"
    else
        echo "  使用默认密钥"
    fi
    echo ""
    echo "请检查:"
    echo "  1. 私钥是否正确配置（私钥路径，不是公钥路径）"
    echo "  2. 公钥是否已添加到服务器的 ~/.ssh/authorized_keys"
    echo "  3. 服务器 SSH 配置是否允许密钥认证"
    echo "  4. 使用 'ssh -v $SSH_USER@$SSH_HOST' 查看详细错误"
    exit 1
fi

# 同步代码（Git方式）
echo "正在同步代码..."
# 服务器已配置 ~/.ssh/config，Git 会自动使用正确的 SSH 密钥
$SSH_CMD "cd $REMOTE_DIR && \
    if [ ! -d '.git' ]; then
        echo 'Git 仓库不存在' && \
        if [ -n '$GIT_REPO_URL' ]; then
            echo '正在克隆仓库: $GIT_REPO_URL' && \
            git clone -b $REMOTE_BRANCH '$GIT_REPO_URL' . || git clone '$GIT_REPO_URL' . && \
            git checkout $REMOTE_BRANCH 2>/dev/null || true
        else
            echo '错误: 请配置 DEPLOY_GIT_REPO_URL' && \
            exit 1
        fi
    else
        echo 'Git 仓库已存在，正在更新...' && \
        git fetch origin && \
        git checkout $REMOTE_BRANCH && \
        git pull origin $REMOTE_BRANCH
    fi" || {
    echo "错误: Git 操作失败"
    echo ""
    echo "可能的解决方案:"
    echo "  1. 检查服务器 ~/.ssh/config 配置是否正确"
    echo "  2. 在服务器上测试: ssh -T git@github.com"
    echo "  3. 手动在服务器上执行:"
    echo "     ssh $SSH_USER@$SSH_HOST"
    echo "     cd $REMOTE_DIR"
    echo "     git pull origin $REMOTE_BRANCH"
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
