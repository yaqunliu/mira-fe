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
  | 'timeline'    // 时间线视图
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
  | 'message.start'
  | 'message.content'
  | 'message.end'
  | 'thinking.start'
  | 'thinking.content'
  | 'thinking.end'
  | 'tool.call'
  | 'tool.output'
  | 'progress.update'
  | 'board.action'
  | 'action.request'
  | 'attachment'
  | 'error';

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
