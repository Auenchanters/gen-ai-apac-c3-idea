import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';
const isCi = process.env['CI'] === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: isCi,
  fullyParallel: true,
  retries: isCi ? 2 : 0,
  ...(isCi ? { workers: 1 } : {}),
  reporter: isCi ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] }
    }
  ],
  webServer: {
    command: 'npm run preview',
    reuseExistingServer: !isCi,
    timeout: 120_000,
    url: baseURL
  }
});
