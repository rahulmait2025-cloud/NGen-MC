import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const uiPrepared = process.env.PLAYWRIGHT_UI_PREPARED === 'true';
const configDir = __dirname;
const testDir = path.join(configDir, 'tests', 'e2e');
const nextgenStudentAuthFile = path.join(
  configDir,
  'playwright',
  '.auth',
  'nextgen-student.json',
);

export default defineConfig({
  testDir,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  timeout: uiPrepared ? 120_000 : 60_000,
  expect: {
    timeout: uiPrepared ? 15_000 : 10_000,
  },
  retries: uiPrepared ? 0 : process.env.CI ? 2 : 0,
  workers: uiPrepared ? 1 : process.env.CI ? 1 : undefined,
  maxFailures: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3002',
    actionTimeout: uiPrepared ? 20_000 : 10_000,
    navigationTimeout: uiPrepared ? 45_000 : 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-public',
      testMatch: [
        'login-page.spec.ts',
        'unauthenticated-access.spec.ts',
        'public-*.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'chromium-login',
      testMatch: 'authenticated-login.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'student-auth-setup',
      testMatch: 'auth.setup.ts',
      dependencies: ['chromium-login'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'chromium-authenticated',
      testMatch: [
        'authenticated-dashboard.spec.ts',
        'authenticated-my-courses.spec.ts',
        'authenticated-tenant-isolation.spec.ts',
      ],
      dependencies: ['student-auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: nextgenStudentAuthFile,
      },
    },
  ],
  webServer: {
    command: 'npm run dev:3002',
    url: 'http://localhost:3002/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
