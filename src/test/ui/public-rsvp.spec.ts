import { test, expect } from '@playwright/test';

test.describe('Public RSVP UI', () => {
  test('desktop card should match snapshot', async ({ page }) => {
    await page.goto('/julie-thomas/rsvp');
    await page.waitForSelector('text=RSVP', { timeout: 10000 });

    await expect(page).toHaveScreenshot('public-rsvp-desktop.png', {
      fullPage: true,
    });
  });

  test('mobile card should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/julie-thomas/rsvp');
    await page.waitForSelector('text=RSVP', { timeout: 10000 });

    await expect(page).toHaveScreenshot('public-rsvp-mobile.png', { fullPage: true });
  });
});
