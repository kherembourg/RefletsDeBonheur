import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard UI Tests
 *
 * Visual regression tests for the admin dashboard to prevent UI regressions.
 * These tests capture screenshots and compare against baseline images.
 */

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin page (demo mode)
    await page.goto('/admin');
  });

  test('dashboard overview should match snapshot', async ({ page }) => {
    // Wait for the dashboard to load
    await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 }).catch(() => {
      // Fallback: wait for statistics section
      return page.waitForSelector('text=Vue d\'ensemble', { timeout: 10000 });
    });

    // Take a screenshot of the overview section
    await expect(page).toHaveScreenshot('admin-dashboard-overview.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    });
  });

  test('statistics cards should render correctly', async ({ page }) => {
    await page.waitForSelector('text=Photos', { timeout: 10000 });

    // Find and screenshot the stats section
    const statsSection = page.locator('section').first();
    await expect(statsSection).toHaveScreenshot('admin-stats-cards.png');
  });

  test('quick actions grid should match snapshot', async ({ page }) => {
    await page.waitForSelector('text=Actions rapides', { timeout: 10000 });

    const actionsSection = page.locator('text=Actions rapides').locator('..').locator('..');
    await expect(actionsSection).toHaveScreenshot('admin-quick-actions.png');
  });

  test('RSVP card should be visible and styled correctly', async ({ page }) => {
    await page.waitForSelector('text=Gestion RSVP', { timeout: 10000 });

    const rsvpCard = page.locator('text=Gestion RSVP').locator('..').locator('..');
    await expect(rsvpCard).toHaveScreenshot('admin-rsvp-card.png');
  });

  test('settings section should match snapshot', async ({ page }) => {
    await page.waitForSelector('text=Paramètres', { timeout: 10000 });

    // Scroll to settings section
    await page.locator('text=Paramètres').first().scrollIntoViewIfNeeded();

    const settingsSection = page.locator('text=Paramètres').first().locator('..').locator('..');
    await expect(settingsSection).toHaveScreenshot('admin-settings-section.png');
  });

  test('theme section should match snapshot', async ({ page }) => {
    await page.waitForSelector('text=Thème', { timeout: 10000 });

    // Scroll to theme section
    await page.locator('text=Thème').first().scrollIntoViewIfNeeded();

    const themeSection = page.locator('text=Thème').first().locator('..').locator('..');
    await expect(themeSection).toHaveScreenshot('admin-theme-section.png');
  });

  test('mobile view should be responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/admin');
    await page.waitForSelector('text=Vue d\'ensemble', { timeout: 10000 });

    await expect(page).toHaveScreenshot('admin-dashboard-mobile.png', {
      fullPage: true,
    });
  });

  test('tablet view should be responsive', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/admin');
    await page.waitForSelector('text=Vue d\'ensemble', { timeout: 10000 });

    await expect(page).toHaveScreenshot('admin-dashboard-tablet.png', {
      fullPage: true,
    });
  });
});

test.describe('Admin Dashboard Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('clicking RSVP card should navigate to RSVP view', async ({ page }) => {
    await page.waitForSelector('text=Gestion RSVP', { timeout: 10000 });

    // Click on RSVP card
    await page.click('text=Gestion RSVP');

    // Should show RSVP management view
    await expect(page.locator('text=Retour au tableau de bord')).toBeVisible({ timeout: 10000 });
  });

  test('upload toggle should be interactive', async ({ page }) => {
    await page.waitForSelector('text=Autoriser les uploads', { timeout: 10000 });

    // Find the toggle
    const toggle = page.locator('text=Autoriser les uploads').locator('..').locator('button[role="switch"]');

    // Get initial state
    const initialState = await toggle.getAttribute('aria-checked');

    // Click toggle
    await toggle.click();

    // State should change
    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });
});
