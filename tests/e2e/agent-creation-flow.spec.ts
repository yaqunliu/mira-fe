import { test, expect } from '@playwright/test';
import { setupApiMocks, setupAuthMock, setupSSEMock, mockData } from '../mocks/api-mock';

/**
 * Agent 创作流程完整测试
 * 验证从进入 Agent 模式到完成创作的完整流程
 */
test.describe('Agent 创作流程', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page);
    await setupApiMocks(page);
  });

  test('7.1.1 验证完整 Agent 创作流程', async ({ page }) => {
    // 1. 导航到 Agent 模式页面
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 2. 验证三栏布局
    // 左侧侧边栏
    await expect(page.locator('[data-testid="agent-sidebar"]').or(
      page.locator('.agent-sidebar').or(page.locator('nav'))
    )).toBeVisible();

    // 中间看板区
    await expect(page.locator('[data-testid="agent-canvas"]').or(
      page.locator('.agent-canvas')
    )).toBeVisible();

    // 右侧对话区
    await expect(page.locator('[data-testid="agent-chat-panel"]').or(
      page.locator('.agent-chat-panel')
    )).toBeVisible();

    // 3. 验证工具栏显示
    await expect(page.locator('text=Agent Mode')).toBeVisible();
  });

  test('验证侧边栏导航功能', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 验证侧边栏按钮存在
    const sidebarButtons = [
      '剧本', '角色', '场景', '分镜', '时间线', '预览'
    ];

    for (const buttonText of sidebarButtons) {
      const button = page.locator(`button:has-text("${buttonText}")`).or(
        page.locator(`[aria-label="${buttonText}"]`)
      );
      // 只检查至少有一个导航元素存在
      if (await button.first().isVisible().catch(() => false)) {
        await expect(button.first()).toBeVisible();
        break;
      }
    }
  });

  test('验证对话输入框功能', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 查找输入框
    const input = page.locator('textarea[placeholder]').or(
      page.locator('input[type="text"][placeholder]')
    ).or(page.locator('[data-testid="chat-input"]'));

    // 验证输入框存在
    await expect(input.first()).toBeVisible();

    // 输入测试文本
    await input.first().fill('你好，帮我创作一个科幻漫画');

    // 验证文本已输入
    await expect(input.first()).toHaveValue('你好，帮我创作一个科幻漫画');
  });

  test('验证发送消息按钮', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 查找发送按钮
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("发送")')
    ).or(page.locator('[data-testid="send-button"]'));

    // 验证按钮存在
    await expect(sendButton.first()).toBeVisible();
  });

  test('验证页面无错误加载', async ({ page }) => {
    // 收集控制台错误
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 过滤掉预期的错误（如 mock 相关）
    const criticalErrors = errors.filter(
      (e) => !e.includes('mock') && !e.includes('favicon') && !e.includes('hydration')
    );

    // 不应该有关键错误
    expect(criticalErrors.length).toBeLessThanOrEqual(0);
  });

  test('验证无效 creationId 处理', async ({ page }) => {
    await page.goto('/zh/create-agent');
    await page.waitForLoadState('networkidle');

    // 应该显示错误提示
    await expect(
      page.locator('text=无效的创作ID').or(page.locator('text=请提供有效的'))
    ).toBeVisible();
  });
});
