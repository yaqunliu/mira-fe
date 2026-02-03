/**
 * Agent 模式相关类型定义
 */

// ============ 消息相关 ============

export type MessageRole = 'user' | 'assistant';

export type MessageStatus = 'sending' | 'streaming' | 'completed' | 'error';

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status?: MessageStatus;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  actionRequest?: ActionRequest;
}

export interface Attachment {
  id: string;
  type: 'file' | 'image' | 'url';
  name: string;
  url: string;
  mimeType?: string;
}

// ============ 工具调用相关 ============

export type ToolCallStatus = 'calling' | 'success' | 'error';

export interface ToolCall {
  id: string;
  name: string; // 'parse_script', 'generate_character', etc.
  arguments: Record<string, any>;
  status: ToolCallStatus;
  output?: any;
  error?: string;
}

// ============ 操作请求相关 ============

export type ActionButtonType = 'primary' | 'secondary';
export type ActionButtonStyle = 'success' | 'default' | 'danger';

export interface ActionButton {
  id: string;
  label: string;
  type: ActionButtonType;
  style?: ActionButtonStyle;
}

export interface ActionRequest {
  requestId: string;
  prompt: string;
  actions: ActionButton[];
  timeoutSeconds?: number;
}

export interface ActionResponse {
  requestId: string;
  actionId: string;
  data?: any;
}

// ============ 看板操作相关 ============

export type BoardActionType =
  | 'switch_view'
  | 'highlight'
  | 'scroll'
  | 'update'
  | 'add'
  | 'remove';

export interface BoardAction {
  action: BoardActionType;
  target: string;
  data?: any;
}

// ============ 看板视图相关 ============

export type BoardViewType =
  | 'script'      // 剧本视图
  | 'characters'  // 角色视图
  | 'scenes'      // 场景视图
  | 'storyboard'  // 分镜视图
  | 'preview';    // 预览视图

// ============ 进度相关 ============

export interface ProgressDetail {
  item: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  resultUrl?: string;
}

export interface Progress {
  current: number;
  total: number;
  percentage: number;
  status: 'running' | 'completed' | 'failed';
  details?: ProgressDetail[];
  estimatedSecondsRemaining?: number;
}

// ============ SSE 事件相关 ============

export type SSEEventType =
  // 会话控制类
  | 'thread'           // 会话信息（首个事件）
  | 'done'             // 流结束
  // 消息类（用户可见回复）
  | 'message.start'    // 消息开始
  | 'message.delta'    // 消息增量内容
  | 'message.end'      // 消息结束
  // 思考类（AI 思考过程，可选展示）
  | 'thinking.start'   // 思考开始
  | 'thinking.delta'   // 思考内容
  | 'thinking.end'     // 思考结束
  // 工具调用类
  | 'tool.start'       // 工具调用开始
  | 'tool.progress'    // 工具执行进度
  | 'tool.end'         // 工具调用结束
  // 进度类
  | 'progress'         // 进度更新
  // 看板操作类
  | 'board.action'     // 看板UI操作
  // 其他
  | 'action.request'   // 需要用户确认的操作
  | 'attachment'       // 附件
  | 'error'            // 错误
  // 兼容旧版本
  | 'message.content'
  | 'thinking.content'
  | 'tool.call'
  | 'tool.output'
  | 'progress.update';

export interface SSEEvent {
  type: SSEEventType;
  message_id?: string;
  timestamp: string;
  [key: string]: any;
}

// ============ 聊天请求相关 ============

export interface ChatRequest {
  message: string;
  attachments?: Attachment[];
  context?: {
    current_stage?: string;
    user_action?: string;
  };
  action_response?: ActionResponse;
  stream?: boolean;
}

// ============ 聊天历史相关 ============

export interface ChatHistory {
  creation_uuid: string;
  messages: AgentMessage[];
  has_more: boolean;
  total_count: number;
}
