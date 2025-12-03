import { ICreation } from "@/types/creation";
import { apiClient } from "./client";
import { ApiResponse, PaginationParams } from "@/types";

const creationApi = {
  // 创建创作
  createCreation: async ({
    novelId,
    chapterId,
    creationId,
  }: {
    novelId: string;
    chapterId: string;
    creationId?: string;
  }) => {
    return apiClient.post("/api/v1/creations/create", {
      novel_id: novelId,
      chapter_id: chapterId,
      ...(creationId && { creation_id: creationId }),
    });
  },
  queryCreations: async (params?: PaginationParams): Promise<ICreation[]> => {
    // 构建查询参数
    const queryParams = new URLSearchParams()
    if (params?.page) {
      queryParams.append('page', params.page.toString())
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString())
    }
    if (params?.title) {
      queryParams.append('title', params.title)
    }
    
    const queryString = queryParams.toString()
    const url = `/api/v1/creations${queryString ? `?${queryString}` : ''}`
    
    return apiClient.get<ApiResponse<ICreation[]>>(url) as unknown as Promise<ICreation[]>;
  },
  queryCreationById: async (
    creationId: string
  ): Promise<{ data: ICreation; message: string }> => {
    return apiClient.get<ApiResponse<ICreation>>(
      `/api/v1/creations/${creationId}`
    ) as unknown as Promise<{ data: ICreation; message: string }>;
  },
  // 快速获取创作信息（简化版，速度更快）
  queryCreationSimple: async (
    creationId: string
  ): Promise<{ data: ICreation; message: string }> => {
    return apiClient.get<ApiResponse<ICreation>>(
      `/api/v1/creations/${creationId}/simple`
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

  // 生成角色分析
  analyzeCharacters: async (
    creationId: string
  ): Promise<{ data: { task_id: string; message: string } }> => {
    return apiClient.post<{ task_id: string; message: string }>(
      `/api/v1/creations/${creationId}/analyze-characters`
    ) as unknown as Promise<{ data: { task_id: string; message: string } }>;
  },

  // 根据章节ID查询创作
  // 后端总是返回200，如果该章节没有创作，data为null
  queryCreationByChapterId: async (
    chapterId: string
  ): Promise<{ data: ICreation | null; message: string }> => {
    return apiClient.get<ApiResponse<ICreation | null>>(
      `/api/v1/creations/by-chapter/${chapterId}`
    ) as unknown as Promise<{ data: ICreation | null; message: string }>;
  },
};

export default creationApi;
