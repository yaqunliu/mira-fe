import { ICharacter } from "@/types/character";
import { apiClient } from "./client";
import { ApiResponse } from "@/types";

const characterApi = {
  updateCharacter: async (
    characterId: string,
    data: Partial<ICharacter>
  ) => {
    return apiClient.put<ApiResponse<ICharacter>>(
      `/api/v1/characters/${characterId}`,
      data
    ) as unknown as Promise<ApiResponse<ICharacter>>;
  },
  generateCharacterImages: async (
    characterIds: string[],
    style: string
  ) => {
    return apiClient.post<{task_id: string, message: string}>(
      `/api/v1/characters/generate-images`,
      { character_ids: characterIds, visual_style: style }
    );
  },
  // 获取创作关联的角色列表
  getCreationCharacters: async (creationUuid: string): Promise<ApiResponse<ICharacter[]>> => {
    return apiClient.get<ApiResponse<ICharacter[]>>(
      `/api/v1/characters/creation/${creationUuid}`
    ) as unknown as Promise<ApiResponse<ICharacter[]>>;
  },
};

export default characterApi;
