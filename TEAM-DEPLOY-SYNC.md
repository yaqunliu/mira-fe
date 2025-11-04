# 团队部署配置同步方案

本文档说明如何安全地与团队成员共享服务器部署配置信息。

## 🔐 方案对比

| 方案 | 安全性 | 便利性 | 适用场景 |
|------|--------|--------|----------|
| Git-crypt 加密 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 小型团队，需要版本控制 |
| 密码管理工具 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 所有团队规模 |
| 环境变量平台 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | CI/CD 集成 |
| 加密文档 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 临时方案 |
| 安全渠道分享 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 一次性配置 |

## 📋 推荐方案

### 方案1: Git-crypt（推荐用于代码仓库）

使用 Git-crypt 可以加密敏感文件并提交到 Git，团队成员拥有密钥后可以解密。

#### 设置步骤

1. **安装 git-crypt**
   ```bash
   # macOS
   brew install git-crypt
   
   # Linux
   sudo apt-get install git-crypt
   ```

2. **初始化 git-crypt**
   ```bash
   cd /path/to/novel2video
   git-crypt init
   ```

3. **配置 `.gitattributes`**（如果不存在则创建）
   ```bash
   # 加密部署配置文件
   deploy.env filter=git-crypt diff=git-crypt
   .env.deploy filter=git-crypt diff=git-crypt
   .env.production filter=git-crypt diff=git-crypt
   ```

4. **导出密钥给团队成员**
   ```bash
   # 导出密钥（保存到安全位置）
   git-crypt export-key /path/to/secret-key
   
   # 通过安全渠道（如 1Password、加密邮件）分享给团队成员
   ```

5. **团队成员导入密钥**
   ```bash
   # 团队成员导入密钥后
   git-crypt unlock /path/to/secret-key
   
   # 之后就可以正常使用加密的文件了
   ```

**优点**：
- ✅ 配置文件可以提交到 Git
- ✅ 只有有密钥的人才能查看
- ✅ 支持版本控制
- ✅ 团队成员可以自动同步

**缺点**：
- ⚠️ 需要管理密钥分发
- ⚠️ 密钥丢失需要重新初始化

### 方案2: 密码管理工具（推荐用于大多数场景）

使用团队密码管理工具（如 1Password、LastPass、Bitwarden）共享配置。

#### 操作步骤

1. **在密码管理工具中创建安全笔记**
   - 标题：`Novel2Video 部署配置`
   - 内容：复制 `deploy.env` 的内容
   - 设置为团队共享

2. **团队成员从密码管理工具复制配置**
   ```bash
   # 复制配置后，创建本地文件
   cp deploy.env.example deploy.env
   # 粘贴配置内容
   ```

**优点**：
- ✅ 安全性高
- ✅ 易于管理权限
- ✅ 支持审计日志
- ✅ 不需要额外工具

**缺点**：
- ⚠️ 需要团队成员使用相同的密码管理工具

### 方案3: 环境变量管理平台

使用 Vercel、Railway、AWS Secrets Manager 等平台管理环境变量。

#### 操作步骤

1. **在平台上创建环境变量**
   - 将部署配置作为环境变量存储
   - 设置团队访问权限

2. **修改部署脚本支持从平台读取**
   ```bash
   # 从环境变量管理平台获取配置
   export DEPLOY_HOST=$(get-secret deploy-host)
   export DEPLOY_DIR=$(get-secret deploy-dir)
   ```

**优点**：
- ✅ 高度集成 CI/CD
- ✅ 自动同步
- ✅ 权限管理完善

**缺点**：
- ⚠️ 可能需要付费
- ⚠️ 需要额外集成

### 方案4: 加密文档（临时方案）

使用加密工具加密配置文件后分享。

#### 操作步骤

1. **加密配置文件**
   ```bash
   # 使用 GPG 加密
   gpg --encrypt --recipient teammate@example.com deploy.env
   # 生成 deploy.env.gpg
   ```

2. **通过安全渠道分享**
   - 加密邮件
   - 安全聊天工具（如 Signal）
   - 团队内部文档系统

3. **团队成员解密**
   ```bash
   gpg --decrypt deploy.env.gpg > deploy.env
   ```

**优点**：
- ✅ 无需额外工具
- ✅ 快速设置

**缺点**：
- ⚠️ 需要手动同步
- ⚠️ 不方便频繁更新

### 方案5: 文档 + 安全渠道（最简单）

创建内部文档，通过安全渠道分享敏感信息。

#### 操作步骤

1. **创建内部文档**（如 Confluence、Notion）
   - 服务器地址
   - SSH 用户名
   - 项目目录
   - Git 分支

2. **通过安全渠道分享**
   - 公司内部聊天工具
   - 加密邮件
   - 面对面或电话

3. **团队成员手动配置**
   ```bash
   cp deploy.env.example deploy.env
   # 根据文档填写配置
   ```

**优点**：
- ✅ 最简单
- ✅ 无需额外工具

**缺点**：
- ⚠️ 安全性较低
- ⚠️ 需要手动同步

## 🎯 推荐实施方案

### 小型团队（2-5人）
**推荐：Git-crypt + 密码管理工具**

```bash
# 1. 使用 git-crypt 加密配置文件
# 2. 将密钥存储在团队密码管理工具中
# 3. 新成员加入时从密码管理工具获取密钥
```

### 中型团队（5-20人）
**推荐：密码管理工具 + 环境变量平台**

```bash
# 1. 开发环境：使用密码管理工具
# 2. 生产环境：使用环境变量管理平台（如 Vercel）
```

### 大型团队（20+人）
**推荐：环境变量管理平台 + CI/CD**

```bash
# 1. 所有配置存储在环境变量管理平台
# 2. CI/CD 自动从平台获取配置
# 3. 本地开发使用密码管理工具
```

## 📝 最佳实践

1. **最小权限原则**
   - 只给需要部署的人员访问权限
   - 定期审查访问权限

2. **定期轮换**
   - 定期更换 SSH 密钥
   - 定期更新密码

3. **审计日志**
   - 记录谁访问了配置
   - 记录部署操作

4. **备份密钥**
   - 安全备份加密密钥
   - 避免单点故障

5. **分离环境**
   - 开发、测试、生产环境分开管理
   - 使用不同的配置文件和密钥

## 🚀 快速开始

### 如果使用 Git-crypt（推荐）

```bash
# 1. 安装 git-crypt
brew install git-crypt  # macOS

# 2. 初始化（项目维护者执行）
git-crypt init

# 3. 配置 .gitattributes
echo "deploy.env filter=git-crypt diff=git-crypt" >> .gitattributes
echo ".env.deploy filter=git-crypt diff=git-crypt" >> .gitattributes

# 4. 导出密钥（保存到安全位置）
git-crypt export-key ./git-crypt-key

# 5. 提交加密文件
git add deploy.env .gitattributes
git commit -m "Add encrypted deploy config"

# 6. 团队成员解锁
git-crypt unlock git-crypt-key
```

### 如果使用密码管理工具

1. 在密码管理工具中创建条目：
   - **标题**：Novel2Video 部署配置
   - **类型**：安全笔记
   - **内容**：`deploy.env` 的完整内容
   - **共享**：团队成员访问权限

2. 团队成员从密码管理工具复制配置到本地 `deploy.env`

## ⚠️ 安全提醒

- ❌ **不要**通过未加密的渠道分享配置（如普通邮件、聊天工具）
- ❌ **不要**将配置提交到公开的 Git 仓库
- ❌ **不要**在截图或录屏中暴露配置信息
- ✅ **使用**加密渠道分享敏感信息
- ✅ **定期**更新和轮换密钥
- ✅ **限制**访问权限，只给需要的人

## 📞 需要帮助？

如果遇到问题，请联系团队负责人或查看项目文档。

