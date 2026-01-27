import { apiClient } from "./client";
import { ApiResponse } from "@/types";
import { IShot } from "@/types/scene";

const shotApi = {
  // 更新分镜
  updateShot: async (
    shotUuid: string,
    data: Partial<IShot>
  ): Promise<{ data: IShot; message: string }> => {
    return apiClient.put<ApiResponse<IShot>>(
      `/api/v1/shots/${shotUuid}`,
      data
    ) as unknown as Promise<{ data: IShot; message: string }>;
  },

  // 重新生成分镜图片
  regenerateShotImage: async (
    shotUuid: string,
    imagePrompt?: string,
    modelName?: string,
    frameType?: 'start' | 'end' | 'both'
  ): Promise<{ data: { task_id: string; shot_uuid: string; image_prompt?: string }; message: string }> => {
    return apiClient.post<{ task_id: string; shot_uuid: string; image_prompt?: string; message: string }>(
      `/api/v1/shots/${shotUuid}/regenerate`,
      {
        image_prompt: imagePrompt,
        model_name: modelName,
        frame_type: frameType
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

  // 更新旁白
  updateNarration: async (
    shotUuid: string,
    narration: string[]
  ): Promise<{ data: IShot; message: string }> => {
    return apiClient.put<ApiResponse<IShot>>(
      `/api/v1/shots/${shotUuid}/narration`,
      {
        narration: narration
      }
    ) as unknown as Promise<{ data: IShot; message: string }>;
  },

  // 生成分镜视频（首次）
  generateShotVideo: async (
    shotUuid: string,
    modelName?: string,
    lastFrameImageUrl?: string
  ): Promise<{ data: { task_id: string; shot_uuid: string; video_duration: number; required_points: number }; message: string }> => {
    return apiClient.post(
      `/api/v1/shots/${shotUuid}/generate-video`,
      {
        model_name: modelName,
        last_frame_image_url: lastFrameImageUrl
      }
    ) as unknown as Promise<{ data: { task_id: string; shot_uuid: string; video_duration: number; required_points: number }; message: string }>;
  },

  // 重新生成分镜视频
  regenerateShotVideo: async (
    shotUuid: string,
    modelName?: string,
    lastFrameImageUrl?: string
  ): Promise<{ data: { task_id: string; shot_uuid: string }; message: string }> => {
    return apiClient.post(
      `/api/v1/shots/${shotUuid}/regenerate-video`,
      {
        model_name: modelName,
        last_frame_image_url: lastFrameImageUrl
      }
    ) as unknown as Promise<{ data: { task_id: string; shot_uuid: string }; message: string }>;
  },

  // 生成分镜音频
  generateShotAudio: async (
    shotUuid: string
  ): Promise<{ data: { task_id: string; shot_uuid: string }; message: string }> => {
    return apiClient.post(
      `/api/v1/shots/${shotUuid}/generate-audio`,
      {}
    ) as unknown as Promise<{ data: { task_id: string; shot_uuid: string }; message: string }>;
  },

  // 生成视频提示词
  generateVideoPrompt: async (
    shotUuid: string
  ): Promise<{ data: { task_id: string; shot_uuid: string }; message: string }> => {
    return apiClient.post(
      `/api/v1/shots/${shotUuid}/generate-video-prompt`,
      {}
    ) as unknown as Promise<{ data: { task_id: string; shot_uuid: string }; message: string }>;
  },

  // 更新视频提示词
  updateVideoPrompt: async (
    shotUuid: string,
    videoPrompt: string
  ): Promise<{ data: IShot; message: string }> => {
    return apiClient.put<ApiResponse<IShot>>(
      `/api/v1/shots/${shotUuid}`,
      {
        extra_data: { video_prompt: videoPrompt }
      }
    ) as unknown as Promise<{ data: IShot; message: string }>;
  },

  // 获取分镜图片生成历史
  getImageHistory: async (shotUuid: string) => {
    return apiClient.get(
      `/api/v1/shots/${shotUuid}/image-history`
    );
  },
  
  // 应用分镜历史图片版本
  applyImageVersion: async (
    shotUuid: string,
    versionId: string,
    imageUrl: string,
    endFrameImageUrl?: string,
    imagePrompt?: string
  ) => {
    return apiClient.post(
      `/api/v1/shots/${shotUuid}/apply-image-version`,
      {
        version_id: versionId,
        image_url: imageUrl,
        end_frame_image_url: endFrameImageUrl,
        image_prompt: imagePrompt
      }
    );
  },
};

export default shotApi;
