## Why

当前专业模式需要用户手动操作每个步骤（故事设置、角色生成、脚本编辑、分镜生成、视频合成），学习成本较高。通过引入 Agent 模式，用户可以通过自然语言对话完成整个创作流程，Agent 自动引导并处理复杂操作，显著降低使用门槛并提升用户体验。

## What Changes

- 新增 Agent 创作模式页面 (`/create-agent`)，采用三栏式布局（侧边栏 + 看板区 + 对话区）
- 实现基于 SSE (Server-Sent Events) 的对话 API 集成，支持 12 种事件类型的流式通信
- 新增对话-看板联动机制，Agent 指令可自动控制看板视图切换、元素高亮、滚动定位
- 支持 Agent 模式与专业模式的无缝切换，两种模式共享同一个 creation 数据实例
- 新增 6 大看板视图（剧本、角色、场景、分镜、时间线、预览）
- 新增侧边栏资产导航，展示项目进度和资源消耗

## Impact

- **影响范围**: 新增功能，不影响现有专业模式 (`/create` 和 `/create-v2`)
- **受影响的 specs**:
  - 新增：`agent-creation` (Agent 创作模式)
  - 扩展：`creation-flow` (添加 mode 字段支持模式切换)
- **受影响的代码**:
  - 新增文件：约 20 个（组件、Hooks、状态管理）
  - 修改文件：3 个 (`creation-v2.ts`, `zh.json`, `story-setting.tsx`)
- **新增 API 端点**:
  - `POST /creations/{uuid}/agent/chat` (SSE 对话)
  - `GET /creations/{uuid}/agent/messages` (历史消息)
  - `POST /creations/{uuid}/agent/interrupt` (中断对话)
  - `POST /creations/{uuid}/agent/reset` (重置会话)
- **技术风险**: SSE 连接稳定性、消息渲染性能、数据同步一致性（已有缓解方案）
- **用户影响**: 降低学习成本，提供全自动创作选项，与专业模式形成能力互补
