import { test, expect } from '@playwright/test';

test.describe('Admin RSVP UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('reflets_client_token', 'demo');
      localStorage.setItem('reflets_client_session', 'demo');
      localStorage.setItem('reflets_is_admin', 'true');
    });
  });

  test('desktop layout should match snapshot', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await page.click('text=RSVPs');
    // Wait for RSVP view to load
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('admin-rsvp-desktop.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
  });

  test('mobile layout should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // On mobile, the sidebar is hidden and there's a mobile nav button
    // Just verify the page loads and take a screenshot
    await page.waitForTimeout(5000);

    await expect(page).toHaveScreenshot('admin-rsvp-mobile.png', { fullPage: true });
  });
});
