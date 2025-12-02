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
    shotId: string,
    imagePrompt: string
  ): Promise<{ data: RegenerateShotResponse }> => {
    return apiClient.post<RegenerateShotResponse>(
      `/api/v1/shots/${shotId}/regenerate`,
      { image_prompt: imagePrompt }
    ) as unknown as Promise<{ data: RegenerateShotResponse }>;
  },

  // 更新分镜旁白
  updateNarration: async (
    shotId: string,
    narration: string
  ): Promise<{ data: UpdateShotResponse }> => {
    return apiClient.put<UpdateShotResponse>(
      `/api/v1/shots/${shotId}`,
      { narration }
    ) as unknown as Promise<{ data: UpdateShotResponse }>;
  },

  // 更新分镜（支持 title 和 narration）
  updateShot: async (
    shotId: string | number,
    data: {
      title: string;
      narration: string;
    }
  ): Promise<{ data: UpdateShotResponse }> => {
    return apiClient.put<UpdateShotResponse>(
      `/api/v1/shots/${shotId}`,
      {
        title: data.title,
        narration: data.narration,
      }
    ) as unknown as Promise<{ data: UpdateShotResponse }>;
  },
};

export default shotApi;

