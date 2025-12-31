import { apiClient } from "./client";
import { IScene } from "@/types/scene";

export interface RegenerateSceneResponse {
  task_id: string;
  message: string;
}

const sceneApi = {
  // 重新生成场景图片
  regenerateSceneImage: async (
    sceneId: string // UUID字符串
  ): Promise<{ data: RegenerateSceneResponse }> => {
    const sceneUuid = String(sceneId);
    return apiClient.post<RegenerateSceneResponse>(
      `/api/v1/scenes/${sceneUuid}/regenerate-image`
    ) as unknown as Promise<{ data: RegenerateSceneResponse }>;
  },

  // 重新生成场景视频（该场景下所有分镜视频）
  regenerateSceneVideos: async (
    sceneId: string // UUID字符串
  ): Promise<{ data: RegenerateSceneResponse }> => {
    const sceneUuid = String(sceneId);
    return apiClient.post<RegenerateSceneResponse>(
      `/api/v1/scenes/${sceneUuid}/regenerate-videos`
    ) as unknown as Promise<{ data: RegenerateSceneResponse }>;
  },

  // 获取场景详情（包含完整分镜）
  getSceneWithShots: async (
    sceneId: string // UUID字符串
  ): Promise<{ data: IScene }> => {
    const sceneUuid = String(sceneId);
    return apiClient.get<IScene>(
      `/api/v1/scenes/${sceneUuid}/with-shots`
    ) as unknown as Promise<{ data: IScene }>;
  },

  // 更新场景信息
  updateScene: async (
    sceneId: string, // UUID字符串
    data: {
      title?: string;
      duration?: string;
      scene_setting?: {
        time?: string;
        location?: string;
        space?: string;
        atmosphere?: string;
      };
    }
  ): Promise<{ data: IScene; message: string }> => {
    const sceneUuid = String(sceneId);
    return apiClient.put<{ data: IScene; message: string }>(
      `/api/v1/scenes/${sceneUuid}`,
      data
    ) as unknown as Promise<{ data: IScene; message: string }>;
  },
};

export default sceneApi;
