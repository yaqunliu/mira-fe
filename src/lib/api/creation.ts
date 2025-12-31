import { ICreation } from "@/types/creation";
import { apiClient } from "./client";
import { ApiResponse, PaginationParams } from "@/types";

const creationApi = {
  // 创建创作
  createCreation: async ({
    novelId,
    chapterId,
    creationId,
    extraData,
  }: {
    novelId: string;
    chapterId: string;
    creationId?: string;
    extraData?: {
      llm_model?: string;
      text_to_image_model?: string;
      image_to_image_model?: string;
      narration_mode?: string;
    };
  }) => {
    return apiClient.post("/api/v1/creations/create", {
      novel_id: novelId,
      chapter_id: chapterId,
      ...(creationId && { creation_id: creationId }),
      ...(extraData && { extra_data: extraData }),
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
    const url = `/api/v1/creations/${queryString ? `?${queryString}` : ''}`
    
    return apiClient.get<ApiResponse<ICreation[]>>(url) as unknown as Promise<ICreation[]>;
  },
  queryCreationById: async (
    creationId: string,
    excludeTimeline: boolean = false
  ): Promise<{ data: ICreation; message: string }> => {
    const url = excludeTimeline 
      ? `/api/v1/creations/${creationId}?exclude_timeline=true` 
      : `/api/v1/creations/${creationId}`;
    return apiClient.get<ApiResponse<ICreation>>(
      url
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
  // 生成分镜图片（批量或指定）
  generateShots: async (
    creationId: string,
    forceRegenerate: boolean = false,
    shotIds?: string[]
  ): Promise<{ data: { task_id: string; message: string } }> => {
    return apiClient.post<{ task_id: string; message: string }>(
      `/api/v1/creations/${creationId}/generate-shots`,
      {
        force_regenerate: forceRegenerate,
        shot_ids: shotIds
      }
    ) as unknown as Promise<{ data: { task_id: string; message: string } }>;
  },

  // 手动启动分镜拆解任务（第三步：分镜分析）
  analyzeShots: async (
    creationId: string
  ): Promise<{ data: { task_id: string; message: string } }> => {
    return apiClient.post<{ task_id: string; message: string }>(
      `/api/v1/creations/${creationId}/analyze-shots`
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

  // 更新创作
  updateCreation: async (
    creationId: string,
    data: Partial<ICreation>
  ): Promise<{ data: ICreation; message: string }> => {
    return apiClient.put<ApiResponse<ICreation>>(
      `/api/v1/creations/${creationId}`,
      data
    ) as unknown as Promise<{ data: ICreation; message: string }>;
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

  // 手动启动分镜拆分任务
  generatePlaybook: async (
    creationId: string,
    narrationMode: string = "original"
  ): Promise<{ data: { task_id: string; creation_uuid: string }; message: string }> => {
    return apiClient.post<{ task_id: string; creation_uuid: string }>(
      `/api/v1/creations/${creationId}/generate-playbook`,
      {
        narration_mode: narrationMode,
      }
    ) as unknown as Promise<{ data: { task_id: string; creation_uuid: string }; message: string }>;
  },

  // 批量生成场景图片
  generateSceneImages: async (
    creationId: string,
    forceRegenerate: boolean = false
  ): Promise<{ data: { task_id: string; creation_uuid: string }; message: string }> => {
    const creationUuid = String(creationId);
    // 这里使用 params 传参，因为后端接口可能使用了 Query 参数或者 Body 参数
    // 根据后端代码：@router.post("/{creation_uuid}/generate-scene-images") async def start_generate_scene_images(..., force_regenerate: bool = False, ...)
    // force_regenerate 是 Query 参数
    return apiClient.post<{ task_id: string; creation_uuid: string }>(
      `/api/v1/creations/${creationUuid}/generate-scene-images?force_regenerate=${forceRegenerate}`,
      {}
    ) as unknown as Promise<{ data: { task_id: string; creation_uuid: string }; message: string }>;
  },
};

export default creationApi;
