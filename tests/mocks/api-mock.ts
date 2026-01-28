import { Page, Route } from '@playwright/test';

/**
 * API Mock 数据和处理函数
 * 用于 E2E 测试中模拟后端 API 响应
 */

// Mock 数据
export const mockData = {
  // 用户认证
  auth: {
    token: 'mock-jwt-token-for-testing',
    user: {
      id: 1,
      uuid: 'user-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
    },
  },

  // 创作项目
  creation: {
    uuid: 'creation-uuid-12345',
    title: '测试漫画项目',
    novel_id: 1,
    chapter_id: 1,
    status: 'active',
    extra_data: {
      aspect_ratio: '16:9',
      visual_style: 'anime',
      video_model: 'wan-ai',
      text_to_image_model: 'flux-schnell',
      image_to_image_model: 'flux-dev',
      steps: {
        characterAnalysis: { triggered: true, status: 'success' },
        sceneAnalysis: { triggered: true, status: 'success' },
        shotAnalysis: { triggered: true, status: 'success' },
      },
    },
    characters: [
      {
        uuid: 'char-uuid-1',
        character_id: 1,
        name: '李明',
        body: '身材高大，肌肉发达',
        appearance: '黑色短发，剑眉星目',
        personality: '正直勇敢',
        image_url: 'https://example.com/char1.jpg',
        status: 'completed',
      },
      {
        uuid: 'char-uuid-2',
        character_id: 2,
        name: '王芳',
        body: '身材苗条',
        appearance: '长发飘飘，温柔可人',
        personality: '聪明善良',
        image_url: 'https://example.com/char2.jpg',
        status: 'completed',
      },
    ],
    scenes: [
      {
        uuid: 'scene-uuid-1',
        scene_id: 1,
        title: '开场场景',
        location: '城市街道',
        time_setting: '傍晚',
        atmosphere: '热闹繁华',
        image_url: 'https://example.com/scene1.jpg',
        shots: [
          {
            uuid: 'shot-uuid-1',
            shot_id: 1,
            shot_number: 1,
            description: '远景展示城市街道',
            image_url: 'https://example.com/shot1.jpg',
            video_url: 'https://example.com/shot1.mp4',
            audio_url: 'https://example.com/shot1.mp3',
            video_duration: 5,
            narration: [{ content: '这是一个繁华的城市' }],
            status: 'completed',
            status_detail: { video_status: 'completed' },
          },
          {
            uuid: 'shot-uuid-2',
            shot_id: 2,
            shot_number: 2,
            description: '特写主角表情',
            image_url: 'https://example.com/shot2.jpg',
            video_duration: 3,
            narration: [{ content: '李明走在街上' }],
            status: 'completed',
          },
        ],
      },
    ],
    timeline_config: {
      projectId: 'project-123',
      duration: 30,
      fps: 30,
      tracks: [
        { id: 'track-video-main', type: 'video', name: 'Video', isLocked: true, clips: [] },
        { id: 'track-audio-main', type: 'audio', name: 'Audio', isLocked: true, clips: [] },
        { id: 'track-text-main', type: 'text', name: 'Subtitles', isLocked: true, clips: [] },
      ],
    },
  },

  // 模型配置
  modelConfigs: {
    video: [
      { model_name: 'wan-ai', display_name: 'Wan AI 视频', is_default: true },
      { model_name: 'kling', display_name: 'Kling 视频', is_default: false },
    ],
    text_to_image: [
      { model_name: 'flux-schnell', display_name: 'Flux Schnell', is_default: true },
      { model_name: 'flux-dev', display_name: 'Flux Dev', is_default: false },
    ],
    image_to_image: [
      { model_name: 'flux-dev', display_name: 'Flux Dev', is_default: true },
    ],
  },

  // Agent 对话
  agentMessages: [
    {
      id: 'msg-1',
      role: 'assistant',
      content: '你好！我是你的创作助手。请告诉我你想创作什么样的漫画？',
      timestamp: Date.now(),
    },
  ],

  // SSE 事件序列
  sseEvents: {
    thinking: { type: 'thinking', data: { content: '正在思考...' } },
    textChunk: { type: 'text_chunk', data: { content: '你好，', is_final: false } },
    textFinal: { type: 'text_chunk', data: { content: '我是创作助手！', is_final: true } },
    toolStart: { type: 'tool_start', data: { tool_name: 'analyze_character', tool_id: 'tool-1' } },
    toolEnd: { type: 'tool_end', data: { tool_id: 'tool-1', result: { success: true } } },
    progress: { type: 'progress', data: { percent: 50, message: '处理中...' } },
    boardAction: { type: 'board_action', data: { action: 'switch_view', view: 'characters' } },
    dataUpdate: { type: 'data_update', data: { type: 'character', action: 'update', data: {} } },
    error: { type: 'error', data: { message: '发生错误', code: 'ERROR_001' } },
    done: { type: 'done', data: {} },
  },

  // 任务状态
  task: {
    task_id: 'task-uuid-123',
    status: 'SUCCESS',
    message: '任务完成',
    progress: { percent: 100 },
  },
};

/**
 * 设置 API Mock 路由
 */
export async function setupApiMocks(page: Page) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Mock 创作项目查询
  await page.route(`${API_BASE}/api/v1/creations/*`, async (route: Route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockData.creation,
        }),
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockData.creation,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock 模型配置
  await page.route(`${API_BASE}/api/v1/model-configs*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockData.modelConfigs,
      }),
    });
  });

  // Mock 任务状态查询
  await page.route(`${API_BASE}/api/v1/tasks/*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockData.task,
      }),
    });
  });

  // Mock Agent 对话 API
  await page.route(`${API_BASE}/api/v1/agent/chat`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { session_id: 'session-123' },
      }),
    });
  });

  // Mock Agent 历史消息
  await page.route(`${API_BASE}/api/v1/agent/messages*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockData.agentMessages,
      }),
    });
  });

  // Mock 小说/章节列表
  await page.route(`${API_BASE}/api/v1/novels*`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          items: [
            { novel_id: 1, uuid: 'novel-1', title: '测试小说', author: '作者', chapter_count: 5, type: 'novel' },
          ],
          total_pages: 1,
        },
      }),
    });
  });

  // Mock 视频生成
  await page.route(`${API_BASE}/api/v1/video-generation/**`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        task_id: mockData.creation.uuid,
      }),
    });
  });

  // Mock 角色分析
  await page.route(`${API_BASE}/api/v1/creations/*/analyze-characters`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { task_id: 'task-char-analysis' },
      }),
    });
  });

  // Mock 场景分析
  await page.route(`${API_BASE}/api/v1/creations/*/generate-playbook`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { task_id: 'task-scene-analysis' },
      }),
    });
  });

  // Mock 分镜分析
  await page.route(`${API_BASE}/api/v1/creations/*/analyze-shots`, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { task_id: 'task-shot-analysis' },
      }),
    });
  });
}

/**
 * 模拟 SSE 事件流
 */
export function createSSEStream(events: Array<{ type: string; data: any }>, delay = 100): string {
  return events
    .map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`)
    .join('');
}

/**
 * 设置 SSE Mock
 */
export async function setupSSEMock(page: Page, events: Array<{ type: string; data: any }>) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  await page.route(`${API_BASE}/api/v1/agent/stream*`, async (route: Route) => {
    const sseData = createSSEStream(events);
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: sseData,
    });
  });
}

/**
 * 设置认证 Mock（注入 token 到 localStorage）
 */
export async function setupAuthMock(page: Page) {
  await page.addInitScript(() => {
    // 模拟 zustand 持久化存储的认证状态
    const authState = {
      state: {
        token: 'mock-jwt-token-for-testing',
        user: {
          id: 1,
          uuid: 'user-uuid-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem('auth-storage', JSON.stringify(authState));
  });
}
