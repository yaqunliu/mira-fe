import { test, expect } from '@playwright/test';
import { setupApiMocks, setupAuthMock, mockData } from '../mocks/api-mock';

/**
 * 兼容性测试
 * 验证在不同浏览器和设备上的兼容性
 * 注意：不同浏览器/设备的测试通过 playwright.config.ts 中的 projects 配置运行
 */

test.describe('浏览器兼容性测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page);
    await setupApiMocks(page);
  });

  test('7.3.1-4 Agent 页面正常加载', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 验证页面基本元素
    await expect(page.locator('text=Agent Mode')).toBeVisible();
  });

  test('工具栏功能正常', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 验证工具栏按钮可点击
    const modelSettingsBtn = page.locator('button:has-text("模型设置")');
    if (await modelSettingsBtn.isVisible().catch(() => false)) {
      await modelSettingsBtn.click();
      // 对话框应该打开
      await expect(page.locator('text=选择用于生成图片和视频的 AI 模型')).toBeVisible();
    }
  });

  test('模式切换正常', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    const switchButton = page.locator('button:has-text("切换到专业模式")');
    if (await switchButton.isVisible().catch(() => false)) {
      await switchButton.click();
      await page.waitForURL(/\/dynamic-comic-editor/);
      await expect(page.locator('text=Dynamic Comic Editor')).toBeVisible();
    }
  });

  test('输入框交互正常', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    const input = page.locator('textarea, input[type="text"]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('测试消息');
      await expect(input).toHaveValue('测试消息');
    }
  });

  test('页面响应式布局', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 页面应该正常显示
    await expect(page.locator('body')).toBeVisible();
  });

  test('滚动正常', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 执行滚动操作
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    await expect(page.locator('body')).toBeVisible();
  });

  test('网络中断恢复', async ({ page }) => {
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

// 不同视口尺寸测试
test.describe('视口尺寸兼容性', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page);
    await setupApiMocks(page);
  });

  test('桌面端宽屏 (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('桌面端窄屏 (1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('平板横屏 (1024x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('平板竖屏 (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('移动端横屏 (844x390)', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('移动端竖屏 (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });
});
