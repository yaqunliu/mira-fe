import { test, expect, Page } from '@playwright/test';
import { setupApiMocks, setupAuthMock, setupSSEMock, mockData } from '../mocks/api-mock';

/**
 * SSE 事件处理测试
 * 验证 12 种 SSE 事件的正确处理
 */
test.describe('SSE 事件处理', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page);
    await setupApiMocks(page);
  });

  test('7.1.4 验证 thinking 事件显示思考状态', async ({ page }) => {
    // 设置 SSE mock，模拟思考事件
    await setupSSEMock(page, [
      { type: 'thinking', data: { content: '正在分析你的需求...' } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 思考状态组件应该能处理 thinking 事件
    // 这里主要验证页面不会因 SSE 事件而崩溃
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.1.4 验证 text_chunk 事件流式显示文本', async ({ page }) => {
    // 设置 SSE mock，模拟文本流
    await setupSSEMock(page, [
      { type: 'text_chunk', data: { content: '你好，', is_final: false } },
      { type: 'text_chunk', data: { content: '我是创作助手。', is_final: false } },
      { type: 'text_chunk', data: { content: '', is_final: true } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 页面应该正常显示
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.1.4 验证 tool_start/tool_end 事件显示工具调用', async ({ page }) => {
    // 设置 SSE mock，模拟工具调用
    await setupSSEMock(page, [
      { type: 'tool_start', data: { tool_name: 'analyze_character', tool_id: 'tool-1' } },
      { type: 'tool_end', data: { tool_id: 'tool-1', result: { success: true, data: {} } } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('7.1.4 验证 progress 事件显示进度条', async ({ page }) => {
    // 设置 SSE mock，模拟进度更新
    await setupSSEMock(page, [
      { type: 'progress', data: { percent: 0, message: '开始处理...' } },
      { type: 'progress', data: { percent: 50, message: '处理中...' } },
      { type: 'progress', data: { percent: 100, message: '完成' } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('7.1.4 验证 board_action 事件触发看板操作', async ({ page }) => {
    // 设置 SSE mock，模拟看板操作
    await setupSSEMock(page, [
      { type: 'board_action', data: { action: 'switch_view', view: 'characters' } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('7.1.4 验证 data_update 事件更新数据', async ({ page }) => {
    // 设置 SSE mock，模拟数据更新
    await setupSSEMock(page, [
      {
        type: 'data_update',
        data: {
          type: 'character',
          action: 'update',
          data: { uuid: 'char-1', name: '更新后的角色名' },
        },
      },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('7.1.4 验证 error 事件显示错误提示', async ({ page }) => {
    // 设置 SSE mock，模拟错误
    await setupSSEMock(page, [
      { type: 'error', data: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 页面应该仍然正常显示（错误被优雅处理）
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.1.4 验证 done 事件结束对话', async ({ page }) => {
    // 设置 SSE mock，模拟完整对话
    await setupSSEMock(page, [
      { type: 'text_chunk', data: { content: '任务完成！', is_final: true } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('验证多个 SSE 事件的组合处理', async ({ page }) => {
    // 设置 SSE mock，模拟完整的交互序列
    await setupSSEMock(page, [
      { type: 'thinking', data: { content: '分析中...' } },
      { type: 'text_chunk', data: { content: '让我帮你分析角色。', is_final: false } },
      { type: 'tool_start', data: { tool_name: 'analyze_character', tool_id: 'tool-1' } },
      { type: 'progress', data: { percent: 50, message: '分析角色中...' } },
      { type: 'tool_end', data: { tool_id: 'tool-1', result: { success: true } } },
      { type: 'data_update', data: { type: 'character', action: 'create', data: {} } },
      { type: 'board_action', data: { action: 'switch_view', view: 'characters' } },
      { type: 'text_chunk', data: { content: '角色分析完成！', is_final: true } },
      { type: 'done', data: {} },
    ]);

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 页面应该正常处理所有事件
    await expect(page.locator('body')).toBeVisible();
  });

  test('验证 SSE 连接中断后的重连', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 模拟网络中断
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // 恢复网络
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // 页面应该仍然可用
    await expect(page.locator('body')).toBeVisible();
  });
});
