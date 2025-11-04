# 服务器 SSH 密钥配置指南

## 问题说明

如果部署脚本显示"未找到 SSH 密钥文件"，说明服务器上的 Git 无法找到 SSH 密钥来连接 GitHub/GitLab。

## 解决方案

### 方案1: 确保 SSH 密钥在正确的位置

服务器上的 SSH 密钥通常放在 `~/.ssh/` 目录下。常见的密钥文件名：

- `~/.ssh/id_rsa` - RSA 密钥（传统）
- `~/.ssh/id_ed25519` - ED25519 密钥（推荐）
- `~/.ssh/id_ecdsa` - ECDSA 密钥
- `~/.ssh/github` - 自定义命名的 GitHub 密钥（你的情况）

### 方案2: 配置 SSH Config（推荐）

在服务器上创建或编辑 `~/.ssh/config` 文件：

```bash
# SSH 到服务器
ssh ubuntu@your-server.com

# 编辑 SSH 配置
vim ~/.ssh/config
```

添加以下内容：

```bash
# GitHub 配置
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github
    IdentitiesOnly yes

# GitLab 配置（如果需要）
Host gitlab.com
    HostName gitlab.com
    User git
    IdentityFile ~/.ssh/github
    IdentitiesOnly yes
```

设置正确的权限：

```bash
chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/github
```

### 方案3: 使用默认密钥名称

如果使用自定义命名的密钥（如 `github`），可以：

**选项A: 重命名为标准名称**

```bash
# 在服务器上
cd ~/.ssh
mv github id_rsa
mv github.pub id_rsa.pub
```

**选项B: 创建符号链接**

```bash
# 在服务器上
cd ~/.ssh
ln -s github id_rsa
ln -s github.pub id_rsa.pub
```

### 方案4: 配置 Git 使用特定密钥

在服务器上配置 Git 全局设置：

```bash
# SSH 到服务器
ssh ubuntu@your-server.com

# 配置 Git 使用特定的 SSH 密钥
git config --global core.sshCommand "ssh -i ~/.ssh/github -o StrictHostKeyChecking=no"

# 或者只针对当前仓库
cd /home/ubuntu/novel2video
git config core.sshCommand "ssh -i ~/.ssh/github -o StrictHostKeyChecking=no"
```

## 验证配置

### 1. 检查密钥文件是否存在

```bash
ssh ubuntu@your-server.com
ls -la ~/.ssh/
```

应该看到：
- `github` - 私钥（权限 600）
- `github.pub` - 公钥（权限 644）

### 2. 测试 GitHub SSH 连接

```bash
ssh ubuntu@your-server.com
ssh -i ~/.ssh/github -T git@github.com
```

应该看到：
```
Hi username! You've successfully authenticated...
```

### 3. 测试 Git 拉取

```bash
ssh ubuntu@your-server.com
cd /home/ubuntu/novel2video
git pull origin master
```

应该能成功拉取代码，不需要密码。

## 快速修复（推荐）

如果部署脚本找不到密钥，最快的修复方法：

### 方法1: 配置 SSH Config（最简单）

```bash
# SSH 到服务器
ssh ubuntu@106.75.233.97

# 创建 SSH 配置
cat > ~/.ssh/config << 'EOF'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github
    IdentitiesOnly yes
EOF

# 设置权限
chmod 600 ~/.ssh/config
```

配置后，Git 会自动使用 `~/.ssh/github` 密钥连接 GitHub。

### 方法2: 配置 Git 全局设置

```bash
# SSH 到服务器
ssh ubuntu@106.75.233.97

# 配置 Git 使用特定密钥
git config --global core.sshCommand "ssh -i ~/.ssh/github -o StrictHostKeyChecking=no"
```

## 部署脚本的自动处理

部署脚本会自动查找以下密钥文件（按优先级）：

1. `~/.ssh/github`
2. `~/.ssh/id_ed25519`
3. `~/.ssh/id_rsa`
4. `~/.ssh/id_ecdsa`

如果找到，会自动使用 `GIT_SSH_COMMAND` 让 Git 使用该密钥。

## 常见问题

### Q: 为什么手动执行能成功，但脚本不行？

A: 手动执行时，你的 shell 会加载 `~/.bashrc` 和 `~/.bash_profile`，可能配置了 SSH agent 或环境变量。非交互式 SSH 会话不会加载这些配置。

**解决方案**：使用上面提到的 SSH Config 或 Git Config 方法。

### Q: 密钥权限不正确怎么办？

A: 确保密钥文件权限正确：

```bash
chmod 600 ~/.ssh/github      # 私钥必须是 600
chmod 644 ~/.ssh/github.pub  # 公钥可以是 644
chmod 700 ~/.ssh             # .ssh 目录必须是 700
```

### Q: 如何查看当前使用的 SSH 密钥？

A: 使用详细模式测试：

```bash
ssh -v -T git@github.com
```

会显示实际使用的密钥文件路径。

### Q: 多个密钥如何管理？

A: 使用 `~/.ssh/config` 文件，为不同的主机配置不同的密钥：

```bash
Host github.com
    IdentityFile ~/.ssh/github

Host gitlab.com
    IdentityFile ~/.ssh/gitlab
```

## 总结

**推荐配置顺序**：

1. ✅ **配置 SSH Config**（最简单，一次配置永久有效）
2. ✅ **配置 Git Config**（如果 SSH Config 不起作用）
3. ✅ **使用标准密钥名称**（如果不想配置）

配置完成后，重新运行部署脚本即可。

