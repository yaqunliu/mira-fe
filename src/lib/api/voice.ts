import { apiClient } from "./client";
import type { VoiceItem, VoiceListResponse, VoiceQueryParams } from "@/types/voice";

const voiceApi = {
  /**
   * 获取语音列表
   * @param params 查询参数
   * @returns 语音列表响应
   */
  getVoices: async (params: VoiceQueryParams = {}): Promise<VoiceListResponse> => {
    const query = new URLSearchParams();
    
    if (params.language) query.append("language", params.language);
    if (params.page_size) query.append("page_size", params.page_size.toString());
    if (params.page_number) query.append("page_number", params.page_number.toString());
    if (params.title) query.append("title", params.title);
    if (params.tag) query.append("tag", params.tag);
    
    const queryString = query.toString();
    const url = `/api/v1/voices${queryString ? `?${queryString}` : ""}`;
    
    const response = await apiClient.get<VoiceListResponse>(url);
    // API 响应可能在 response 或 response.data 中
    const data = (response as any)?.data ?? response;
    return data as VoiceListResponse;
  },

  /**
   * 获取语音详情
   * @param voiceId 语音模型 ID
   * @returns 语音详情
   */
  getVoiceDetail: async (voiceId: string): Promise<VoiceItem> => {
    const response = await apiClient.get<VoiceItem>(`/api/v1/voices/${voiceId}`);
    // API 响应可能在 response 或 response.data 中
    const data = (response as any)?.data ?? response;
    return data as VoiceItem;
  },
};

export default voiceApi;

