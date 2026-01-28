import apiClient from './client';
import type {
  ChatRequest,
  ChatHistory,
} from '@/types/agent';

/**
 * Agent API 服务
 */
class AgentAPI {
  /**
   * 发起 Agent 对话（SSE）
   * 注意：此方法返回 fetch Response，需要调用者自行处理 SSE 流
   */
  async chat(creationUuid: string, request: ChatRequest): Promise<Response> {
    const url = `/creations/${creationUuid}/agent/chat`;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * 获取会话历史
   */
  async getMessages(
    creationUuid: string,
    params?: {
      limit?: number;
      before?: string;
      after?: string;
    }
  ) {
    return apiClient.get<ChatHistory>(`/creations/${creationUuid}/agent/messages`, {
      params,
    });
  }

  /**
   * 中断对话
   */
  async interrupt(creationUuid: string, messageId: string, reason?: string) {
    return apiClient.post(`/creations/${creationUuid}/agent/interrupt`, {
      message_id: messageId,
      reason,
    });
  }

  /**
   * 重置会话
   */
  async reset(creationUuid: string, keepAssets: boolean = true) {
    return apiClient.post(`/creations/${creationUuid}/agent/reset`, {
      keep_assets: keepAssets,
    });
  }
}

const agentApi = new AgentAPI();

export default agentApi;
