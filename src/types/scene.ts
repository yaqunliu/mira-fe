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

/**
 * 标准化单个 narration item，兼容 content/role 和 内容/角色 两种格式
 * 统一输出为 {角色, 内容} 中文键格式
 */
export function normalizeNarrationItem(item: any): INarrationItem {
    if (!item || typeof item !== 'object') {
        return { 角色: '旁白', 内容: String(item || '') };
    }
    return {
        角色: item.角色 || item.role || '旁白',
        内容: item.内容 || item.content || '',
        ...(item.audio_url ? { audio_url: item.audio_url } : {}),
        ...(item.audio_historys ? { audio_historys: item.audio_historys } : {}),
        ...(item.audio_error ? { audio_error: item.audio_error } : {}),
    };
}

/**
 * 解析并标准化 narration 数据，兼容多种输入格式
 */
export function parseNarration(data: any): INarrationItem[] {
    if (!data) return [];
    if (typeof data === 'string' && data.trim()) {
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed.map(normalizeNarrationItem);
        } catch (e) {
            console.error("Failed to parse narration JSON", e);
            return [];
        }
    }
    if (Array.isArray(data)) return data.map(normalizeNarrationItem);
    return [];
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