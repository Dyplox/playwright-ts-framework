import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

const isCI = !!process.env.CI;

const allureReporter: ReporterDescription = [
  'allure-playwright',
  {
    resultsDir: 'allure-results',
    detail: true,
    suiteTitle: true,
    environmentInfo: {
      environment: env.name,
      base_url: env.baseURL,
      api_url: env.apiURL,
      node: process.version,
    },
  },
];

// On CI every shard writes a blob report; the merge job turns them into a single HTML report.
const reporter: ReporterDescription[] = isCI
  ? [['blob'], ['github'], ['list'], allureReporter]
  : [['list'], ['html', { open: 'never' }], allureReporter];

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter,
  globalSetup: './src/config/global-setup.ts',

  use: {
    baseURL: env.baseURL,
    testIdAttribute: 'data-test',
    locale: 'en-US',
    timezoneId: 'America/Bogota',
    // Evidence only when something fails: keeps artifacts small and CI fast.
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    // Pure API checks don't need a browser: run them once, not three times.
    { name: 'api', testDir: './tests/api' },
    { name: 'chromium', testIgnore: /tests[\\/]api[\\/]/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: /tests[\\/]api[\\/]/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: /tests[\\/]api[\\/]/, use: { ...devices['Desktop Safari'] } },
  ],
});
