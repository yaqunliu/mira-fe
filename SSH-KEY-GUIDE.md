# SSH 密钥生成和使用指南

## 🔑 生成 SSH 密钥

### 方法1: 生成 RSA 密钥（传统方式）

```bash
# 生成 RSA 密钥（2048位，默认）
ssh-keygen -t rsa

# 生成 RSA 密钥（4096位，更安全）
ssh-keygen -t rsa -b 4096

# 指定密钥文件名和路径
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_novel2video
```

**操作步骤**：
1. 运行命令后，会提示输入密钥保存位置（默认：`~/.ssh/id_rsa`）
2. 输入密码短语（可选，建议设置）
3. 确认密码短语

### 方法2: 生成 ED25519 密钥（推荐，更安全更快）

```bash
# 生成 ED25519 密钥（推荐）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 指定文件名
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_novel2video -C "your_email@example.com"
```

**为什么推荐 ED25519**：
- ✅ 更安全（256位密钥）
- ✅ 更快（签名和验证速度更快）
- ✅ 密钥更短（更容易管理）

### 方法3: 生成 ECDSA 密钥

```bash
# 生成 ECDSA 密钥
ssh-keygen -t ecdsa -b 256

# 或 384位
ssh-keygen -t ecdsa -b 384
```

## 📋 完整生成流程示例

```bash
# 1. 生成密钥（推荐使用 ED25519）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. 查看生成的密钥
ls -la ~/.ssh/

# 应该看到：
# id_ed25519      # 私钥（保密，不要分享）
# id_ed25519.pub  # 公钥（可以分享）

# 3. 设置正确的权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# 4. 查看公钥内容（用于添加到服务器）
cat ~/.ssh/id_ed25519.pub
```

## 🚀 将公钥添加到远程服务器

### 方法1: 使用 ssh-copy-id（最简单）

```bash
# 自动将公钥添加到服务器
ssh-copy-id user@your-server.com

# 如果使用自定义密钥
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server.com

# 如果使用非标准端口
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 22 user@your-server.com
```

### 方法2: 手动添加

```bash
# 1. 复制公钥内容
cat ~/.ssh/id_ed25519.pub
# 或
pbcopy < ~/.ssh/id_ed25519.pub  # macOS
xclip -sel clip < ~/.ssh/id_ed25519.pub  # Linux

# 2. SSH 到服务器
ssh user@your-server.com

# 3. 在服务器上创建 .ssh 目录（如果不存在）
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 4. 添加公钥到 authorized_keys
echo "你的公钥内容" >> ~/.ssh/authorized_keys

# 5. 设置正确的权限
chmod 600 ~/.ssh/authorized_keys
```

### 方法3: 使用部署脚本自动添加

```bash
# 在本地运行，会自动将公钥添加到服务器
cat ~/.ssh/id_ed25519.pub | ssh user@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## ✅ 测试 SSH 连接

```bash
# 使用默认密钥测试
ssh user@your-server.com

# 使用指定密钥测试
ssh -i ~/.ssh/id_ed25519 user@your-server.com

# 详细输出（用于调试）
ssh -v user@your-server.com
```

## 🔧 配置 SSH 使用特定密钥

如果使用多个密钥，可以配置 SSH 自动使用对应的密钥：

编辑 `~/.ssh/config`：

```bash
# 编辑配置文件
vim ~/.ssh/config

# 添加配置
Host your-server.com
    HostName your-server.com
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# 设置权限
chmod 600 ~/.ssh/config
```

配置后，可以直接使用：
```bash
ssh your-server.com  # 会自动使用指定的密钥
```

## 🔍 查看已有密钥

```bash
# 列出所有 SSH 密钥
ls -la ~/.ssh/

# 查看公钥内容
cat ~/.ssh/id_ed25519.pub

# 查看私钥指纹（用于验证）
ssh-keygen -l -f ~/.ssh/id_ed25519.pub
```

## 🔐 密钥管理最佳实践

1. **使用密码短语**
   - 生成密钥时设置密码短语，增加安全性
   - 即使私钥泄露，也需要密码才能使用

2. **不同用途使用不同密钥**
   ```bash
   # 工作密钥
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_work
   
   # 个人项目密钥
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_personal
   ```

3. **定期轮换密钥**
   - 建议每 6-12 个月更换一次密钥

4. **备份密钥**
   - 安全备份私钥（加密存储）
   - 不要丢失私钥，否则无法访问服务器

5. **使用 SSH Agent**
   ```bash
   # 启动 SSH Agent
   eval "$(ssh-agent -s)"
   
   # 添加密钥到 Agent（避免每次输入密码）
   ssh-add ~/.ssh/id_ed25519
   
   # 查看已添加的密钥
   ssh-add -l
   ```

## 🎯 快速开始（推荐流程）

```bash
# 1. 生成 ED25519 密钥（推荐）
ssh-keygen -t ed25519 -C "your_email@example.com"
# 按 Enter 使用默认路径
# 输入密码短语（可选）

# 2. 设置权限
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# 3. 将公钥添加到服务器
ssh-copy-id user@your-server.com

# 4. 测试连接
ssh user@your-server.com

# 5. 在 deploy.env 中使用（可选，不指定会使用默认）
# DEPLOY_SSH_KEY=~/.ssh/id_ed25519
```

## 🐛 常见问题

### Q: 密钥已存在怎么办？
A: 可以选择覆盖或使用不同的文件名：
```bash
# 覆盖现有密钥
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519

# 或使用不同文件名
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_novel2video
```

### Q: 忘记密码短语怎么办？
A: 无法恢复，需要重新生成密钥并更新服务器上的公钥。

### Q: 多个密钥如何管理？
A: 使用 `~/.ssh/config` 文件配置不同服务器使用不同密钥。

### Q: 如何删除密钥？
A: 删除本地密钥文件，并从服务器的 `~/.ssh/authorized_keys` 中移除对应公钥。

## 📚 相关资源

- [SSH 密钥管理最佳实践](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [ED25519 密钥说明](https://en.wikipedia.org/wiki/EdDSA)

