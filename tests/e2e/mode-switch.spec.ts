import { test, expect } from '@playwright/test';
import { setupApiMocks, setupAuthMock, mockData } from '../mocks/api-mock';

/**
 * 模式切换功能测试
 * 验证 Agent 模式与专业模式之间的切换功能
 */
test.describe('模式切换功能', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMock(page);
    await setupApiMocks(page);
  });

  test('7.1.2 从 Agent 模式切换到专业模式', async ({ page }) => {
    // 1. 导航到 Agent 模式页面
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);

    // 2. 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 3. 验证当前在 Agent 模式
    await expect(page.locator('text=Agent Mode')).toBeVisible();

    // 4. 点击切换到专业模式按钮
    const switchButton = page.locator('button:has-text("切换到专业模式")');
    await expect(switchButton).toBeVisible();
    await switchButton.click();

    // 5. 验证跳转到专业模式页面
    await page.waitForURL(/\/dynamic-comic-editor\?taskId=/);

    // 6. 验证专业模式页面元素
    await expect(page.locator('text=Dynamic Comic Editor')).toBeVisible();
  });

  test('7.1.2 从专业模式切换到 Agent 模式', async ({ page }) => {
    // 1. 导航到专业模式页面
    await page.goto(`/zh/dynamic-comic-editor?taskId=${mockData.creation.uuid}`);

    // 2. 等待页面加载完成
    await page.waitForLoadState('networkidle');

    // 3. 验证当前在专业模式
    await expect(page.locator('text=Dynamic Comic Editor')).toBeVisible();

    // 4. 点击切换到 Agent 模式按钮
    const switchButton = page.locator('button:has-text("切换到 Agent 模式")');
    await expect(switchButton).toBeVisible();
    await switchButton.click();

    // 5. 验证跳转到 Agent 模式页面
    await page.waitForURL(/\/create-agent\?creationId=/);

    // 6. 验证 Agent 模式页面元素
    await expect(page.locator('text=Agent Mode')).toBeVisible();
  });

  test('切换模式时数据保持一致', async ({ page }) => {
    // 1. 导航到 Agent 模式
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 2. 验证项目标题
    await expect(page.locator(`text=${mockData.creation.title}`)).toBeVisible();

    // 3. 切换到专业模式
    await page.locator('button:has-text("切换到专业模式")').click();
    await page.waitForURL(/\/dynamic-comic-editor/);
    await page.waitForLoadState('networkidle');

    // 4. 验证项目标题保持一致
    await expect(page.locator(`text=${mockData.creation.title}`)).toBeVisible();
  });

  test('共享工具栏在两种模式下都显示', async ({ page }) => {
    // 1. 在 Agent 模式验证工具栏
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 验证工具栏元素
    await expect(page.locator('button:has-text("模型设置")')).toBeVisible();
    await expect(page.locator('text=16:9').or(page.locator('text=9:16'))).toBeVisible();

    // 2. 切换到专业模式
    await page.locator('button:has-text("切换到专业模式")').click();
    await page.waitForURL(/\/dynamic-comic-editor/);
    await page.waitForLoadState('networkidle');

    // 验证工具栏元素仍然存在
    await expect(page.locator('button:has-text("模型设置")')).toBeVisible();
  });

  test('模型设置对话框功能正常', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 1. 点击模型设置按钮
    await page.locator('button:has-text("模型设置")').click();

    // 2. 验证对话框显示
    await expect(page.locator('text=选择用于生成图片和视频的 AI 模型')).toBeVisible();

    // 3. 验证模型选择器存在
    await expect(page.locator('text=文生图模型')).toBeVisible();
    await expect(page.locator('text=图生图模型')).toBeVisible();
    await expect(page.locator('text=视频生成模型')).toBeVisible();
  });

  test('比例切换功能正常', async ({ page }) => {
    await page.goto(`/zh/create-agent?creationId=${mockData.creation.uuid}`);
    await page.waitForLoadState('networkidle');

    // 1. 找到比例选择器
    const ratioSelector = page.locator('[data-testid="aspect-ratio-selector"]').or(
      page.locator('button:has-text("16:9")').or(page.locator('button:has-text("9:16")'))
    );

    // 2. 点击比例选择器
    await ratioSelector.first().click();

    // 3. 验证选项出现
    await expect(page.locator('text=横版 (16:9)').or(page.locator('text=16:9'))).toBeVisible();
  });
});
