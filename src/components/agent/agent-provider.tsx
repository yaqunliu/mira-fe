"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useAgentChat } from '@/hooks/use-agent-chat';

/**
 * Agent 上下文类型
 */
type AgentContextType = ReturnType<typeof useAgentChat>;

const AgentContext = createContext<AgentContextType | null>(null);

interface AgentProviderProps {
  creationUuid: string;
  children: ReactNode;
}

/**
 * Agent 上下文提供者
 *
 * 封装 useAgentChat hook，避免在多个组件中重复初始化
 * 所有子组件可以通过 useAgentContext 访问 Agent 功能
 */
export function AgentProvider({ creationUuid, children }: AgentProviderProps) {
  const agentChat = useAgentChat(creationUuid);

  return (
    <AgentContext.Provider value={agentChat}>
      {children}
    </AgentContext.Provider>
  );
}

/**
 * 获取 Agent 上下文
 *
 * @throws 如果在 AgentProvider 外部调用会抛出错误
 */
export function useAgentContext(): AgentContextType {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
}
