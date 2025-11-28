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

export const VOICE_TAG_OPTIONS: { value: VoiceTag | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'male', label: '男声' },
  { value: 'female', label: '女声' },
  { value: 'cartoon', label: '卡通' },
];

