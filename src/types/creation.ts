import { AssociatedNovelChapter } from ".";

export enum CreationStatus {
  CREATED = "created",
  PLAYBOOK_GENERATED = "playbook_generated",
  CHARACTER_GENERATED = "character_generated",
  SCENE_GENERATED = "scene_generated",
  AUDIO_GENERATED = "audio_generated",
  VIDEO_GENERATED = "video_generated",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface Creation {
    creation_id: string;
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
  }