import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

const isCI = !!process.env.CI;

const allureReporter: ReporterDescription = [
  'allure-playwright',
  {
    resultsDir: 'allure-results',
    detail: true,
    suiteTitle: true,
    // Triage at a glance: is it the product, the test, or the infrastructure?
    categories: [
      {
        name: 'Infrastructure (app or network unavailable)',
        messageRegex: '.*(ECONNREFUSED|ECONNRESET|net::ERR_|is not reachable|503 Service Unavailable).*',
        matchedStatuses: ['failed', 'broken'],
      },
      {
        name: 'Visual differences',
        messageRegex: '.*(toHaveScreenshot|Screenshot comparison failed|pixels .* are different).*',
        matchedStatuses: ['failed'],
      },
      {
        name: 'Accessibility violations',
        messageRegex: '.*WCAG 2\\.1 AA violations.*',
        matchedStatuses: ['failed'],
      },
      {
        name: 'API contract broken',
        messageRegex: '.*(Contract violation|does not match the OpenAPI).*',
        matchedStatuses: ['failed'],
      },
      {
        name: 'Test defects (locators, timeouts, code)',
        messageRegex: '.*(TimeoutError|locator\\.|TypeError|ReferenceError|strict mode violation).*',
        matchedStatuses: ['failed', 'broken'],
      },
      { name: 'Product defects (assertion failed)', matchedStatuses: ['failed'] },
    ],
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
const UNIT_TESTS = /tests[\\/]unit[\\/]/;

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
    // Framework internals (builders, JWT helpers, a11y classification): no app, no browser.
    { name: 'unit', testDir: './tests/unit' },

    // Pure API checks don't need a browser: run them once, not three times.
    { name: 'api', testDir: './tests/api' },

    // Functional suite in the three engines. axe results don't depend on the engine,
    // so accessibility runs once (Chromium) to save CI minutes.
    {
      name: 'chromium',
      testIgnore: [API_TESTS, VISUAL_TESTS, UNIT_TESTS],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: [API_TESTS, VISUAL_TESTS, UNIT_TESTS, A11Y_TESTS],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: [API_TESTS, VISUAL_TESTS, UNIT_TESTS, A11Y_TESTS],
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
