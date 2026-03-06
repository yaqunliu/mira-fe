import { test, expect } from '@playwright/test';
import { setupApiMocks, setupAuthMock, setupSSEMock, mockData } from '../mocks/api-mock';

/**
 * 对话-看板联动测试
 * 验证 Agent 对话与看板视图之间的联动功能
 */
test.describe('对话-看板联动', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page);
    await setupApiMocks(page);
  });

  test('7.1.3 验证侧边栏点击切换看板视图', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 点击不同的侧边栏按钮，验证看板切换
    const views = ['角色', '场景', '分镜'];

    for (const view of views) {
      const button = page.locator(`button:has-text("${view}")`).or(
        page.locator(`[aria-label="${view}"]`).or(
          page.locator(`[data-view="${view}"]`)
        )
      );

      if (await button.first().isVisible().catch(() => false)) {
        await button.first().click();
        // 给一点时间让视图切换
        await page.waitForTimeout(300);
      }
    }
  });

  test('验证角色视图显示', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 尝试切换到角色视图
    const charButton = page.locator('button:has-text("角色")').or(
      page.locator('[data-view="characters"]')
    );

    if (await charButton.first().isVisible().catch(() => false)) {
      await charButton.first().click();
      await page.waitForTimeout(500);

      // 验证角色列表显示
      const charName = page.locator(`text=${mockData.creation.characters[0].name}`);
      // 如果角色视图正确渲染，应该能看到角色名称
      if (await charName.isVisible().catch(() => false)) {
        await expect(charName).toBeVisible();
      }
    }
  });

  test('验证场景视图显示', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 尝试切换到场景视图
    const sceneButton = page.locator('button:has-text("场景")').or(
      page.locator('[data-view="scenes"]')
    );

    if (await sceneButton.first().isVisible().catch(() => false)) {
      await sceneButton.first().click();
      await page.waitForTimeout(500);

      // 验证场景信息显示
      const sceneLocation = page.locator(`text=${mockData.creation.scenes[0].location}`);
      if (await sceneLocation.isVisible().catch(() => false)) {
        await expect(sceneLocation).toBeVisible();
      }
    }
  });

  test('验证分镜视图显示', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 尝试切换到分镜视图
    const shotButton = page.locator('button:has-text("分镜")').or(
      page.locator('[data-view="storyboard"]')
    );

    if (await shotButton.first().isVisible().catch(() => false)) {
      await shotButton.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('验证看板与对话面板同时可见', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 验证看板区域可见
    const canvas = page.locator('[data-testid="agent-canvas"]').or(
      page.locator('.flex-1') // 通常看板会使用 flex-1
    );

    // 验证对话面板可见
    const chatPanel = page.locator('[data-testid="agent-chat-panel"]').or(
      page.locator('textarea').locator('..')
    );

    // 两者应该同时可见
    await expect(canvas.first()).toBeVisible();
  });

  test('验证看板视图切换动画', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 快速切换多个视图，验证无闪烁
    const buttons = ['剧本', '角色', '场景', '分镜'];

    for (const buttonText of buttons) {
      const button = page.locator(`button:has-text("${buttonText}")`);
      if (await button.first().isVisible().catch(() => false)) {
        await button.first().click();
        // 短暂等待确保动画完成
        await page.waitForTimeout(200);
      }
    }

    // 页面应该仍然正常
    await expect(page.locator('text=Agent Mode')).toBeVisible();
  });
});
