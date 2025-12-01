import { ICreation } from "@/types/creation";
import { apiClient } from "./client";
import { ApiResponse, PaginationParams } from "@/types";

const creationApi = {
  // 创建创作
  createCreation: async ({
    novelId,
    chapterId,
  }: {
    novelId: string;
    chapterId: string;
  }) => {
    return apiClient.post("/api/v1/creations/create", {
      novel_id: novelId,
      chapter_id: chapterId,
    });
  },
  queryCreations: async (params?: PaginationParams): Promise<ICreation[]> => {
    return apiClient.get<ApiResponse<ICreation[]>>(
      `/api/v1/creations?page=${params?.page}&page_size=${params?.page_size}`
    ) as unknown as Promise<ICreation[]>;
  },
  queryCreationById: async (
    creationId: string
  ): Promise<{ data: ICreation; message: string }> => {
    return apiClient.get<ApiResponse<ICreation>>(
      `/api/v1/creations/${creationId}`
    ) as unknown as Promise<{ data: ICreation; message: string }>;
  },
  // 生成分镜图片
  generateShots: async (
    creationId: string,
    imageCount: number
  ): Promise<{ data: { task_id: string; message: string } }> => {
    return apiClient.post<{ task_id: string; message: string }>(
      `/api/v1/creations/${creationId}/generate-shots`,
      {
        image_count: imageCount,
      }
    ) as unknown as Promise<{ data: { task_id: string; message: string } }>;
  },

  // 选择语音并启动音频生成任务
  selectVoiceAndGenerateAudio: async (
    creationId: string,
    voiceId: string,
    voiceSpeed: number = 1,
    forceRegenerate: boolean = false
  ): Promise<{
    data: { task_id: string; creation_id: number; voice_id: string };
  }> => {
    return apiClient.post(
      `/api/v1/creations/${creationId}/select-voice`,
      {
        voice_id: voiceId,
        voice_speed: voiceSpeed,
        force_regenerate: forceRegenerate,
      }
    ) as unknown as Promise<{
      data: { task_id: string; creation_id: number; voice_id: string };
    }>;
  },

  // 查询创作项目当前任务进度
  getCreationProgress: async (
    creationId: string
  ): Promise<{
    data: {
      creation_id: number;
      task_id: string | null;
      status: string | null;
      progress: {
        total: number;
        completed: number;
        success_count: number;
        failed_count: number;
        status: string;
        stage: string;
      } | null;
      message: string;
    };
  }> => {
    return apiClient.get(
      `/api/v1/creations/${creationId}/progress`
    ) as unknown as Promise<{
      data: {
        creation_id: number;
        task_id: string | null;
        status: string | null;
        progress: {
          total: number;
          completed: number;
          success_count: number;
          failed_count: number;
          status: string;
          stage: string;
        } | null;
        message: string;
      };
    }>;
  },

  // 删除创作
  deleteCreation: async (creationId: string) => {
    return apiClient.delete(`/api/v1/creations/${creationId}`);
  },
};

export default creationApi;
