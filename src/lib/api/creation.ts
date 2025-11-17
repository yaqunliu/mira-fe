import { Creation } from "@/types/Creation";
import { apiClient } from "./client";
import { ApiResponse } from "@/types";

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
  queryCreationById: async (creationId: string): Promise<Creation> => {
    return apiClient.get<ApiResponse<Creation>>(`/api/v1/creations/${creationId}`) as unknown as Promise<Creation>;
  },
};

export default creationApi;
