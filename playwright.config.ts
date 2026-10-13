import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173/ju-secure-final/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 390, height: 844 },
      ...(executablePath ? { launchOptions: { executablePath } } : {}),
    },
  }],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173/ju-secure-final/',
    reuseExistingServer: !process.env.CI,
  },
});
