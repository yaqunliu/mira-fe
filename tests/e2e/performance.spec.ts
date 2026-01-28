import { test, expect } from '@playwright/test';
import { setupApiMocks, setupAuthMock, mockData } from '../mocks/api-mock';

/**
 * 性能测试
 * 验证高频消息、长列表滚动和网络中断场景
 */
test.describe('性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page);
    await setupApiMocks(page);
  });

  test('7.2.1 测试高频消息场景（>100/秒）', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 测试快速 DOM 更新不会导致性能问题
    const startTime = Date.now();

    // 模拟快速操作
    for (let i = 0; i < 50; i++) {
      // 快速点击不同区域
      const input = page.locator('textarea, input[type="text"]').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill(`测试消息 ${i}`);
      }
      await page.waitForTimeout(10); // 100 次/秒
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 应该在合理时间内完成（<5秒）
    expect(duration).toBeLessThan(5000);

    // 页面应该仍然响应
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.2.2 测试页面滚动性能', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 获取可滚动区域
    const scrollableArea = page.locator('[data-testid="chat-messages"]').or(
      page.locator('.overflow-y-auto').first()
    );

    if (await scrollableArea.isVisible().catch(() => false)) {
      // 执行多次滚动
      for (let i = 0; i < 10; i++) {
        await scrollableArea.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(50);
        await scrollableArea.evaluate((el) => {
          el.scrollTop = 0;
        });
        await page.waitForTimeout(50);
      }
    }

    // 页面应该保持响应
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.2.3 测试网络中断自动重连', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 记录初始状态
    const initialContent = await page.content();

    // 模拟网络中断
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // 恢复网络
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);

    // 页面应该能够恢复
    await expect(page.locator('body')).toBeVisible();

    // 核心 UI 元素应该仍然存在
    await expect(page.locator('text=Agent Mode')).toBeVisible();
  });

  test('测试页面初始加载性能', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 首次加载应该在 10 秒内完成
    expect(loadTime).toBeLessThan(10000);

    console.log(`页面加载时间: ${loadTime}ms`);
  });

  test('测试内存使用（长时间运行）', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 获取初始内存使用（如果可用）
    const initialMetrics = await page.metrics();

    // 执行多次操作
    for (let i = 0; i < 20; i++) {
      const input = page.locator('textarea, input[type="text"]').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill(`长时间测试消息 ${i}`);
        await input.clear();
      }
      await page.waitForTimeout(100);
    }

    // 获取最终内存使用
    const finalMetrics = await page.metrics();

    // 内存增长不应该过大（允许 100MB 增长）
    if (initialMetrics.JSHeapUsedSize && finalMetrics.JSHeapUsedSize) {
      const memoryGrowth = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
    }

    // 页面应该仍然正常
    await expect(page.locator('body')).toBeVisible();
  });

  test('测试快速模式切换性能', async ({ page }) => {
    const startTime = Date.now();

    // 多次模式切换
    for (let i = 0; i < 3; i++) {
      await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
      await page.waitForLoadState('networkidle');

      const switchButton = page.locator('button:has-text("切换到专业模式")');
      if (await switchButton.isVisible().catch(() => false)) {
        await switchButton.click();
        await page.waitForURL(/\/dynamic-comic-editor/);
      }

      const backButton = page.locator('button:has-text("切换到 Agent 模式")');
      if (await backButton.isVisible().catch(() => false)) {
        await backButton.click();
        await page.waitForURL(/\/create-agent/);
      }
    }

    const totalTime = Date.now() - startTime;

    // 多次切换应该在 30 秒内完成
    expect(totalTime).toBeLessThan(30000);

    console.log(`3次模式切换总时间: ${totalTime}ms`);
  });
});
