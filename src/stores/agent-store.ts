import { create } from 'zustand';
import { produce } from 'immer';
import type {
  AgentMessage,
  ActionRequest,
  ToolCall,
  BoardViewType,
} from '@/types/agent';

/**
 * Agent 模式状态管理
 */
export interface AgentState {
  // ============ SSE 连接状态 ============
  isConnected: boolean;
  isStreaming: boolean;
  connectionError: string | null;

  // ============ 消息历史 ============
  messages: AgentMessage[];
  currentMessageId: string | null;

  // ============ 当前 Agent 状态 ============
  isThinking: boolean;
  thinkingContent: string;
  currentToolCall: ToolCall | null;

  // ============ 看板状态 ============
  currentView: BoardViewType;
  highlightedElement: string | null;

  // ============ 操作请求 ============
  pendingActionRequest: ActionRequest | null;

  // ============ Actions - 连接管理 ============
  setConnected: (connected: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // ============ Actions - 消息管理 ============
  addMessage: (message: AgentMessage) => void;
  updateMessage: (id: string, updates: Partial<AgentMessage>) => void;
  clearMessages: () => void;
  setCurrentMessageId: (id: string | null) => void;

  // ============ Actions - Agent 状态 ============
  setThinking: (isThinking: boolean, content?: string) => void;
  setCurrentToolCall: (toolCall: ToolCall | null) => void;

  // ============ Actions - 看板操作 ============
  setBoardView: (view: BoardViewType) => void;
  setHighlightedElement: (elementId: string | null) => void;
  highlightElement: (elementId: string, duration?: number) => void;

  // ============ Actions - 操作请求 ============
  setPendingActionRequest: (request: ActionRequest | null) => void;

  // ============ Actions - 重置 ============
  reset: () => void;
}

const initialState = {
  // 连接状态
  isConnected: false,
  isStreaming: false,
  connectionError: null,

  // 消息历史
  messages: [],
  currentMessageId: null,

  // Agent 状态
  isThinking: false,
  thinkingContent: '',
  currentToolCall: null,

  // 看板状态
  currentView: 'script' as BoardViewType,
  highlightedElement: null,

  // 操作请求
  pendingActionRequest: null,
};

export const useAgentStore = create<AgentState>((set) => ({
  ...initialState,

  // ============ 连接管理 ============

  setConnected: (connected: boolean) =>
    set({ isConnected: connected }),

  setStreaming: (streaming: boolean) =>
    set({ isStreaming: streaming }),

  setConnectionError: (error: string | null) =>
    set({ connectionError: error }),

  // ============ 消息管理 ============

  addMessage: (message: AgentMessage) =>
    set(
      produce((state: AgentState) => {
        state.messages.push(message);
      })
    ),

  updateMessage: (id: string, updates: Partial<AgentMessage>) =>
    set(
      produce((state: AgentState) => {
        const message = state.messages.find((m) => m.id === id);
        if (message) {
          Object.assign(message, updates);
        }
      })
    ),

  clearMessages: () =>
    set({ messages: [] }),

  setCurrentMessageId: (id: string | null) =>
    set({ currentMessageId: id }),

  // ============ Agent 状态 ============

  setThinking: (isThinking: boolean, content?: string) =>
    set({
      isThinking,
      thinkingContent: content || '',
    }),

  setCurrentToolCall: (toolCall: ToolCall | null) =>
    set({ currentToolCall: toolCall }),

  // ============ 看板操作 ============

  setBoardView: (view: BoardViewType) =>
    set({ currentView: view }),

  setHighlightedElement: (elementId: string | null) =>
    set({ highlightedElement: elementId }),

  highlightElement: (elementId: string, duration: number = 3000) => {
    set({ highlightedElement: elementId });
    setTimeout(() => {
      set({ highlightedElement: null });
    }, duration);
  },

  // ============ 操作请求 ============

  setPendingActionRequest: (request: ActionRequest | null) =>
    set({ pendingActionRequest: request }),

  // ============ 重置 ============

  reset: () => set(initialState),
}));
