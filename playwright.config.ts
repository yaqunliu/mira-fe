import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 用于 Agent 创作模式功能测试
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* 并行运行测试 */
  fullyParallel: true,

  /* 在 CI 上失败时不重试 */
  forbidOnly: !!process.env.CI,

  /* 重试配置 */
  retries: process.env.CI ? 2 : 0,

  /* 并行 worker 数量 */
  workers: process.env.CI ? 1 : undefined,

  /* 测试报告 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  /* 全局设置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:3001',

    /* 收集测试失败时的追踪信息 */
    trace: 'on-first-retry',

    /* 截图 */
    screenshot: 'only-on-failure',

    /* 视频 */
    video: 'on-first-retry',
  },

  /* 配置不同浏览器的项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 移动端测试 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 开发服务器配置 */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
