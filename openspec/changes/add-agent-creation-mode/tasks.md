## 1. 基础架构搭建

- [x] 1.1 创建 `/create-agent` 路由页面 (`src/app/[locale]/create-agent/page.tsx`)
- [x] 1.2 实现三栏式布局容器组件 (`src/components/agent/agent-workspace.tsx`)
- [x] 1.3 创建 Agent 状态管理 (`src/stores/agent-store.ts`)
- [x] 1.4 定义 Agent 相关类型 (`src/types/agent.ts`)
- [x] 1.5 扩展 creation-v2 store 添加 mode 字段

## 2. SSE 对话功能实现

- [x] 2.1 实现 SSE 连接管理 Hook (`src/hooks/use-sse-connection.ts`)
- [x] 2.2 实现 Agent 对话管理 Hook (`src/hooks/use-agent-chat.ts`)
- [x] 2.3 封装 Agent API 服务 (`src/lib/api/agent-api.ts`)
- [x] 2.4 实现对话面板组件 (`src/components/agent/agent-chat-panel.tsx`)
- [x] 2.5 开发消息组件
  - [x] 2.5.1 消息列表 (`chat-message-list.tsx`)
  - [x] 2.5.2 消息气泡 (`chat-message-item.tsx`)
  - [x] 2.5.3 思考过程展示 (`chat-thinking.tsx`)
  - [x] 2.5.4 工具调用展示 (`chat-tool-call.tsx`)
  - [x] 2.5.5 进度条组件 (`chat-progress.tsx`)
  - [x] 2.5.6 操作按钮 (`chat-action-buttons.tsx`)
  - [x] 2.5.7 输入框 (`chat-input.tsx`)
- [x] 2.6 集成 12 种 SSE 事件处理
- [x] 2.7 实现流式打字效果

## 3. 看板视图实现

- [x] 3.1 实现看板容器组件 (`src/components/agent/agent-canvas.tsx`)
- [x] 3.2 开发剧本视图 (`src/components/agent/canvas-script-view.tsx`)
- [x] 3.3 开发角色视图 (`src/components/agent/canvas-character-view.tsx`)
- [x] 3.4 开发场景视图 (`src/components/agent/canvas-scene-view.tsx`)
- [x] 3.5 开发分镜视图 (`src/components/agent/canvas-storyboard-view.tsx`)
- [x] 3.6 开发时间线视图 (`src/components/agent/canvas-timeline-view.tsx`)
- [x] 3.7 开发预览视图 (`src/components/agent/canvas-preview-view.tsx`)
- [x] 3.8 实现侧边栏资产导航 (`src/components/agent/agent-sidebar.tsx`)

## 4. 对话-看板联动

- [x] 4.1 实现看板操作 Hook (`src/hooks/use-agent-board.ts`)
- [x] 4.2 实现 board.action 事件处理（switch_view, highlight, scroll, update）
- [x] 4.3 开发高亮动画效果
- [x] 4.4 开发滚动定位功能
- [x] 4.5 实现看板操作同步到对话
- [x] 4.6 实现数据双向同步机制

## 5. 模式切换

- [x] 5.1 开发模式切换组件 (`src/components/agent/mode-switcher.tsx`)
- [x] 5.2 实现状态同步逻辑（React Query 缓存 + URL 参数）
- [x] 5.3 添加切换时的数据校验和保存提示
- [x] 5.4 在专业模式页面集成切换器
- [x] 5.5 在 Agent 模式页面集成切换器
- [x] 5.6 在故事设置页面添加模式选择入口

## 6. 优化与完善

- [x] 6.1 性能优化
  - [x] 6.1.1 实现消息更新节流（50ms）
  - [x] 6.1.2 实现虚拟滚动（消息列表 >100 条）
  - [x] 6.1.3 优化 SSE 事件解析性能
- [x] 6.2 错误处理
  - [x] 6.2.1 实现 SSE 自动重连机制
  - [x] 6.2.2 实现轮询降级方案
  - [x] 6.2.3 添加工具调用失败重试
  - [x] 6.2.4 添加紧急退出到专业模式
- [x] 6.3 用户体验
  - [x] 6.3.1 添加加载状态指示器
  - [x] 6.3.2 优化页面过渡动画
  - [x] 6.3.3 添加空状态提示
  - [x] 6.3.4 实现自动滚动到底部
- [x] 6.4 国际化
  - [x] 6.4.1 添加 Agent 模式相关中文文案
  - [x] 6.4.2 添加 Agent 模式相关英文文案（如需要）

## 7. 测试与验证

- [x] 7.1 功能测试
  - [x] 7.1.1 验证完整 Agent 创作流程 (`tests/e2e/agent-creation-flow.spec.ts`)
  - [x] 7.1.2 验证模式切换功能 (`tests/e2e/mode-switch.spec.ts`)
  - [x] 7.1.3 验证对话-看板联动 (`tests/e2e/board-linkage.spec.ts`)
  - [x] 7.1.4 验证 12 种 SSE 事件处理 (`tests/e2e/sse-events.spec.ts`)
- [x] 7.2 性能测试
  - [x] 7.2.1 测试高频消息场景（>100/秒） (`tests/e2e/performance.spec.ts`)
  - [x] 7.2.2 测试长消息列表滚动（>100 条） (`tests/e2e/performance.spec.ts`)
  - [x] 7.2.3 测试网络中断自动重连 (`tests/e2e/performance.spec.ts`)
- [x] 7.3 兼容性测试
  - [x] 7.3.1 Chrome/Edge 最新版 (`tests/e2e/compatibility.spec.ts`)
  - [x] 7.3.2 Safari 最新版 (`tests/e2e/compatibility.spec.ts`)
  - [x] 7.3.3 Firefox 最新版 (`tests/e2e/compatibility.spec.ts`)
  - [x] 7.3.4 移动端浏览器 (`tests/e2e/compatibility.spec.ts`)
- [x] 7.4 文档更新
  - [x] 7.4.1 更新 README.md
  - [x] 7.4.2 更新 API 文档 (`tests/mocks/api-mock.ts`)
  - [x] 7.4.3 编写用户使用指南

## 8. 测试运行指南

测试脚本已添加到 `package.json`:
- `pnpm test` - 运行所有测试
- `pnpm test:ui` - 使用 Playwright UI 运行测试
- `pnpm test:headed` - 有头模式运行测试
- `pnpm test:chrome` - 仅运行 Chrome 测试
- `pnpm test:firefox` - 仅运行 Firefox 测试
- `pnpm test:safari` - 仅运行 Safari 测试
- `pnpm test:mobile` - 运行移动端测试
- `pnpm test:report` - 查看测试报告
