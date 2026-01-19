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
    style: string,
    creationUuid: string,
    forceRegenerate: boolean = false,
    modelName?: string
  ) => {
    return apiClient.post<{task_id: string, message: string}>(
      `/api/v1/characters/generate-images`,
      {
        character_ids: characterIds,
        visual_style: style,
        creation_uuid: creationUuid,
        force_regenerate: forceRegenerate,
        model_name: modelName
      }
    );
  },
  // 获取创作关联的角色列表
  getCreationCharacters: async (creationUuid: string): Promise<ApiResponse<ICharacter[]>> => {
    return apiClient.get<ApiResponse<ICharacter[]>>(
      `/api/v1/characters/creation/${creationUuid}`
    ) as unknown as Promise<ApiResponse<ICharacter[]>>;
  },
  // 获取单个角色详情
  getCharacter: async (characterUuid: string): Promise<ApiResponse<ICharacter>> => {
    return apiClient.get<ApiResponse<ICharacter>>(
      `/api/v1/characters/${characterUuid}`
    ) as unknown as Promise<ApiResponse<ICharacter>>;
  },
  // 单个角色重新生成图片
  regenerateCharacterImage: async (
    characterUuid: string,
    style: string,
    creationUuid: string,
    modelName?: string
  ) => {
    return apiClient.post<{task_id: string, message: string}>(
      `/api/v1/characters/regenerate-image`,
      {
        character_uuid: characterUuid,
        visual_style: style,
        creation_uuid: creationUuid,
        model_name: modelName
      }
    );
  },
};

export default characterApi;
