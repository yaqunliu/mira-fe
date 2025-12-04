import { ICharacter } from "./character";
export interface IScene {
    scene_id: number;
    title: string;
    duration: string;
    time_setting: string;
    location: string;
    space_type: string;
    atmosphere: string;
    creation_id: number;
    created_at: string;
    updated_at: string;
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
    scene_id: number;
    image_url: string | null;
    created_at: string;
    updated_at: string | null;
    characters: ICharacter[];
}