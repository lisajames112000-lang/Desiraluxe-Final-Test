import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4173', trace: 'on-first-retry' },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npm run preview -- --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
  projects: [
  { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-390', use: { ...devices['iPhone 13'] } }]

});