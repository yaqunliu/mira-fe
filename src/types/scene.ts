import { ICharacter } from "./character";
export interface IScene {
    scene_id: number;
    uuid?: string;  // UUID字段
    title: string;
    status?: string;
    duration: string;
    time_setting: string;
    location: string;
    space_type: string;
    atmosphere: string;
    creation_id: number;
    created_at: string;
    updated_at: string;
    image_url?: string;
    image_prompt?: string;
    shots: IShot[];
}

export interface INarrationItem {
    角色: string;
    内容: string;
    audio_url?: string;           // 当前音频 URL
    audio_historys?: string[];    // 音频历史版本列表
    audio_error?: string;         // 音频生成错误信息
}

export interface IShotStatusDetail {
    video_status?: 'generating' | 'completed' | 'failed';
    video_updated_at?: string;
    video_error?: string;
}

export interface IShot {
    title: string;
    shot_number: number;
    description: string;
    narration: INarrationItem[];
    image_prompt: string;
    shot_id: number;
    uuid?: string;  // UUID字段
    status?: string;
    scene_id: number;
    image_url: string | null;
    video_url: string | null;
    audio_url: string | null;
    video_status?: string;
    video_duration: number;
    status_detail?: IShotStatusDetail;
    extra_data?: Record<string, any>;
    created_at: string;
    updated_at: string | null;
    characters: ICharacter[];
    associated_characters?: number[]; // 后端返回的关联角色ID列表
}