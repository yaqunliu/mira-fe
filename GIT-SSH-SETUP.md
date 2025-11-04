# Git HTTPS 转 SSH 配置指南

## 问题说明

如果遇到以下错误：
```
fatal: could not read Username for 'https://github.com': No such device or address
```

这是因为服务器上的 Git 远程 URL 使用的是 HTTPS 方式，需要在非交互式环境下提供用户名和密码。

## 解决方案

### 方案1: 使用脚本自动转换（推荐）

脚本会自动检测 HTTPS URL 并转换为 SSH URL。但需要确保：

1. **服务器已配置 GitHub SSH 密钥**

```bash
# SSH 到服务器
ssh user@your-server.com

# 生成 SSH 密钥（如果还没有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 查看公钥
cat ~/.ssh/id_ed25519.pub

# 将公钥添加到 GitHub
# 1. 复制上面的公钥内容
# 2. 访问 https://github.com/settings/keys
# 3. 点击 "New SSH key"
# 4. 粘贴公钥并保存

# 测试 GitHub SSH 连接
ssh -T git@github.com
# 应该看到: Hi username! You've successfully authenticated...
```

2. **运行部署脚本**

脚本会自动检测并转换 URL：
```bash
./deploy-remote.sh
```

### 方案2: 手动转换 Git 远程 URL

如果脚本自动转换失败，可以手动转换：

```bash
# SSH 到服务器
ssh user@your-server.com

# 进入项目目录
cd /var/www/novel2video

# 查看当前远程 URL
git remote -v

# 转换 HTTPS 为 SSH
# GitHub
git remote set-url origin git@github.com:username/repo.git

# GitLab
git remote set-url origin git@gitlab.com:username/repo.git

# 测试
git pull origin master
```

### 方案3: 使用 GitHub Token（不推荐用于脚本）

如果必须使用 HTTPS，可以在服务器上配置凭据：

```bash
# 在服务器上配置 Git 凭据
git config --global credential.helper store
echo "https://username:token@github.com" > ~/.git-credentials

# 或使用环境变量
export GIT_ASKPASS=echo
export GIT_USERNAME=your-username
export GIT_PASSWORD=your-token
```

**注意**：这种方式安全性较低，不推荐用于生产环境。

## 验证配置

### 1. 检查服务器上的 Git 远程 URL

```bash
ssh user@your-server.com "cd /var/www/novel2video && git remote -v"
```

应该看到 SSH URL：
```
origin  git@github.com:username/repo.git (fetch)
origin  git@github.com:username/repo.git (push)
```

### 2. 测试 GitHub SSH 连接

```bash
ssh user@your-server.com "ssh -T git@github.com"
```

应该看到：
```
Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

### 3. 测试 Git 拉取

```bash
ssh user@your-server.com "cd /var/www/novel2video && git pull origin master"
```

应该能成功拉取代码，不需要输入密码。

## 常见问题

### Q: 脚本自动转换后仍然失败？

A: 检查服务器是否配置了 GitHub SSH 密钥：
```bash
ssh user@your-server.com "ssh -T git@github.com"
```

### Q: 如何找到仓库的 SSH URL？

A: 在 GitHub/GitLab 仓库页面，点击 "Clone" 按钮，选择 "SSH" 即可看到 SSH URL。

### Q: 多个服务器需要配置多个密钥吗？

A: 可以为每个服务器生成不同的密钥，或者使用同一个密钥（不推荐）。

### Q: 私有仓库需要特殊配置吗？

A: 不需要，只要 SSH 密钥已添加到 GitHub/GitLab 账户，就可以访问私有仓库。

## 安全建议

1. **使用 SSH 密钥，不要使用密码**
2. **为每个服务器生成独立的密钥**
3. **定期轮换密钥**
4. **使用 GitHub Deploy Keys（如果只需要读取权限）**

---

配置完成后，重新运行部署脚本即可。

