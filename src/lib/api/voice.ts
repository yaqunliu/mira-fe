import { apiClient } from "./client";
import { VOICE_LANGUAGE } from "@/types/voice";
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
   * 按交付语言取音色列表，带空结果回退。
   *
   * 英文交付要的是英文音色（VOICE_LANGUAGE），但后端英文音色库是否有数据尚未验证。
   * 如果直接请求 en 而后端返回空，配音选择器会整个变空，用户连视频都生成不了——
   * 比看到中文音色更糟。所以这里：
   *   1. 先请求 VOICE_LANGUAGE 的音色；
   *   2. 只有在「用户没加任何筛选条件」且结果为空时，才判定为英文库无数据，
   *      回退到后端默认库（省略 language 参数）。
   *
   * 第 2 步的筛选条件判断很重要：用户搜了个词没匹配上，那是正常的「无结果」，
   * 此时若回退成中文库，会莫名其妙冒出一批中文音色。
   *
   * 等后端确认英文音色库可用后，这个回退可以直接删掉，改为固定请求 VOICE_LANGUAGE。
   */
  getVoicesForDelivery: async (params: VoiceQueryParams = {}): Promise<VoiceListResponse> => {
    const primary = await voiceApi.getVoices({ ...params, language: VOICE_LANGUAGE });
    if (primary?.items?.length) return primary;

    const isUnfiltered = !params.title && !params.tag && (params.page_number ?? 1) === 1;
    if (!isUnfiltered) return primary;

    try {
      const fallback = await voiceApi.getVoices({ ...params, language: undefined });
      if (fallback?.items?.length) {
        console.warn(
          `[voiceApi] No "${VOICE_LANGUAGE}" voices returned by the backend; ` +
          `falling back to the default voice library. See en-plan.md backend TODO 6.`
        );
        return fallback;
      }
    } catch (err) {
      console.error("[voiceApi] Voice library fallback failed:", err);
    }
    return primary;
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

