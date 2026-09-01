import { AssociatedNovelChapter } from ".";
import { ICharacter } from "./character";
import { IScene } from "./scene";

export enum CreationStatus {
  CREATED = "created",
  CHARACTER_ANALYZED = "character_analyzed",  // 角色已分析
  PLAYBOOK_GENERATED = "playbook_generated",
  CHARACTER_GENERATED = "character_generated",
  SCENE_GENERATED = "scene_generated",
  VOICE_SELECTED = "voice_selected",
  AUDIO_GENERATED = "audio_generated",
  VIDEO_GENERATED = "video_generated",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * 状态徽标映射。这里存 i18n key 而非文案本身——本模块不是 React 组件，
 * 拿不到 useTranslations；由渲染方（creation-overview.tsx）调 t(labelKey)。
 */
export const CreationStatusMap: Record<
  CreationStatus,
  { labelKey: string; color: string }
> = {
  [CreationStatus.CREATED]: { labelKey: "creation.statusInProgress", color: "bg-blue-500" },
  [CreationStatus.CHARACTER_ANALYZED]: {
    labelKey: "creation.statusInProgress",
    color: "bg-blue-500",
  },
  [CreationStatus.PLAYBOOK_GENERATED]: {
    labelKey: "creation.statusInProgress",
    color: "bg-blue-500",
  },
  [CreationStatus.CHARACTER_GENERATED]: {
    labelKey: "creation.statusInProgress",
    color: "bg-blue-500",
  },
  [CreationStatus.SCENE_GENERATED]: { labelKey: "creation.statusInProgress", color: "bg-blue-500" },
  [CreationStatus.VOICE_SELECTED]: { labelKey: "creation.statusInProgress", color: "bg-blue-500" },
  [CreationStatus.AUDIO_GENERATED]: { labelKey: "creation.statusInProgress", color: "bg-blue-500" },
  [CreationStatus.VIDEO_GENERATED]: { labelKey: "creation.statusInProgress", color: "bg-blue-500" },
  [CreationStatus.COMPLETED]: { labelKey: "creation.statusCompleted", color: "bg-green-500" },
  [CreationStatus.FAILED]: { labelKey: "creation.statusFailed", color: "bg-red-500" },
} as const;

export interface ICreation {
  creation_id: string;
  uuid: string;
  title: string;
  status: CreationStatus;
  created_at: string;
  updated_at: string;
  video_url?: string;
  audio_url?: string;
  owner_id: string;
  novel_id: string;
  chapter_id: string;
  novel_uuid?: string;  // 小说UUID
  chapter_uuid?: string;  // 章节UUID
  current_task_id?: string;
  voice_id?: string;
  voice_speed?: number;
  timeline_config?: any;
  extra_data?: Record<string, any>;
  characters: ICharacter[];
  scenes: IScene[];
  character_ids?: number[];  // 关联的角色ID列表
  workflow_mode?: "traditional" | "agent";  // 工作流模式
  creation_type?: "chapter" | "script" | "chat";  // 创作类型
}
