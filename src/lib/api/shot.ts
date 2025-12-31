import { apiClient } from "./client";
import { ApiResponse } from "@/types";
import { IShot } from "@/types/scene";

const shotApi = {
  // 更新分镜
  updateShot: async (
    shotUuid: string,
    data: Partial<IShot> & { character_ids?: number[] }
  ): Promise<{ data: IShot; message: string }> => {
    return apiClient.put<ApiResponse<IShot>>(
      `/api/v1/shots/${shotUuid}`,
      data
    ) as unknown as Promise<{ data: IShot; message: string }>;
  },

  // 重新生成分镜图片
  regenerateShotImage: async (
    shotUuid: string,
    imagePrompt?: string
  ): Promise<{ data: { task_id: string; shot_uuid: string; image_prompt?: string }; message: string }> => {
    return apiClient.post<{ task_id: string; shot_uuid: string; image_prompt?: string; message: string }>(
      `/api/v1/shots/${shotUuid}/regenerate`,
      {
        image_prompt: imagePrompt
      }
    ) as unknown as Promise<{ data: { task_id: string; shot_uuid: string; image_prompt?: string }; message: string }>;
  },

  // 生成分镜图片（首次生成）
  generateShotImage: async (
    shotUuid: string
  ): Promise<{ data: { task_id: string; shot_uuid: string }; message: string }> => {
    return apiClient.post<{ task_id: string; shot_uuid: string; message: string }>(
      `/api/v1/shots/${shotUuid}/generate-image`,
      {}
    ) as unknown as Promise<{ data: { task_id: string; shot_uuid: string }; message: string }>;
  },

  // 更新分镜角色
  updateShotCharacters: async (
    shotUuid: string,
    characterIds: number[]
  ): Promise<{ data: IShot; message: string }> => {
    return apiClient.put<ApiResponse<IShot>>(
      `/api/v1/shots/${shotUuid}/characters`,
      {
        character_ids: characterIds
      }
    ) as unknown as Promise<{ data: IShot; message: string }>;
  },
};

export default shotApi;
