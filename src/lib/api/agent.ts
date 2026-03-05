/**
 * Agent Creator API
 * 
 * 用于独立创作 Agent 的意图识别和任务创建
 */

import { apiClient } from "./client";

export interface IntentRequest {
  message: string;
  chat_history?: Array<{ role: string; content: string }>;
}

export interface IntentResponse {
  intent: string;
  intent_category: string;
  confidence: number;
  can_proceed: boolean;
  redirect_to_legacy?: boolean;
  legacy_url?: string;
  extracted_params: {
    words?: string[];
    difficulty?: "easy" | "medium" | "hard" | null;
    sentence_level?: "simple" | "complex" | null;
    repetitions?: number | null;
    style?: "anime" | "realism" | "disney" | null;
  };
  missing_required: string[];
  missing_optional: string[];
  details: {
    user_intent?: string;
    reason?: string;
  };
}

export interface CreateTaskRequest {
  intent: string;
  params: {
    words?: string[];
    difficulty?: string;
    sentence_level?: string;
    repetitions?: number;
    style?: string;
    [key: string]: any;
  };
}

export interface CreateTaskResponse {
  creation_id: string;
  redirect_url: string;
  message: string;
}

export const agentApi = {
  /**
   * 识别用户意图
   */
  recognizeIntent: async (request: IntentRequest): Promise<IntentResponse> => {
    const response = await apiClient.post<IntentResponse>("/api/v1/agent/intent", request);
    return response.data!;
  },

  /**
   * 创建 Agent 任务
   */
  createTask: async (request: CreateTaskRequest): Promise<CreateTaskResponse> => {
    const response = await apiClient.post<CreateTaskResponse>("/api/v1/agent/create", request);
    return response.data!;
  },
};

export default agentApi;
