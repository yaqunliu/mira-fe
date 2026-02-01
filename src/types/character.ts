

export interface ICharacter {
    character_id: number;
    uuid?: string;
    name: string;
    status: string;
    basic_info: string;
    appearance?: string;
    body?: string;
    hair?: string;
    clothing?: string;
    tags?: string[];
    visual_style?: string;
    image_prompt?: string;
    image_url?: string;
    voice_description?: string;
    voice_id?: string;
    voice_speed?: string;
    novel_id: number | string;
    creation_id: number | string;
    created_at: string;
    updated_at: string;
}