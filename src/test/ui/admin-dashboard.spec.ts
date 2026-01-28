import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard UI Tests
 *
 * Visual regression tests for the admin dashboard to prevent UI regressions.
 * These tests capture screenshots and compare against baseline images.
 */

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('reflets_client_token', 'demo');
      localStorage.setItem('reflets_client_session', 'demo');
      localStorage.setItem('reflets_is_admin', 'true');
    });

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('dashboard view should match snapshot', async ({ page }) => {
    await page.waitForSelector('text=Welcome back', { timeout: 10000 });

    await expect(page).toHaveScreenshot('admin-dashboard-desktop.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
  });

  test('sidebar should render with navigation items', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot('admin-sidebar.png');
  });

  test('gallery share panel should be visible', async ({ page }) => {
    await page.waitForSelector('text=QR Code Galerie', { timeout: 10000 });
    const sharePanel = page.locator('text=QR Code Galerie').locator('..');
    await expect(sharePanel).toHaveScreenshot('admin-qr-panel.png');
  });

  test('mobile view should show mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    // Wait for the page to render fully
    await page.waitForTimeout(6000);

    await expect(page).toHaveScreenshot('admin-mobile-view.png', {
      fullPage: true,
      maxDiffPixels: 200,
    });
  });
});

test.describe('Admin Dashboard Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('reflets_client_token', 'demo');
      localStorage.setItem('reflets_client_session', 'demo');
      localStorage.setItem('reflets_is_admin', 'true');
    });
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('switching to dashboard view should show stats', async ({ page }) => {
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.click('text=Dashboard');
    await page.waitForSelector("text=Vue d'ensemble", { timeout: 10000 });
    await expect(page.locator("text=Vue d'ensemble")).toBeVisible();
  });

  test('gallery tabs should switch to albums', async ({ page }) => {
    // The page should already be loaded from beforeEach
    await page.click('text=Photo Gallery');
    // Wait for gallery view to load - look for Albums section
    await page.waitForSelector('text=Albums', { timeout: 15000 });
    await page.click('text=Albums');
    await page.waitForSelector('text=Nouvel Album', { timeout: 15000 });
    await expect(page.locator('text=Nouvel Album')).toBeVisible();
  });
});
