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
    console.log(characterIds, "characterIds");
    return apiClient.post<{task_id: string, message: string}>(
      `/api/v1/characters/generate-images`,
      { character_ids: characterIds, visual_style: style }
    );
  },
};

export default characterApi;
