## ADDED Requirements

### Requirement: Agent 模式页面路由

系统 SHALL 提供独立的 Agent 创作模式页面路由 `/create-agent`，与现有专业模式并存。

#### Scenario: 访问 Agent 模式页面

- **WHEN** 用户访问 `/create-agent?creationId={uuid}`
- **THEN** 系统加载 Agent 模式页面，展示三栏式布局（侧边栏 + 看板区 + 对话区）
- **AND** 系统根据 creationId 加载对应的 creation 数据

#### Scenario: 无 creationId 参数访问

- **WHEN** 用户访问 `/create-agent` 但未提供 creationId 参数
- **THEN** 系统显示错误提示"无效的创作 ID"
- **AND** 提供返回首页或创建新项目的操作入口

---

### Requirement: 三栏式布局

Agent 模式页面 SHALL 采用三栏式布局，包含侧边栏、看板区和对话区。

#### Scenario: 桌面端布局 (>1400px)

- **WHEN** 用户在桌面端浏览器访问 Agent 模式
- **THEN** 页面展示三栏并列布局：
  - 左侧侧边栏（200px 固定宽度）
  - 中间看板区（flex-1 自适应）
  - 右侧对话区（400px 固定宽度）

#### Scenario: 平板端布局 (768-1400px)

- **WHEN** 用户在平板设备访问 Agent 模式
- **THEN** 侧边栏收起为图标栏
- **AND** 看板区和对话区占据主要空间

#### Scenario: 移动端布局 (<768px)

- **WHEN** 用户在移动设备访问 Agent 模式
- **THEN** 页面使用底部 Tab 切换布局
- **AND** Tab 选项包括：对话、看板、资产

---

### Requirement: SSE 对话连接

系统 SHALL 通过 SSE (Server-Sent Events) 协议与后端建立实时对话连接。

#### Scenario: 建立 SSE 连接

- **WHEN** 用户发送第一条消息
- **THEN** 系统向 `POST /creations/{uuid}/agent/chat` 发起 SSE 请求
- **AND** 请求头包含 `Accept: text/event-stream`
- **AND** 成功建立连接后显示连接状态为"已连接"

#### Scenario: 接收流式消息

- **WHEN** SSE 连接建立后，服务器推送 `message.content` 事件
- **THEN** 对话区逐字符显示 Agent 消息内容（流式打字效果）
- **AND** 消息内容实时更新至完整

#### Scenario: SSE 连接中断

- **WHEN** SSE 连接因网络问题中断
- **THEN** 系统自动尝试重连（最多 3 次，指数退避）
- **AND** 显示连接状态为"重连中"
- **AND** 如果重连失败，显示错误提示并提供手动重连按钮

#### Scenario: SSE 连接降级

- **WHEN** SSE 连接连续失败 3 次
- **THEN** 系统自动切换到轮询模式（每 2 秒请求一次历史消息）
- **AND** 显示提示"实时连接失败，已切换到轮询模式"

---

### Requirement: 对话消息管理

系统 SHALL 管理用户与 Agent 之间的对话消息历史。

#### Scenario: 用户发送消息

- **WHEN** 用户在输入框输入文本并点击发送
- **THEN** 消息立即添加到消息列表，显示为"发送中"状态
- **AND** 系统通过 SSE 连接发送消息到服务器
- **AND** 消息状态更新为"已发送"

#### Scenario: 接收 Agent 回复

- **WHEN** 服务器推送 `message.start` 事件
- **THEN** 对话区添加新的 Agent 消息占位符
- **AND** 随后的 `message.content` 事件逐步填充消息内容
- **AND** 收到 `message.end` 事件后，消息状态标记为"已完成"

#### Scenario: 消息列表自动滚动

- **WHEN** 新消息添加到列表
- **AND** 用户未手动向上滚动（距离底部 <50px）
- **THEN** 消息列表自动滚动到最新消息

---

### Requirement: SSE 事件处理

系统 SHALL 正确处理 12 种 SSE 事件类型。

#### Scenario: 处理思考过程事件

- **WHEN** 接收到 `thinking.start` 和 `thinking.content` 事件
- **THEN** 对话区显示"Agent 正在思考..."指示器
- **AND** 展开区域显示思考内容（可折叠）
- **AND** 收到 `thinking.end` 事件后隐藏思考指示器

#### Scenario: 处理工具调用事件

- **WHEN** 接收到 `tool.call` 事件
- **THEN** 对话区显示工具调用卡片，包含工具名称和参数
- **AND** 显示"调用中"状态
- **WHEN** 接收到 `tool.output` 事件
- **THEN** 工具调用卡片更新为"成功"或"失败"状态
- **AND** 展示工具返回的结果数据

#### Scenario: 处理进度更新事件

- **WHEN** 接收到 `progress.update` 事件
- **THEN** 对话区显示进度条，展示任务进度百分比
- **AND** 显示详细进度信息（已完成项 / 总项数）
- **AND** 显示预计剩余时间

#### Scenario: 处理操作请求事件

- **WHEN** 接收到 `action.request` 事件
- **THEN** 对话区显示操作按钮组
- **AND** 按钮样式根据类型显示（primary / secondary）
- **WHEN** 用户点击某个按钮
- **THEN** 系统发送 `action_response` 到服务器
- **AND** 按钮组隐藏

---

### Requirement: 看板视图切换

系统 SHALL 提供 6 种看板视图，可通过 Tab 或 Agent 指令切换。

#### Scenario: 手动切换看板视图

- **WHEN** 用户点击看板区顶部的视图 Tab（剧本/角色/场景/分镜/时间线/预览）
- **THEN** 看板区切换到对应视图
- **AND** 当前 Tab 高亮显示
- **AND** 看板内容根据 creation 数据渲染

#### Scenario: Agent 指令切换看板视图

- **WHEN** 接收到 `board.action` 事件，action 为 `switch_view`
- **THEN** 看板区自动切换到指定视图（如 `characters`）
- **AND** 对应 Tab 高亮显示
- **AND** 看板内容更新

---

### Requirement: 对话-看板联动

系统 SHALL 实现对话与看板的双向联动，Agent 指令可控制看板行为，看板操作可同步到对话。

#### Scenario: Agent 高亮看板元素

- **WHEN** 接收到 `board.action` 事件，action 为 `highlight`
- **THEN** 看板区定位到目标元素（通过 target ID）
- **AND** 目标元素添加高亮动画（绿色边框 + 脉动效果）
- **AND** 高亮持续指定时长（默认 3 秒）后自动消失

#### Scenario: Agent 滚动到看板元素

- **WHEN** 接收到 `board.action` 事件，action 为 `scroll`
- **THEN** 看板区平滑滚动到目标元素位置
- **AND** 目标元素显示在可视区域中央

#### Scenario: 看板操作同步到对话

- **WHEN** 用户在看板上点击"重做分镜"按钮
- **THEN** 对话区添加用户操作记录："[用户操作] 请求重做分镜 #3"
- **AND** 系统发送 `action_response` 到服务器，包含操作详情

---

### Requirement: 模式切换

系统 SHALL 支持 Agent 模式与专业模式之间的无缝切换。

#### Scenario: 从专业模式切换到 Agent 模式

- **WHEN** 用户在专业模式页面点击"切换到 Agent 模式"开关
- **THEN** 系统导航到 `/create-agent?creationId={uuid}`
- **AND** 系统强制刷新 creation 数据
- **AND** Agent 模式页面加载，显示相同的 creation 数据

#### Scenario: 从 Agent 模式切换到专业模式

- **WHEN** 用户在 Agent 模式页面点击"切换到专业模式"开关
- **THEN** 系统导航到 `/create-v2?creationId={uuid}`
- **AND** 系统强制刷新 creation 数据
- **AND** 专业模式页面加载，显示相同的 creation 数据

#### Scenario: 切换前未保存提示

- **WHEN** 用户尝试切换模式
- **AND** 当前有未保存的更改
- **THEN** 系统显示确认对话框："有未保存的更改，是否继续？"
- **WHEN** 用户点击"取消"
- **THEN** 保持在当前模式，不执行切换
- **WHEN** 用户点击"继续"
- **THEN** 执行模式切换

---

### Requirement: 侧边栏资产导航

系统 SHALL 在左侧侧边栏展示项目资产导航和进度信息。

#### Scenario: 展示资产树

- **WHEN** Agent 模式页面加载完成
- **THEN** 侧边栏显示可折叠的资产树，包含：
  - 角色列表（显示角色数量和缩略图）
  - 场景列表（显示场景数量和缩略图）
  - 道具列表（显示道具数量）
  - 分镜列表（显示分镜数量和分组）

#### Scenario: 点击资产项

- **WHEN** 用户点击侧边栏的某个资产项（如"角色 - 小明"）
- **THEN** 看板区自动切换到对应视图（角色视图）
- **AND** 滚动到目标资产（小明的卡片）
- **AND** 高亮显示该资产

#### Scenario: 展示项目进度

- **WHEN** creation 数据包含进度信息
- **THEN** 侧边栏显示进度条和阶段状态：
  - 剧本解析 ✅
  - 资产生成 ⏳
  - 分镜制作 ○
  - 音频处理 ○
  - 剪辑合成 ○

---

### Requirement: 角色视图

系统 SHALL 在看板区提供角色视图，展示所有角色及其候选形象。

#### Scenario: 展示角色列表

- **WHEN** 看板切换到角色视图
- **THEN** 看板区显示所有角色的卡片列表
- **AND** 每个卡片包含：
  - 角色名称、年龄、性格、外貌描述
  - 当前选中的形象（大图）
  - 4 个候选形象（缩略图）
  - 锁定状态标识（已锁定 / 待确认）

#### Scenario: 选择角色形象

- **WHEN** 用户点击某个候选形象
- **THEN** 该候选形象标记为选中（✓ 标识）
- **AND** 大图更新为选中的候选形象
- **AND** 角色状态更新为"待确认"

#### Scenario: 锁定角色资产

- **WHEN** 用户点击"锁定资产"按钮
- **THEN** 角色卡片显示"已锁定"标识（🔒）
- **AND** 候选形象区域禁用，无法再修改
- **AND** 系统通知 Agent："角色 {name} 已锁定"

---

### Requirement: 分镜视图

系统 SHALL 在看板区提供分镜视图，展示所有分镜的网格或列表布局。

#### Scenario: 网格布局展示分镜

- **WHEN** 看板切换到分镜视图
- **AND** 用户选择"网格"布局
- **THEN** 看板区以网格形式展示所有分镜卡片
- **AND** 每个卡片包含：
  - 分镜编号（#1, #2, ...）
  - 缩略图或视频播放器
  - 状态标识（✅ 通过 / ⚠️ 待审 / ⏳ 生成中 / ❌ 失败）
  - 时长

#### Scenario: 点击分镜查看详情

- **WHEN** 用户点击某个分镜卡片
- **THEN** 看板区展开详情面板，显示：
  - 完整视频播放器
  - 镜头描述
  - 对白内容
  - 时长
  - 操作按钮（✅ 通过 / 🔄 重做画面 / ✏️ 改描述 / 🗑️ 删除）

#### Scenario: 批量审核分镜

- **WHEN** 用户点击"全部通过"按钮
- **THEN** 所有待审分镜状态更新为"通过"
- **AND** 系统通知 Agent："第 1-5 个分镜已全部通过"

---

### Requirement: 时间线视图

系统 SHALL 在看板区提供时间线视图，展示视频、音频、BGM 的时间轴编排。

#### Scenario: 展示时间线轨道

- **WHEN** 看板切换到时间线视图
- **THEN** 看板区显示多轨道时间线：
  - 视频轨道（分镜片段）
  - 音频轨道（对白片段）
  - BGM 轨道（背景音乐）
- **AND** 时间轴标尺显示时间刻度（00:00, 00:30, 01:00, ...）

#### Scenario: 播放时间线

- **WHEN** 用户点击"播放"按钮
- **THEN** 时间线指针移动，播放当前位置的视频和音频
- **AND** 播放器控制栏显示播放进度和总时长

---

### Requirement: 预览视图

系统 SHALL 在看板区提供预览视图，展示完整的成片预览和导出选项。

#### Scenario: 播放成片预览

- **WHEN** 看板切换到预览视图
- **AND** creation 的 video_url 存在
- **THEN** 看板区显示视频播放器，自动加载成片
- **AND** 播放器提供播放/暂停、进度条、音量、全屏等控制

#### Scenario: 配置导出设置

- **WHEN** 用户在预览视图点击"导出设置"
- **THEN** 显示导出配置面板，包含：
  - 分辨率选择（1080p / 720p / 480p）
  - 格式选择（MP4 / MOV）
  - 质量选择（高 / 中 / 低）
  - 附加选项（包含字幕 / 包含水印 / 仅导出音频）

#### Scenario: 导出成片

- **WHEN** 用户点击"导出成片"按钮
- **THEN** 系统开始导出任务，显示导出进度
- **AND** 导出完成后提供下载链接

---

### Requirement: 性能优化

系统 SHALL 优化性能，确保在高频消息和长列表场景下流畅运行。

#### Scenario: 节流消息更新

- **WHEN** SSE 连接推送高频 `message.content` 事件（>100/秒）
- **THEN** 系统使用节流机制，每 50ms 更新一次消息内容
- **AND** UI 渲染保持流畅，无明显卡顿

#### Scenario: 虚拟滚动长消息列表

- **WHEN** 消息列表超过 100 条
- **THEN** 系统启用虚拟滚动机制
- **AND** 仅渲染可视区域内的消息（约 20-30 条）
- **AND** 滚动时动态加载/卸载消息

---

### Requirement: 错误处理

系统 SHALL 提供完善的错误处理和用户提示。

#### Scenario: 工具调用失败

- **WHEN** 接收到 `tool.output` 事件，status 为 `error`
- **THEN** 对话区显示错误消息卡片，包含：
  - 错误原因
  - 建议操作
  - 重试按钮
- **WHEN** 用户点击"重试"按钮
- **THEN** 系统重新发送工具调用请求

#### Scenario: 紧急退出到专业模式

- **WHEN** Agent 模式遇到严重错误（SSE 连接失败且降级也失败）
- **THEN** 系统显示错误提示："Agent 模式遇到问题，切换到专业模式"
- **AND** 自动导航到专业模式页面
- **AND** creation 数据保持完整

---

### Requirement: 国际化支持

系统 SHALL 支持多语言界面（中文、英文）。

#### Scenario: 中文界面

- **WHEN** 用户浏览器语言设置为中文
- **THEN** Agent 模式界面显示中文文案
- **AND** Agent 对话使用中文
- **AND** 看板标签和按钮显示中文

#### Scenario: 英文界面

- **WHEN** 用户浏览器语言设置为英文
- **THEN** Agent 模式界面显示英文文案
- **AND** Agent 对话使用英文
- **AND** 看板标签和按钮显示英文
