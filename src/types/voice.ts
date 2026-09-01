// 语音作者信息
export interface VoiceAuthor {
  id: string;
  nickname: string;
  avatar: string | null;
}

// 语音试听样本
export interface VoiceSample {
  title: string;
  text: string;
  task_id: string | null;
  audio: string | null;
}

// 语音项目
export interface VoiceItem {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  train_mode: string | null;
  state: string | null;
  tags: string[];
  samples: VoiceSample[];
  created_at: string | null;
  updated_at: string | null;
  languages: string[];
  visibility: string | null;
  like_count: number;
  mark_count: number;
  shared_count: number;
  task_count: number;
  liked: boolean;
  marked: boolean;
  author: VoiceAuthor | null;
}

// 语音列表响应
export interface VoiceListResponse {
  total: number;
  items: VoiceItem[];
  page_size: number;
  page_number: number;
}

// 语音查询参数
export interface VoiceQueryParams {
  language?: string;
  page_size?: number;
  page_number?: number;
  title?: string;
  tag?: 'male' | 'female' | 'cartoon';
}

// 语音标签选项
export type VoiceTag = 'male' | 'female' | 'cartoon';

// 存 i18n key 而非文案：本模块非组件，由渲染方（voice-selector.tsx）调 t(labelKey)。
export const VOICE_TAG_OPTIONS: { value: VoiceTag | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'voice.tagAll' },
  { value: 'male', labelKey: 'voice.tagMale' },
  { value: 'female', labelKey: 'voice.tagFemale' },
  { value: 'cartoon', labelKey: 'voice.tagCartoon' },
];

