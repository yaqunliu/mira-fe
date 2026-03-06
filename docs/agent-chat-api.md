# 漫剧 Agent 对话 API 文档

## 概述

漫剧 Agent 对话 API 基于 Server-Sent Events (SSE) 协议，提供实时的 AI Agent 交互能力。用户通过创作 UUID 建立会话，发送消息并接收流式响应，包括 Agent 思考过程、工具调用、进度更新和看板操作指令。

**版本**: v1.0
**协议**: SSE (Server-Sent Events)
**基础URL**: `https://api.example.com/v1`

---

## 核心概念

### 创作会话（Creation Session）
每个漫剧创作项目通过唯一的 `creation_uuid` 标识，所有对话和操作都在该会话上下文中进行。

**多轮对话机制**：
- 同一个 `creation_uuid` 下的所有对话请求都会**自动保持上下文连续性**
- 用户每次发送新消息时，后端会自动加载该会话的历史对话记录
- Agent 能够理解上下文，回答引用之前的内容（如"小明的眼镜改成圆框的"）
- 无需在请求中手动传递历史记录，后端会自动管理

**使用流程**：
```
1. 创建项目 → 获得 creation_uuid
2. 用户发送消息1 → POST /creations/{uuid}/agent/chat (首次对话)
3. 用户发送消息2 → POST /creations/{uuid}/agent/chat (继续对话，自动带上下文)
4. 用户发送消息3 → POST /creations/{uuid}/agent/chat (继续对话，自动带上下文)
...
```

每次调用都是**独立的 HTTP 请求**，但通过 `creation_uuid` 关联到同一个会话，后端会：
- 自动加载历史消息
- 维护创作项目的状态（当前阶段、已生成的资产等）
- 保持 Agent 的上下文理解能力

### SSE 事件流
API 使用 SSE 协议返回多种类型的事件，客户端需要监听并处理不同的事件类型。

**SSE 连接生命周期**：
- 每次调用 `chat` 接口会建立一个新的 SSE 连接
- 当 Agent 回复完成（收到 `message.end` 事件）后，SSE 连接关闭
- 下次用户发送新消息时，再建立新的 SSE 连接
- 这是正常的，不是断线重连，而是请求-响应的自然结束

---

## API 端点

### 1. 发起 Agent 对话

**端点**: `POST /creations/{creation_uuid}/agent/chat`

**描述**: 向 Agent 发送用户消息，建立 SSE 连接接收流式响应。

#### 请求参数

**路径参数**:
- `creation_uuid` (string, required): 创作项目的唯一标识符

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {access_token}
Accept: text/event-stream
```

**请求体**:
```json
{
  "message": "这是一个咖啡店相遇的爱情故事...",
  "attachments": [
    {
      "type": "file",
      "name": "剧本.txt",
      "url": "https://storage.example.com/files/script.txt",
      "mime_type": "text/plain"
    }
  ],
  "context": {
    "current_stage": "script_analysis",
    "user_action": null
  },
  "action_response": null,
  "stream": true
}
```

**字段说明**:
- `message` (string, required): 用户输入的文本消息
- `attachments` (array, optional): 附件列表（剧本、图片等）
  - `type`: 附件类型 (`file`, `image`, `url`)
  - `name`: 文件名
  - `url`: 文件访问地址
  - `mime_type`: MIME 类型
- `context` (object, optional): 上下文信息
  - `current_stage`: 当前所处阶段
  - `user_action`: 用户操作类型（如点击按钮）
- `action_response` (object, optional): 响应之前的 `action.request` 事件
  - `request_id`: 对应的请求 ID
  - `action_id`: 用户选择的操作 ID
  - `data`: 附加数据（可选）
- `stream` (boolean, optional): 是否使用流式响应，默认 true

#### 响应格式

**状态码**: `200 OK`

**响应头**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**SSE 事件流**:

响应为持续的 SSE 事件流，每个事件格式如下：

```
event: {event_type}
id: {event_id}
data: {json_data}

```

---

## SSE 事件类型

### 1. `message.start` - 消息开始

表示 Agent 开始新的消息回复。

```json
{
  "type": "message.start",
  "message_id": "msg_abc123",
  "timestamp": "2025-01-27T10:30:00Z"
}
```

### 2. `message.content` - 消息内容流式输出

Agent 消息的文本内容，逐字符/逐词流式返回。

```json
{
  "type": "message.content",
  "message_id": "msg_abc123",
  "content": "收到！这是一个很温馨的故事 ☕",
  "delta": "故事",
  "timestamp": "2025-01-27T10:30:01Z"
}
```

**字段说明**:
- `content`: 当前累积的完整内容
- `delta`: 本次新增的内容片段

### 3. `thinking.start` - 思考过程开始

Agent 开始内部思考/规划。

```json
{
  "type": "thinking.start",
  "message_id": "msg_abc123",
  "timestamp": "2025-01-27T10:30:02Z"
}
```

### 4. `thinking.content` - 思考内容

Agent 的思考过程内容（可选择是否展示给用户）。

```json
{
  "type": "thinking.content",
  "message_id": "msg_abc123",
  "content": "用户上传了剧本，我需要先解析剧本结构，提取角色、场景和分镜信息...",
  "delta": "提取角色、场景和分镜信息...",
  "timestamp": "2025-01-27T10:30:03Z"
}
```

### 5. `thinking.end` - 思考结束

```json
{
  "type": "thinking.end",
  "message_id": "msg_abc123",
  "timestamp": "2025-01-27T10:30:04Z"
}
```

### 6. `tool.call` - 工具调用

Agent 调用后台工具/服务。

```json
{
  "type": "tool.call",
  "message_id": "msg_abc123",
  "tool_call_id": "tc_xyz789",
  "tool_name": "parse_script",
  "arguments": {
    "script_url": "https://storage.example.com/files/script.txt",
    "language": "zh-CN"
  },
  "timestamp": "2025-01-27T10:30:05Z"
}
```

**常见工具**:
- `parse_script`: 解析剧本
- `generate_character`: 生成角色形象
- `generate_scene`: 生成场景图
- `generate_storyboard`: 生成分镜
- `generate_audio`: 生成音频
- `compose_video`: 合成视频

### 7. `tool.output` - 工具执行结果

```json
{
  "type": "tool.output",
  "message_id": "msg_abc123",
  "tool_call_id": "tc_xyz789",
  "tool_name": "parse_script",
  "status": "success",
  "output": {
    "characters": [
      {
        "name": "小明",
        "age": 25,
        "description": "程序员，阳光开朗"
      },
      {
        "name": "小红",
        "age": 23,
        "description": "插画师，温柔细腻"
      }
    ],
    "scenes": [
      {
        "name": "咖啡店",
        "time": "白天",
        "description": "温馨的街角咖啡店"
      }
    ],
    "storyboard_count": 24
  },
  "timestamp": "2025-01-27T10:30:15Z"
}
```

**字段说明**:
- `status`: 执行状态 (`success`, `error`, `running`)
- `output`: 工具返回的结果数据
- `error`: 错误信息（status 为 error 时）

### 8. `progress.update` - 进度更新

长时间任务的进度更新。

```json
{
  "type": "progress.update",
  "message_id": "msg_abc123",
  "task_id": "task_generate_chars",
  "task_name": "生成角色形象",
  "progress": {
    "current": 3,
    "total": 5,
    "percentage": 60,
    "status": "running",
    "details": [
      {
        "item": "小明",
        "status": "completed",
        "result_url": "https://cdn.example.com/characters/xiaoming.png"
      },
      {
        "item": "小红",
        "status": "running",
        "progress": 75
      },
      {
        "item": "老板",
        "status": "pending"
      }
    ],
    "estimated_seconds_remaining": 120
  },
  "timestamp": "2025-01-27T10:32:00Z"
}
```

### 9. `board.action` - 看板操作指令

指示前端看板执行特定操作。

```json
{
  "type": "board.action",
  "message_id": "msg_abc123",
  "actions": [
    {
      "action": "switch_view",
      "target": "characters",
      "data": null
    },
    {
      "action": "highlight",
      "target": "character_xiaoming",
      "data": {
        "duration": 3000,
        "animation": "pulse"
      }
    },
    {
      "action": "scroll",
      "target": "character_xiaoming",
      "data": {
        "behavior": "smooth"
      }
    },
    {
      "action": "update",
      "target": "character_xiaohong",
      "data": {
        "candidates": [
          {
            "id": "cand_1",
            "image_url": "https://cdn.example.com/char_xiaohong_1.png"
          },
          {
            "id": "cand_2",
            "image_url": "https://cdn.example.com/char_xiaohong_2.png"
          }
        ]
      }
    }
  ],
  "timestamp": "2025-01-27T10:32:05Z"
}
```

**看板操作类型**:
- `switch_view`: 切换视图（剧本/角色/场景/分镜/时间线/预览）
- `highlight`: 高亮指定元素
- `scroll`: 滚动到指定位置
- `update`: 更新看板数据
- `add`: 添加新元素
- `remove`: 移除元素

### 10. `action.request` - 请求用户操作

Agent 请求用户确认或选择。用户可以通过**点击按钮**或**输入文本**两种方式响应。

```json
{
  "type": "action.request",
  "message_id": "msg_abc123",
  "request_id": "req_confirm_assets",
  "prompt": "角色资产已全部生成！请在看板上仔细查看每个角色，确认满意后点击下方按钮。",
  "actions": [
    {
      "id": "confirm_all",
      "label": "全部满意，锁定资产",
      "type": "primary",
      "style": "success"
    },
    {
      "id": "regenerate_some",
      "label": "部分需要重新生成",
      "type": "secondary",
      "style": "default"
    },
    {
      "id": "upload_custom",
      "label": "我想上传自己的图片",
      "type": "secondary",
      "style": "default"
    }
  ],
  "timeout_seconds": 300,
  "timestamp": "2025-01-27T10:35:00Z"
}
```

**用户如何响应**：

收到 `action.request` 后，用户有两种响应方式：

#### 方式1：点击按钮（结构化响应）

用户点击某个按钮时，前端发送包含 `action_response` 的请求：

```json
{
  "message": "",
  "action_response": {
    "request_id": "req_confirm_assets",
    "action_id": "confirm_all"
  }
}
```

#### 方式2：输入文本（自然语言响应）

用户也可以直接输入文本消息，Agent 会理解用户意图：

```json
{
  "message": "确认，全部锁定",
  "action_response": {
    "request_id": "req_confirm_assets",
    "action_id": "confirm_all"
  }
}
```

或者纯文本也可以（Agent 会智能识别）：

```json
{
  "message": "小红的头发再长一点，其他都可以"
}
```

**推荐实践**：
- 按钮点击时，使用 `action_response` 明确告知选择，`message` 可以为空字符串
- 用户输入文本时，可以同时包含 `action_response` 和 `message`
- Agent 会优先处理 `action_response`，然后结合 `message` 理解用户意图

### 11. `attachment` - 附件/预览

Agent 返回的附件或预览内容。

```json
{
  "type": "attachment",
  "message_id": "msg_abc123",
  "attachments": [
    {
      "id": "att_preview_1",
      "type": "storyboard_preview",
      "title": "第一批分镜预览",
      "items": [
        {
          "storyboard_id": "sb_1",
          "thumbnail_url": "https://cdn.example.com/sb1_thumb.jpg",
          "video_url": "https://cdn.example.com/sb1_video.mp4",
          "duration": 3.2,
          "status": "completed"
        },
        {
          "storyboard_id": "sb_2",
          "thumbnail_url": "https://cdn.example.com/sb2_thumb.jpg",
          "video_url": "https://cdn.example.com/sb2_video.mp4",
          "duration": 2.8,
          "status": "completed"
        }
      ]
    }
  ],
  "timestamp": "2025-01-27T10:40:00Z"
}
```

### 12. `message.end` - 消息结束

表示当前消息回复完成。

```json
{
  "type": "message.end",
  "message_id": "msg_abc123",
  "finish_reason": "completed",
  "metadata": {
    "total_tokens": 1250,
    "tools_called": 3,
    "duration_ms": 15000
  },
  "timestamp": "2025-01-27T10:40:10Z"
}
```

**finish_reason**:
- `completed`: 正常完成
- `interrupted`: 用户中断
- `error`: 发生错误
- `timeout`: 超时

### 13. `error` - 错误事件

```json
{
  "type": "error",
  "message_id": "msg_abc123",
  "error": {
    "code": "GENERATION_FAILED",
    "message": "分镜3的视频生成失败",
    "details": "画面内容可能触发了安全审核",
    "suggestions": [
      "修改分镜描述，避免敏感内容",
      "使用静态图片替代视频",
      "跳过此分镜"
    ],
    "recoverable": true
  },
  "timestamp": "2025-01-27T10:45:00Z"
}
```

---

## 完整对话示例

### 场景：用户上传剧本并开始创作

**请求**:
```http
POST /creations/creation_123/agent/chat HTTP/1.1
Host: api.example.com
Authorization: Bearer token_xyz
Content-Type: application/json
Accept: text/event-stream

{
  "message": "这是一个咖啡店相遇的爱情故事。男主小明是个程序员，女主小红是个插画师...",
  "attachments": [
    {
      "type": "file",
      "name": "剧本.txt",
      "url": "https://storage.example.com/script_123.txt",
      "mime_type": "text/plain"
    }
  ],
  "context": {
    "current_stage": "initial"
  }
}
```

**响应（SSE 事件流）**:

```
event: message.start
data: {"type":"message.start","message_id":"msg_001","timestamp":"2025-01-27T10:30:00Z"}

event: message.content
data: {"type":"message.content","message_id":"msg_001","content":"收到！","delta":"收到！","timestamp":"2025-01-27T10:30:00.100Z"}

event: message.content
data: {"type":"message.content","message_id":"msg_001","content":"收到！这是一个很温馨的故事 ☕","delta":"这是一个很温馨的故事 ☕","timestamp":"2025-01-27T10:30:00.200Z"}

event: thinking.start
data: {"type":"thinking.start","message_id":"msg_001","timestamp":"2025-01-27T10:30:00.300Z"}

event: thinking.content
data: {"type":"thinking.content","message_id":"msg_001","content":"用户上传了一个爱情故事剧本，需要解析剧本内容...","delta":"用户上传了一个爱情故事剧本，需要解析剧本内容...","timestamp":"2025-01-27T10:30:00.400Z"}

event: thinking.end
data: {"type":"thinking.end","message_id":"msg_001","timestamp":"2025-01-27T10:30:00.500Z"}

event: message.content
data: {"type":"message.content","message_id":"msg_001","content":"收到！这是一个很温馨的故事 ☕\n\n我正在分析剧本...","delta":"\n\n我正在分析剧本...","timestamp":"2025-01-27T10:30:01Z"}

event: tool.call
data: {"type":"tool.call","message_id":"msg_001","tool_call_id":"tc_001","tool_name":"parse_script","arguments":{"script_url":"https://storage.example.com/script_123.txt","language":"zh-CN"},"timestamp":"2025-01-27T10:30:02Z"}

event: progress.update
data: {"type":"progress.update","message_id":"msg_001","task_id":"parse_script","task_name":"解析剧本","progress":{"current":1,"total":3,"percentage":33,"status":"running","details":[{"item":"识别角色","status":"running"}]},"timestamp":"2025-01-27T10:30:03Z"}

event: progress.update
data: {"type":"progress.update","message_id":"msg_001","task_id":"parse_script","task_name":"解析剧本","progress":{"current":2,"total":3,"percentage":66,"status":"running","details":[{"item":"识别角色","status":"completed"},{"item":"识别场景","status":"running"}]},"timestamp":"2025-01-27T10:30:05Z"}

event: tool.output
data: {"type":"tool.output","message_id":"msg_001","tool_call_id":"tc_001","tool_name":"parse_script","status":"success","output":{"characters":[{"name":"小明","age":25,"role":"程序员"},{"name":"小红","age":23,"role":"插画师"}],"scenes":[{"name":"咖啡店","time":"白天"}],"storyboard_count":24},"timestamp":"2025-01-27T10:30:08Z"}

event: message.content
data: {"type":"message.content","message_id":"msg_001","content":"收到！这是一个很温馨的故事 ☕\n\n我正在分析剧本...\n\n✅ 发现 2 个主要角色：小明、小红\n✅ 发现 1 个场景：咖啡店\n✅ 拆分为 24 个分镜","delta":"\n\n✅ 发现 2 个主要角色：小明、小红\n✅ 发现 1 个场景：咖啡店\n✅ 拆分为 24 个分镜","timestamp":"2025-01-27T10:30:09Z"}

event: board.action
data: {"type":"board.action","message_id":"msg_001","actions":[{"action":"switch_view","target":"script"},{"action":"update","target":"script_view","data":{"characters":[{"name":"小明","age":25}],"scenes":[{"name":"咖啡店"}]}}],"timestamp":"2025-01-27T10:30:10Z"}

event: message.content
data: {"type":"message.content","message_id":"msg_001","content":"收到！这是一个很温馨的故事 ☕\n\n我正在分析剧本...\n\n✅ 发现 2 个主要角色：小明、小红\n✅ 发现 1 个场景：咖啡店\n✅ 拆分为 24 个分镜\n\n我已在看板上展示了完整的解析结果，请查看并确认是否准确。","delta":"\n\n我已在看板上展示了完整的解析结果，请查看并确认是否准确。","timestamp":"2025-01-27T10:30:11Z"}

event: action.request
data: {"type":"action.request","message_id":"msg_001","request_id":"req_001","prompt":"角色/场景信息是否准确？","actions":[{"id":"confirm","label":"确认无误 ✓","type":"primary"},{"id":"modify","label":"需要修改","type":"secondary"}],"timestamp":"2025-01-27T10:30:12Z"}

event: message.end
data: {"type":"message.end","message_id":"msg_001","finish_reason":"completed","metadata":{"total_tokens":850,"tools_called":1,"duration_ms":12000},"timestamp":"2025-01-27T10:30:12Z"}

```

---

## 其他端点

### 2. 获取会话历史

**端点**: `GET /creations/{creation_uuid}/agent/messages`

**描述**: 获取当前创作会话的历史对话记录。

**请求参数**:
- `limit` (integer, optional): 返回消息数量，默认 50
- `before` (string, optional): 返回此消息 ID 之前的消息
- `after` (string, optional): 返回此消息 ID 之后的消息

**响应**:
```json
{
  "creation_uuid": "creation_123",
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "这是一个咖啡店相遇的爱情故事...",
      "attachments": [],
      "timestamp": "2025-01-27T10:29:50Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "收到！这是一个很温馨的故事...",
      "actions": [
        {
          "id": "confirm",
          "label": "确认无误 ✓"
        }
      ],
      "timestamp": "2025-01-27T10:30:12Z"
    }
  ],
  "has_more": false,
  "total_count": 2
}
```

### 3. 中断对话

**端点**: `POST /creations/{creation_uuid}/agent/interrupt`

**描述**: 中断当前正在进行的 Agent 响应。

**请求体**:
```json
{
  "message_id": "msg_abc123",
  "reason": "user_stopped"
}
```

**响应**:
```json
{
  "success": true,
  "message": "对话已中断"
}
```

### 4. 重置会话

**端点**: `POST /creations/{creation_uuid}/agent/reset`

**描述**: 清空当前会话的对话历史，重新开始。

**请求体**:
```json
{
  "keep_assets": true
}
```

**响应**:
```json
{
  "success": true,
  "creation_uuid": "creation_123",
  "message": "会话已重置"
}
```

---

## 客户端实现示例

### 用户响应 action.request 的完整示例

当 Agent 发送 `action.request` 事件后，用户可以通过点击按钮或输入文本来响应。

```typescript
// 1. 发送普通消息
async function sendMessage(
  creationUuid: string,
  message: string,
  attachments?: any[]
) {
  return await fetch(
    `https://api.example.com/v1/creations/${creationUuid}/agent/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        attachments,
        stream: true,
      }),
    }
  );
}

// 2. 响应 action.request（用户点击按钮）
async function respondToAction(
  creationUuid: string,
  requestId: string,
  actionId: string,
  additionalMessage?: string
) {
  return await fetch(
    `https://api.example.com/v1/creations/${creationUuid}/agent/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message: additionalMessage || "",
        action_response: {
          request_id: requestId,
          action_id: actionId,
        },
        stream: true,
      }),
    }
  );
}

// 3. 使用示例
// 场景1: Agent 请求用户确认角色
// Agent 发送:
// {
//   "type": "action.request",
//   "request_id": "req_001",
//   "actions": [
//     {"id": "confirm_all", "label": "全部满意，锁定资产"},
//     {"id": "regenerate_some", "label": "部分需要重新生成"}
//   ]
// }

// 用户点击"全部满意，锁定资产"按钮
await respondToAction(
  'creation_123',
  'req_001',
  'confirm_all'
);

// 场景2: 用户点击按钮并补充说明
await respondToAction(
  'creation_123',
  'req_001',
  'regenerate_some',
  '小红的头发再长一点'
);

// 场景3: 用户直接输入文本（不点按钮）
await sendMessage(
  'creation_123',
  '小红的头发再长一点，其他都可以'
);
```

### JavaScript / TypeScript 基础实现

```typescript
async function chatWithAgent(creationUuid: string, message: string) {
  const response = await fetch(
    `https://api.example.com/v1/creations/${creationUuid}/agent/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        message,
        stream: true,
      }),
    }
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('event:')) {
        const eventType = line.substring(7).trim();
        continue;
      }

      if (line.startsWith('data:')) {
        const data = JSON.parse(line.substring(5).trim());
        handleEvent(data);
      }
    }
  }
}

function handleEvent(event: any) {
  switch (event.type) {
    case 'message.start':
      console.log('Agent 开始回复');
      break;

    case 'message.content':
      console.log('内容:', event.content);
      updateUI(event.content);
      break;

    case 'tool.call':
      console.log('调用工具:', event.tool_name);
      showToolLoading(event.tool_name);
      break;

    case 'progress.update':
      console.log('进度:', event.progress.percentage + '%');
      updateProgress(event.progress);
      break;

    case 'board.action':
      console.log('看板操作:', event.actions);
      executeBoardActions(event.actions);
      break;

    case 'action.request':
      console.log('请求用户操作');
      showActionButtons(event.actions, event.request_id);
      break;

    case 'message.end':
      console.log('消息结束');
      hideLoading();
      break;

    case 'error':
      console.error('错误:', event.error);
      showError(event.error);
      break;
  }
}

// 处理 action.request，显示按钮
function showActionButtons(actions: any[], requestId: string) {
  const buttonsContainer = document.getElementById('action-buttons');
  buttonsContainer.innerHTML = '';

  actions.forEach(action => {
    const button = document.createElement('button');
    button.textContent = action.label;
    button.className = `btn btn-${action.type}`;

    // 点击按钮时响应
    button.onclick = () => {
      respondToAction(currentCreationUuid, requestId, action.id);
    };

    buttonsContainer.appendChild(button);
  });
}
```

### React Hook 示例

```typescript
import { useEffect, useState } from 'react';

interface UseAgentChatOptions {
  creationUuid: string;
  onMessage?: (content: string) => void;
  onProgress?: (progress: any) => void;
  onBoardAction?: (actions: any[]) => void;
  onActionRequest?: (request: any) => void;
  onError?: (error: any) => void;
}

export function useAgentChat(options: UseAgentChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const sendMessage = async (message: string, attachments?: any[]) => {
    setIsStreaming(true);
    setCurrentMessage('');

    const response = await fetch(
      `/v1/creations/${options.creationUuid}/agent/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ message, attachments, stream: true }),
      }
    );

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const events = parseSSE(chunk);

        for (const event of events) {
          handleEvent(event);
        }
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleEvent = (event: any) => {
    switch (event.type) {
      case 'message.content':
        setCurrentMessage(event.content);
        options.onMessage?.(event.content);
        break;

      case 'progress.update':
        options.onProgress?.(event.progress);
        break;

      case 'board.action':
        options.onBoardAction?.(event.actions);
        break;

      case 'action.request':
        options.onActionRequest?.(event);
        break;

      case 'error':
        options.onError?.(event.error);
        break;
    }
  };

  return {
    sendMessage,
    isStreaming,
    currentMessage,
  };
}

function parseSSE(chunk: string): any[] {
  const events = [];
  const lines = chunk.split('\n');
  let currentEvent: any = {};

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent.eventType = line.substring(7).trim();
    } else if (line.startsWith('data:')) {
      try {
        const data = JSON.parse(line.substring(5).trim());
        events.push(data);
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    }
  }

  return events;
}
```

---

## 错误码

| 错误码 | 描述 | HTTP 状态码 |
|--------|------|------------|
| `CREATION_NOT_FOUND` | 创作项目不存在 | 404 |
| `INVALID_MESSAGE` | 消息格式错误 | 400 |
| `RATE_LIMIT_EXCEEDED` | 超出请求频率限制 | 429 |
| `GENERATION_FAILED` | 内容生成失败 | 500 |
| `TOOL_EXECUTION_ERROR` | 工具执行错误 | 500 |
| `CONTENT_MODERATION_FAILED` | 内容审核未通过 | 400 |
| `INSUFFICIENT_CREDITS` | 余额不足 | 402 |
| `UNAUTHORIZED` | 未授权 | 401 |

---

## 最佳实践

### 1. 连接管理
- 实现自动重连机制，处理网络中断
- 设置合理的超时时间（建议 60s）
- 使用心跳检测保持连接活跃

### 2. 事件处理
- 按顺序处理事件，不要跳过
- 缓存 `tool.call` 和 `tool.output` 的映射关系
- 对 `progress.update` 进行防抖处理，避免过度渲染

### 3. 用户体验
- 显示实时的打字效果（使用 `message.content` 的 `delta`）
- 在工具调用时显示加载状态
- 进度条平滑更新，避免跳跃
- 错误时提供明确的操作建议

### 4. 性能优化
- 使用虚拟滚动处理长对话历史
- 图片/视频资源使用 CDN 和懒加载
- 大附件使用断点续传

---

## 版本历史

- **v1.0** (2025-01-27): 初始版本
  - 基础对话能力
  - SSE 流式响应
  - 工具调用和进度追踪
  - 看板联动指令

---

## 技术支持

如有问题或建议，请联系：
- 邮箱: api-support@example.com
- 文档: https://docs.example.com/agent-api
