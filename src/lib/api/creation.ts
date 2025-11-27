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
    creationId: string
  ): Promise<{ data: { task_id: string; message: string } }> => {
    return apiClient.post<{ task_id: string; message: string }>(
      `/api/v1/creations/${creationId}/generate-shots`
    ) as unknown as Promise<{ data: { task_id: string; message: string } }>;
  },
};

export default creationApi;
