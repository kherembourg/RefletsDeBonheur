import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for UI/Screenshot testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test/ui',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

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

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
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

  /* Snapshot settings */
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
});
