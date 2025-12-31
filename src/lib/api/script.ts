import { apiClient } from './client';

export interface ScriptGroup {
    novel_id: number;
    uuid: string;
    title: string;
    author?: string;
    chapter_count: number;
    status: string;
    owner_id: number;
    created_at: string;
    updated_at?: string;
    creation_ids?: number[];
    character_ids?: number[];
    type: string;
}

export interface ScriptItem {
    chapter_id: number;
    uuid: string;
    title: string;
    chapter_number: number;
    word_count: number;
    preview?: string;
    content_url?: string;
    created_at: string;
    has_creation?: boolean;
}

export interface CreateScriptGroupData {
    title: string;
    author?: string;
    type?: string;
}

export interface CreateScriptItemData {
    title: string;
    content: string;
    novel_id?: number;
    chapter_number?: number;
}

export const scriptApi = {
    // 获取文案组列表 - 使用 novels API 并过滤 type='script'
    getScripts: (params?: {
        page?: number;
        page_size?: number;
        status?: string;
        search?: string;
        title?: string;
        type?: string;
        order_by?: string;
        order?: string;
    }) => {
        // 使用传入的 type，如果没有则默认传 type=script (旧逻辑兼容) 或不传 (后端处理全部)
        const scriptParams = { ...params };
        // 如果 activeTab 是 all，params.type 会是 undefined，这正是我们想要的
        return apiClient.get('/api/v1/novels/', { params: scriptParams });
    },

    // 创建文案组 - 使用 novels create endpoint，type 自动设为 'script'
    createScript: (data: CreateScriptGroupData) => {
        const scriptData = { ...data, type: 'script' };
        return apiClient.post('/api/v1/novels/create', scriptData);
    },

    // 获取文案组详情
    getScript: (uuid: string) => apiClient.get(`/api/v1/novels/${uuid}`),

    // 更新文案组
    updateScript: (uuid: string, data: Partial<ScriptGroup>) => apiClient.put(`/api/v1/novels/${uuid}`, data),

    // 删除文案组
    deleteScript: (uuid: string) => apiClient.delete(`/api/v1/novels/${uuid}`),

    // 获取文案列表 (使用 chapters endpoint)
    getScriptItems: (uuid: string, params?: {
        page?: number;
        page_size?: number;
    }) => apiClient.get(`/api/v1/novels/${uuid}/chapters`, { params }),

    // 创建文案 (使用 chapters endpoint)
    createScriptItem: (uuid: string, data: CreateScriptItemData) => apiClient.post(`/api/v1/novels/${uuid}/chapters`, data),

    // 更新文案
    updateScriptItem: (uuid: string, itemUuid: string, data: Partial<ScriptItem>) =>
        apiClient.put(`/api/v1/novels/${uuid}/chapters/${itemUuid}`, data),

    // 删除文案
    deleteScriptItem: (uuid: string, itemUuid: string) =>
        apiClient.delete(`/api/v1/novels/${uuid}/chapters/${itemUuid}`),
};
