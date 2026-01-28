import { test, expect } from '@playwright/test';

/**
 * RSVP Manager UI Tests
 *
 * Visual regression tests for the RSVP management interface.
 */

test.describe('RSVP Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('reflets_client_token', 'demo');
      localStorage.setItem('reflets_client_session', 'demo');
      localStorage.setItem('reflets_is_admin', 'true');
    });

    // Navigate to admin page
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Click RSVPs in the sidebar to go to RSVP manager
    await page.click('text=RSVPs');
    await page.waitForTimeout(2000);
  });

  test('RSVP manager should load', async ({ page }) => {
    // Just verify the page loaded
    await expect(page).toHaveScreenshot('rsvp-manager-view.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
  });

  test('tab navigation should be visible', async ({ page }) => {
    // Look for any tab-like navigation
    const tabArea = page.locator('nav, [role="tablist"]').first();
    await expect(tabArea).toBeVisible();
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('rsvp-manager-mobile.png', {
        fullPage: true,
      });
    });
  });
});
