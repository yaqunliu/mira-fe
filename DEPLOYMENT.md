# 部署指南

本文档详细说明如何将 Novel2Video 项目部署到服务器上。

## 📋 目录

- [环境要求](#环境要求)
- [部署方式](#部署方式)
  - [方式一：Vercel 部署（推荐）](#方式一vercel-部署推荐)
  - [方式二：传统服务器部署](#方式二传统服务器部署)
  - [方式三：Docker 部署](#方式三docker-部署)
  - [方式四：PM2 进程管理](#方式四pm2-进程管理)

## 环境要求

### 基本要求
- **Node.js**: 18.0 或更高版本
- **pnpm**: 8.0 或更高版本（或 npm/yarn）
- **服务器内存**: 至少 2GB RAM（推荐 4GB+）
- **磁盘空间**: 至少 10GB（考虑到上传文件和构建产物）

### 系统要求
- Linux/macOS/Windows（推荐 Linux）
- 支持 HTTPS（生产环境必需）

## 部署方式

### 方式一：Vercel 部署（推荐）

Vercel 是 Next.js 官方推荐的部署平台，配置简单，自动 HTTPS。

#### 步骤

1. **注册 Vercel 账号**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub/GitLab/Bitbucket 账号登录

2. **导入项目**
   - 在 Vercel 控制台点击 "New Project"
   - 选择你的 Git 仓库
   - 选择分支（通常是 `main` 或 `master`）

3. **配置环境变量**
   - 在项目设置中添加环境变量：
     ```
     NEXT_PUBLIC_API_URL=https://your-api-domain.com
     ```
   - 其他需要的环境变量（如果有）

4. **配置构建选项**
   - Build Command: `pnpm build` 或 `npm run build`
   - Output Directory: `.next`
   - Install Command: `pnpm install` 或 `npm install`

5. **部署**
   - 点击 "Deploy" 按钮
   - Vercel 会自动构建并部署

#### 注意事项
- ⚠️ **文件上传限制**: Vercel 的 Serverless Functions 有文件大小和运行时间限制
- ⚠️ **uploads 目录**: 需要考虑使用外部存储（如 AWS S3、Cloudflare R2）来存储上传的文件
- ✅ **自动部署**: 每次推送到主分支会自动触发部署

### 方式二：传统服务器部署

适用于自有服务器或 VPS。

#### 步骤

1. **服务器准备**
   ```bash
   # 安装 Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # 安装 pnpm
   npm install -g pnpm

   # 安装 Nginx（用于反向代理）
   sudo apt-get install nginx
   ```

2. **克隆项目**
   ```bash
   cd /var/www
   git clone <your-repo-url> novel2video
   cd novel2video
   ```

3. **安装依赖**
   ```bash
   pnpm install
   ```

4. **配置环境变量**
   ```bash
   # 创建 .env.production 文件
   cat > .env.production << EOF
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-api-domain.com
   PORT=3000
   EOF
   ```
   
   或手动创建 `.env.production` 文件，包含以下变量：
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://your-api-domain.com
   PORT=3000
   ```

5. **构建项目**
   ```bash
   pnpm build
   ```

6. **配置 Nginx 反向代理**
   ```bash
   sudo nano /etc/nginx/sites-available/novel2video
   ```
   
   添加以下配置：
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # 重定向到 HTTPS（如果有 SSL 证书）
       # return 301 https://$server_name$request_uri;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # 上传文件大小限制
       client_max_body_size 100M;
   }
   ```

   ```bash
   # 启用站点
   sudo ln -s /etc/nginx/sites-available/novel2video /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. **使用 systemd 管理服务**
   ```bash
   sudo nano /etc/systemd/system/novel2video.service
   ```
   
   添加以下内容：
   ```ini
   [Unit]
   Description=Novel2Video Next.js Application
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/novel2video
   Environment="NODE_ENV=production"
   Environment="PORT=3000"
   ExecStart=/usr/bin/pnpm start
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   # 启动服务
   sudo systemctl daemon-reload
   sudo systemctl enable novel2video
   sudo systemctl start novel2video
   sudo systemctl status novel2video
   ```

8. **配置 SSL 证书（使用 Let's Encrypt）**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

#### 文件上传处理

由于 `uploads/` 目录在服务器本地，建议：
- 定期备份 uploads 目录
- 或迁移到对象存储服务（如 AWS S3、阿里云 OSS）

### 方式三：Docker 部署

使用 Docker 可以简化部署流程，确保环境一致性。

#### 步骤

1. **构建 Docker 镜像**
   ```bash
   docker build -t novel2video:latest .
   ```

2. **运行容器**
   ```bash
   docker run -d \
     --name novel2video \
     -p 3000:3000 \
     -v $(pwd)/uploads:/app/uploads \
     --env-file .env.production \
     --restart unless-stopped \
     novel2video:latest
   ```

3. **使用 docker-compose（推荐）**
   ```bash
   docker-compose up -d
   ```

### 方式四：PM2 进程管理

PM2 是一个强大的 Node.js 进程管理器，适合生产环境。

#### 步骤

1. **安装 PM2**
   ```bash
   npm install -g pm2
   ```

2. **启动应用**
   ```bash
   pnpm build
   pm2 start ecosystem.config.js
   ```

3. **常用命令**
   ```bash
   # 查看状态
   pm2 status

   # 查看日志
   pm2 logs novel2video

   # 重启应用
   pm2 restart novel2video

   # 停止应用
   pm2 stop novel2video

   # 设置开机自启
   pm2 startup
   pm2 save
   ```

## 🔧 环境变量配置

创建 `.env.production` 文件，包含以下变量：

```env
# 运行环境
NODE_ENV=production

# API 地址
NEXT_PUBLIC_API_URL=https://your-api-domain.com

# 端口（可选，默认 3000）
PORT=3000

# 其他环境变量...
```

## 📦 构建优化

### 生产构建
```bash
# 构建生产版本
pnpm build

# 检查构建产物大小
du -sh .next
```

### 性能优化建议
1. **启用 Next.js Image Optimization**
   - 已在 `next.config.js` 中配置

2. **使用 CDN**
   - 将静态资源部署到 CDN

3. **缓存策略**
   - 配置适当的缓存头

4. **压缩资源**
   - 确保启用 gzip/brotli 压缩

## 🔒 安全建议

1. **HTTPS**: 生产环境必须使用 HTTPS
2. **环境变量**: 不要将 `.env` 文件提交到 Git
3. **文件上传**: 限制文件大小和类型
4. **API 认证**: 确保 API 有适当的认证机制
5. **防火墙**: 配置服务器防火墙规则

## 📊 监控和日志

### 日志管理
- Next.js 日志：`pm2 logs` 或 `journalctl -u novel2video`
- Nginx 日志：`/var/log/nginx/access.log` 和 `/var/log/nginx/error.log`

### 监控建议
- 使用 PM2 Plus 或 PM2 Monitoring
- 集成监控服务（如 Sentry、DataDog）
- 配置健康检查端点

## 🚀 更新部署

### 手动更新
```bash
cd /var/www/novel2video
git pull origin main
pnpm install
pnpm build
pm2 restart novel2video
# 或
sudo systemctl restart novel2video
```

### 自动更新（使用 GitHub Actions）
创建 `.github/workflows/deploy.yml` 实现 CI/CD。

## ❓ 常见问题

### Q: 构建失败怎么办？
A: 检查 Node.js 版本是否满足要求，清除 `.next` 目录后重新构建。

### Q: 文件上传功能不工作？
A: 确保 `uploads/` 目录有写入权限，或配置外部存储。

### Q: 页面加载慢？
A: 启用缓存、使用 CDN、优化图片资源。

### Q: 内存不足？
A: 增加服务器内存或优化代码，减少内存使用。

## 📞 获取帮助

如遇到问题，请：
1. 查看 Next.js 官方文档
2. 检查项目 Issues
3. 查看服务器日志

---

祝部署顺利！🎉

