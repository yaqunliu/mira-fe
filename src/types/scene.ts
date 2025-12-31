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
    shots: IShot[];
}

export interface IShot {
    title: string;
    shot_number: number;
    description: string;
    narration: string;
    image_prompt: string;
    shot_id: number;
    uuid?: string;  // UUID字段
    status?: string;
    scene_id: number;
    image_url: string | null;
    video_url: string | null;
    audio_url: string | null;
    duration: number;
    created_at: string;
    updated_at: string | null;
    characters: ICharacter[];
}