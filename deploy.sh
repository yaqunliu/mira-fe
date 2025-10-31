#!/bin/bash

# Novel2Video 快速部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署 Novel2Video..."

# 检查 Node.js 版本
echo "📋 检查环境..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: 需要 Node.js 18 或更高版本，当前版本: $(node -v)"
    exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，正在安装..."
    npm install -g pnpm
fi

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 检查环境变量文件
if [ ! -f ".env.production" ]; then
    echo "⚠️  未找到 .env.production 文件"
    echo "📝 创建 .env.production 文件..."
    cat > .env.production << EOF
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api-domain.com
PORT=3000
EOF
    echo "✅ 已创建 .env.production 文件，请根据实际情况修改配置"
    read -p "是否继续部署? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 构建项目
echo "🔨 构建项目..."
pnpm build

# 检查构建是否成功
if [ ! -d ".next" ]; then
    echo "❌ 构建失败: .next 目录不存在"
    exit 1
fi

echo "✅ 构建完成！"

# 询问启动方式
echo ""
echo "请选择启动方式:"
echo "1) PM2 (推荐)"
echo "2) 直接启动 (next start)"
echo "3) 仅构建，不启动"
read -p "请选择 (1/2/3): " choice

case $choice in
    1)
        echo "🚀 使用 PM2 启动..."
        if ! command -v pm2 &> /dev/null; then
            echo "📦 安装 PM2..."
            npm install -g pm2
        fi
        
        # 创建 logs 目录
        mkdir -p logs
        
        pm2 start ecosystem.config.js
        pm2 save
        
        echo "✅ 应用已使用 PM2 启动"
        echo "📊 查看状态: pm2 status"
        echo "📝 查看日志: pm2 logs novel2video"
        ;;
    2)
        echo "🚀 启动应用..."
        pnpm start
        ;;
    3)
        echo "✅ 构建完成，未启动服务"
        echo "💡 使用 'pnpm start' 启动服务"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 部署完成！"
echo ""
echo "📚 更多部署选项请查看 DEPLOYMENT.md"

