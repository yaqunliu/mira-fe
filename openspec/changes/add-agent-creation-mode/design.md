## Context

漫剧 AI 创作平台当前仅提供专业模式，用户需要手动操作 5 个步骤（故事设置、角色生成、脚本编辑、分镜生成、视频合成）。为了降低使用门槛并提升用户体验，需要引入 Agent 模式，通过自然语言对话自动引导用户完成整个创作流程。

**技术背景**:
- 前端框架：Next.js 15, React 19, TypeScript
- 状态管理：Zustand + Immer
- 数据获取：React Query (TanStack Query)
- UI 组件：Radix UI + TailwindCSS
- API 协议：RESTful + SSE (Server-Sent Events)

**产品设计依据**:
- 产品设计文档：`漫剧Agent产品设计文档.md`
- API 接口文档：`docs/agent-chat-api.md`

**约束条件**:
- 必须与现有专业模式共存，不影响现有功能
- 两种模式需要共享同一个 creation 数据实例
- SSE 连接需要处理网络不稳定情况
- 需要支持桌面端和移动端响应式布局

---

## Goals / Non-Goals

### Goals

1. ✅ 实现完整的 Agent 对话创作流程，覆盖从剧本解析到视频生成的全流程
2. ✅ 提供直观的三栏式布局（侧边栏 + 看板区 + 对话区）
3. ✅ 实现对话-看板联动，Agent 指令可自动控制看板行为
4. ✅ 支持 Agent 模式与专业模式的无缝切换
5. ✅ 确保 SSE 连接稳定性，提供自动重连和降级方案
6. ✅ 优化性能，支持高频消息和长列表场景

### Non-Goals

- ❌ 不修改现有专业模式的实现逻辑
- ❌ 不支持多人实时协作（后续迭代）
- ❌ 不支持语音输入（后续迭代）
- ❌ 不实现历史会话管理（后续迭代）

---

## Decisions

### 决策 1: 路由策略 - 新建独立路由 `/create-agent`

**选择**: 新建 `/create-agent` 路由，而非修改现有 `/create-v2` 页面

**理由**:
- Agent 模式需要完全不同的 UI 布局（三栏式 vs 单栏式）
- 降低代码耦合，便于独立开发和测试
- 减少对现有专业模式的影响，降低回归风险
- 便于后续独立优化和迭代

**替代方案**:
- 方案 A: 在 `/create-v2` 中通过条件渲染切换布局
  - 优点：路由统一，代码集中
  - 缺点：组件逻辑复杂，耦合度高，测试困难
- 方案 B: 使用动态路由 `/create?mode=agent`
  - 优点：路由参数控制模式
  - 缺点：URL 不够语义化，状态管理复杂

### 决策 2: 状态管理 - 多 Store 架构

**选择**: 扩展 `creation-v2` store + 新增 `agent` store

**理由**:
- `creation-v2` store 管理共享的 creation 数据（characters, scenes, etc.）
- `agent` store 管理 Agent 模式特有的状态（messages, SSE 连接, 看板视图）
- 职责分离，避免单一 store 过于庞大
- 便于两种模式共享 creation 数据

**数据流**:
```
creation-v2 store (共享)
├── creation: ICreation
├── mode: 'agent' | 'professional'
└── currentStep: number

agent store (Agent 模式专用)
├── messages: AgentMessage[]
├── isConnected: boolean
├── currentView: ViewType
└── pendingActionRequest: ActionRequest | null

React Query Cache (API 数据)
└── ['creation', creationId] → 同步到 creation-v2 store
```

**替代方案**:
- 方案 A: 所有状态放在一个 store
  - 优点：集中管理
  - 缺点：store 过于庞大，难以维护
- 方案 B: 完全独立的两套 store
  - 优点：完全解耦
  - 缺点：数据同步复杂，重复代码多

### 决策 3: SSE 连接管理 - 自定义 Hook + 自动重连

**选择**: 使用 Fetch API + ReadableStream 实现 SSE，封装为 `use-sse-connection` Hook

**理由**:
- 原生 EventSource API 不支持自定义请求头和 POST 方法
- Fetch API 提供更灵活的控制能力
- 封装为 Hook 便于复用和测试
- 支持自动重连和心跳检测

**实现策略**:
```typescript
// 核心实现
const connect = async (requestBody: any) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(requestBody),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const events = parseSSEChunk(chunk);

    for (const event of events) {
      handleEvent(event);
    }
  }
};

// 自动重连
const reconnect = async () => {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      await connect(lastRequest);
      break;
    } catch (err) {
      retries++;
      await sleep(RETRY_DELAY * retries); // 指数退避
    }
  }
};
```

**替代方案**:
- 方案 A: 使用 EventSource API
  - 优点：浏览器原生支持
  - 缺点：不支持 POST 和自定义请求头
- 方案 B: 使用 WebSocket
  - 优点：双向通信
  - 缺点：后端需要修改，不符合现有 API 设计

### 决策 4: 模式切换 - URL 参数 + React Query 缓存共享

**选择**: 通过 URL 参数 `creationId` + React Query 缓存实现数据同步

**理由**:
- URL 参数保证两个页面访问同一个 creation 实例
- React Query 缓存自动共享相同 key 的数据
- 切换时强制刷新确保数据一致性
- 实现简单，可靠性高

**实现流程**:
```
用户点击切换
  ↓
router.push(`/create-agent?creationId=${id}`)
  ↓
queryClient.invalidateQueries(['creation', id])
  ↓
新页面挂载，useQuery 自动获取最新数据
  ↓
两个页面共享同一份缓存数据
```

**替代方案**:
- 方案 A: 使用全局状态 (Zustand)
  - 优点：无需刷新
  - 缺点：页面刷新后状态丢失，需要持久化
- 方案 B: 使用 localStorage
  - 优点：持久化
  - 缺点：同步复杂，容易出现数据不一致

### 决策 5: 对话-看板联动 - 事件驱动 + DOM 操作

**选择**: Agent 通过 `board.action` 事件触发看板操作，前端通过 DOM API 实现动画效果

**理由**:
- 事件驱动模式解耦对话和看板逻辑
- DOM 操作提供精确的动画控制
- 性能优秀，动画流畅

**实现示例**:
```typescript
// Agent 发送 board.action 事件
{
  type: 'board.action',
  actions: [
    { action: 'switch_view', target: 'characters' },
    { action: 'highlight', target: 'character_xiaoming', data: { duration: 3000 } },
    { action: 'scroll', target: 'character_xiaoming' }
  ]
}

// 前端处理
const executeBoardActions = (actions: BoardAction[]) => {
  for (const action of actions) {
    switch (action.action) {
      case 'switch_view':
        setBoardView(action.target);
        break;
      case 'highlight':
        const el = document.getElementById(action.target);
        el?.classList.add('ring-2', 'ring-green-500', 'animate-pulse');
        setTimeout(() => {
          el?.classList.remove('ring-2', 'ring-green-500', 'animate-pulse');
        }, action.data?.duration || 3000);
        break;
      case 'scroll':
        document.getElementById(action.target)?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  }
};
```

**替代方案**:
- 方案 A: 完全通过状态管理
  - 优点：React 声明式
  - 缺点：动画控制不够精确，性能较差
- 方案 B: 使用动画库（Framer Motion）
  - 优点：动画效果丰富
  - 缺点：增加依赖，bundle size 增大

---

## Risks / Trade-offs

### 风险 1: SSE 连接不稳定

**风险描述**: 网络中断或服务器重启导致 SSE 连接断开，用户无法继续对话

**影响**: 高 - 核心功能不可用

**缓解方案**:
1. 实现自动重连机制（指数退避重试）
2. 添加心跳检测（30秒无消息自动重连）
3. 降级到轮询模式（SSE 连续失败 3 次后）
4. 显示连接状态，提示用户网络问题

**实现**:
```typescript
// 心跳检测
setInterval(() => {
  if (isConnected && Date.now() - lastEventTime > 30000) {
    reconnect();
  }
}, 10000);

// 降级到轮询
if (sseConnectFailed) {
  toast.warning('实时连接失败，切换到轮询模式');
  const pollInterval = setInterval(async () => {
    const response = await agentApi.getMessages(creationId, { after: lastMessageId });
    if (response.data.messages.length > 0) {
      addMessages(response.data.messages);
    }
  }, 2000);
}
```

### 风险 2: 消息渲染性能问题

**风险描述**: 高频消息更新（>100/秒）导致 UI 卡顿

**影响**: 中 - 用户体验下降

**缓解方案**:
1. 实现消息更新节流（50ms 更新一次）
2. 使用虚拟滚动（消息列表 >100 条）
3. 优化 React 渲染（useMemo, useCallback）

**实现**:
```typescript
// 节流更新
const throttledUpdate = throttle((content: string) => {
  updateMessage(messageId, { content });
}, 50);

// 虚拟滚动
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 80,
});
```

### 风险 3: 看板与对话数据不同步

**风险描述**: Agent 更新看板但后端数据未同步，或用户手动修改后 Agent 不知情

**影响**: 中 - 数据不一致，用户困惑

**缓解方案**:
1. 实现双向同步机制（对话 → 看板，看板 → 对话）
2. 使用乐观更新（UI 立即响应，后台异步同步）
3. 定期刷新 creation 数据（任务完成后）

**实现**:
```typescript
// 对话触发看板更新
const executeBoardAction = (action: BoardAction) => {
  if (action.action === 'update') {
    updateLocalState(action.data); // 乐观更新
    setTimeout(() => {
      queryClient.invalidateQueries(['creation', creationId]); // 刷新后端数据
    }, 500);
  }
};

// 看板操作同步到对话
const handleRegenerateShot = (shotId: string) => {
  sendMessage('', {
    action_response: {
      request_id: 'board_operation',
      action_id: 'regenerate_shot',
      data: { shot_id: shotId }
    }
  });
};
```

### 风险 4: 模式切换丢失数据

**风险描述**: 用户在 Agent 模式修改后切换到专业模式，或反之，修改未保存

**影响**: 高 - 用户操作丢失

**缓解方案**:
1. 切换前检查是否有未保存的更改
2. 切换时强制刷新 creation 数据
3. 使用 React Query 缓存确保数据一致性

**实现**:
```typescript
const handleModeSwitch = async () => {
  if (hasUnsavedChanges) {
    const confirmed = await confirm('有未保存的更改，是否继续？');
    if (!confirmed) return;
  }

  queryClient.invalidateQueries(['creation', creationId]);
  router.push(targetPath);
};
```

### Trade-off 1: 新建路由 vs 条件渲染

**选择**: 新建独立路由 `/create-agent`

**优点**:
- 代码解耦，便于维护
- 降低回归风险
- 独立优化和测试

**缺点**:
- 路由增加，需要额外维护
- 部分代码可能重复（如 creation 数据获取）

**判断**: 优点远大于缺点，选择新建路由

### Trade-off 2: SSE vs WebSocket

**选择**: 使用 SSE (Server-Sent Events)

**优点**:
- 单向通信满足需求（服务器 → 客户端）
- 基于 HTTP，无需额外协议
- 自动重连简单
- 符合现有 API 设计

**缺点**:
- 仅支持单向通信
- 不如 WebSocket 灵活

**判断**: SSE 满足 Agent 对话场景需求，无需双向通信

---

## Migration Plan

本次变更为新增功能，无需迁移现有数据或代码。

**部署步骤**:

1. **阶段 1: 基础架构部署（可与现有系统并行）**
   - 部署 `/create-agent` 路由
   - 部署 Agent 状态管理
   - 部署 SSE 连接基础设施

2. **阶段 2: 功能完善（灰度发布）**
   - 小范围用户开启 Agent 模式入口
   - 收集反馈，修复 bug
   - 逐步扩大用户范围

3. **阶段 3: 全量发布**
   - 所有用户可见 Agent 模式选项
   - 监控 SSE 连接稳定性和性能指标
   - 持续优化用户体验

**回滚方案**:

如遇严重问题，可通过以下方式回滚：

1. 隐藏 Agent 模式入口（前端配置开关）
2. 禁用 `/create-agent` 路由（重定向到 `/create-v2`）
3. 保持专业模式不受影响

**监控指标**:

- SSE 连接成功率（目标 >99%）
- 平均消息延迟（目标 <500ms）
- 页面加载时间（目标 <3s）
- 模式切换成功率（目标 100%）
- 用户完成创作率（Agent vs 专业模式对比）

---

## Open Questions

1. **Q: Agent 模式的引导流程是否需要新手教程？**
   - A: 待产品团队确认，可在 v1.1 迭代中添加

2. **Q: 是否需要支持历史会话管理（多个 creation 的对话历史）？**
   - A: 不在本次变更范围，可在后续迭代中添加

3. **Q: 移动端 Agent 模式的布局如何适配？**
   - A: 采用 Tab 切换（对话 / 看板 / 资产），详见产品设计文档第 8 节

4. **Q: Agent 模式是否需要支持多语言（英文）？**
   - A: 架构支持，文案需补充英文翻译

5. **Q: SSE 连接的超时时间设置为多少？**
   - A: 默认 60 秒，可根据实际情况调整
