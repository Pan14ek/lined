import { defineConfig, devices } from '@playwright/test';

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e/journeys',
  outputDir: './e2e-artifacts/test-results',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi
    ? [['line'], ['html', { outputFolder: 'e2e-artifacts/report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'e2e-artifacts/report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
