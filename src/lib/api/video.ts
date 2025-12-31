import { apiClient } from "./client";

export interface SelectVoiceResponse {
  task_id: string;
  creation_uuid: string;
  message: string;
}

export interface VideoGenerationProgress {
  creation_uuid: string;
  task_id: string | null;
  status: string | null;
  progress: {
    total: number;
    completed: number;
    status: string;
    stage: string;
    sub_tasks: any[];
  } | null;
  message: string;
  results?: any;
}

const videoApi = {
  // 选择语音并开始生成视频
  selectVoiceAndGenerate: async (
    creationUuid: string,
    data: {
      voice_id: string;
      voice_speed?: number;
      force_regenerate?: boolean;
    }
  ): Promise<{ data: SelectVoiceResponse }> => {
    return apiClient.post<SelectVoiceResponse>(
      `/api/v1/creations/${creationUuid}/select-voice`,
      data
    ) as unknown as Promise<{ data: SelectVoiceResponse }>;
  },

  // 获取生成进度
  getProgress: async (
    creationUuid: string
  ): Promise<{ data: VideoGenerationProgress }> => {
    return apiClient.get<VideoGenerationProgress>(
      `/api/v1/creations/${creationUuid}/progress`
    ) as unknown as Promise<{ data: VideoGenerationProgress }>;
  },
};

export default videoApi;
