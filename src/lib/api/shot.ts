import { apiClient } from "./client";

export interface RegenerateShotResponse {
  task_id: string;
  message: string;
}

export interface UpdateShotResponse {
  message: string;
}

const shotApi = {
  // 重新生成分镜图片
  regenerateShot: async (
    shotId: string,  // UUID字符串
    imagePrompt: string
  ): Promise<{ data: RegenerateShotResponse }> => {
    const shotUuid = String(shotId);
    return apiClient.post<RegenerateShotResponse>(
      `/api/v1/shots/${shotUuid}/regenerate`,
      { image_prompt: imagePrompt }
    ) as unknown as Promise<{ data: RegenerateShotResponse }>;
  },

  // 更新分镜旁白
  updateNarration: async (
    shotId: string,  // UUID字符串
    narration: string
  ): Promise<{ data: UpdateShotResponse }> => {
    const shotUuid = String(shotId);
    return apiClient.put<UpdateShotResponse>(
      `/api/v1/shots/${shotUuid}`,
      { narration }
    ) as unknown as Promise<{ data: UpdateShotResponse }>;
  },

  // 更新分镜（支持 title 和 narration）
  updateShot: async (
    shotId: string,  // 只接受UUID字符串
    data: {
      title: string;
      narration: string;
    }
  ): Promise<{ data: UpdateShotResponse }> => {
    // 确保是字符串类型
    const shotUuid = String(shotId);
    return apiClient.put<UpdateShotResponse>(
      `/api/v1/shots/${shotUuid}`,
      {
        title: data.title,
        narration: data.narration,
      }
    ) as unknown as Promise<{ data: UpdateShotResponse }>;
  },
};

export default shotApi;

