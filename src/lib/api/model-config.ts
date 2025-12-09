import { apiClient } from "./client";
import { ApiResponse } from "./types";

export interface IModelConfig {
  model_name: string;
  model_type: "llm" | "text_to_image" | "image_to_image";
  display_name: string;
  description?: string;
  config?: {
    aspect_ratio?: string;
    max_tokens?: number;
    guidance_scale?: number;
    [key: string]: any;
  };
  is_enabled: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface IModelConfigsResponse {
  llm: IModelConfig[];
  text_to_image: IModelConfig[];
  image_to_image: IModelConfig[];
}

const modelConfigApi = {
  // 获取所有模型配置
  getAllModels: async (): Promise<{ data: IModelConfigsResponse; message: string }> => {
    return apiClient.get<ApiResponse<IModelConfigsResponse>>(
      `/api/v1/model-configs/`
    ) as unknown as Promise<{ data: IModelConfigsResponse; message: string }>;
  },

  // 根据类型获取模型配置
  getModelsByType: async (
    modelType: "llm" | "text_to_image" | "image_to_image"
  ): Promise<{ data: IModelConfig[]; message: string }> => {
    return apiClient.get<ApiResponse<IModelConfig[]>>(
      `/api/v1/model-configs/?model_type=${modelType}`
    ) as unknown as Promise<{ data: IModelConfig[]; message: string }>;
  },

  // 获取默认模型
  getDefaultModel: async (
    modelType: "llm" | "text_to_image" | "image_to_image"
  ): Promise<{ data: IModelConfig; message: string }> => {
    return apiClient.get<ApiResponse<IModelConfig>>(
      `/api/v1/model-configs/default/${modelType}`
    ) as unknown as Promise<{ data: IModelConfig; message: string }>;
  },
};

export default modelConfigApi;

