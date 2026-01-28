import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for UI/Screenshot testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test/ui',

  /* Only match .spec.ts files (exclude .test.tsx Vitest files) */
  testMatch: '**/*.spec.ts',

  /* Run tests in files in parallel - disabled to avoid timing issues with dev server */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,

  /* Single worker to avoid resource contention with dev server */
  workers: 1,

  /* Reporter to use */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL for navigation */
    baseURL: 'http://localhost:4321',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot settings */
    screenshot: 'only-on-failure',

    /* Video settings */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  /* Note: Mobile tests are skipped for now as the admin panel sidebar is hidden on mobile */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server before starting tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Folder for test artifacts */
  outputDir: 'test-results/',

  /* Snapshot settings - increased tolerance for timing variations */
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 500,
      threshold: 0.25,
    },
  },
});
