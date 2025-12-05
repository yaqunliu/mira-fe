import { AssociatedNovelChapter } from ".";
import { ICharacter } from "./character";
import { IScene } from "./scene";

export enum CreationStatus {
  CREATED = "created",
  PLAYBOOK_GENERATED = "playbook_generated",
  CHARACTER_GENERATED = "character_generated",
  SCENE_GENERATED = "scene_generated",
  VOICE_SELECTED = "voice_selected",
  AUDIO_GENERATED = "audio_generated",
  VIDEO_GENERATED = "video_generated",
  COMPLETED = "completed",
  FAILED = "failed",
}

export const CreationStatusMap: Record<
  CreationStatus,
  { label: string; color: string }
> = {
  [CreationStatus.CREATED]: { label: "进行中", color: "bg-blue-500" },
  [CreationStatus.PLAYBOOK_GENERATED]: {
    label: "进行中",
    color: "bg-blue-500",
  },
  [CreationStatus.CHARACTER_GENERATED]: {
    label: "进行中",
    color: "bg-blue-500",
  },
  [CreationStatus.SCENE_GENERATED]: { label: "进行中", color: "bg-blue-500" },
  [CreationStatus.VOICE_SELECTED]: { label: "进行中", color: "bg-blue-500" },
  [CreationStatus.AUDIO_GENERATED]: { label: "进行中", color: "bg-blue-500" },
  [CreationStatus.VIDEO_GENERATED]: { label: "进行中", color: "bg-blue-500" },
  [CreationStatus.COMPLETED]: { label: "已完成", color: "bg-green-500" },
  [CreationStatus.FAILED]: { label: "出错了", color: "bg-red-500" },
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
  current_task_id?: string;
  voice_id?: string;
  voice_speed?: number;
  characters: ICharacter[];
  scenes: IScene[];
}
