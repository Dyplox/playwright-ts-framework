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

const API_TESTS = /tests[\\/]api[\\/]/;
const A11Y_TESTS = /tests[\\/]a11y[\\/]/;
const VISUAL_TESTS = /tests[\\/]visual[\\/]/;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  reporter,
  globalSetup: './src/config/global-setup.ts',

  // Baselines per viewport project and per OS: Linux baselines (CI) are committed,
  // local macOS/Windows baselines are git-ignored.
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}-{platform}{ext}',

  expect: {
    timeout: 7_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      stylePath: './src/visual/screenshot.css',
    },
  },

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

    // Functional suite in the three engines. axe results don't depend on the engine,
    // so accessibility runs once (Chromium) to save CI minutes.
    { name: 'chromium', testIgnore: [API_TESTS, VISUAL_TESTS], use: { ...devices['Desktop Chrome'] } },
    {
      name: 'firefox',
      testIgnore: [API_TESTS, VISUAL_TESTS, A11Y_TESTS],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: [API_TESTS, VISUAL_TESTS, A11Y_TESTS],
      use: { ...devices['Desktop Safari'] },
    },

    // Visual regression: one engine (Chromium) x three viewports = "responsive" coverage.
    { name: 'visual-mobile', testMatch: VISUAL_TESTS, use: { ...devices['Pixel 7'] } },
    {
      name: 'visual-tablet',
      testMatch: VISUAL_TESTS,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 810, height: 1080 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'visual-desktop',
      testMatch: VISUAL_TESTS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
