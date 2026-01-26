import { test, expect } from '@playwright/test';

/**
 * RSVP Manager UI Tests
 *
 * Visual regression tests for the RSVP management interface.
 */

test.describe('RSVP Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin page and click RSVP
    await page.goto('/admin');
    await page.waitForSelector('text=Gestion RSVP', { timeout: 10000 });
    await page.click('text=Gestion RSVP');
    await page.waitForSelector('text=RSVP activé', { timeout: 10000 });
  });

  test('RSVP manager header should match snapshot', async ({ page }) => {
    const header = page.locator('h1:has-text("Gestion RSVP")').locator('..');
    await expect(header).toHaveScreenshot('rsvp-manager-header.png');
  });

  test('statistics cards should render correctly', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('text=Réponses', { timeout: 10000 });

    // Screenshot the stats grid
    const statsGrid = page.locator('.grid').first();
    await expect(statsGrid).toHaveScreenshot('rsvp-stats-cards.png');
  });

  test('tab navigation should match snapshot', async ({ page }) => {
    const tabNav = page.locator('nav[aria-label="Tabs"]');
    await expect(tabNav).toHaveScreenshot('rsvp-tab-navigation.png');
  });

  test.describe('Settings Tab', () => {
    test('should display settings form', async ({ page }) => {
      // Ensure we're on settings tab
      await page.click('text=Paramètres');
      await page.waitForSelector('text=Options générales', { timeout: 10000 });

      await expect(page.locator('text=Options générales').locator('..').locator('..')).toHaveScreenshot(
        'rsvp-settings-form.png'
      );
    });

    test('should show deadline input', async ({ page }) => {
      await page.click('text=Paramètres');
      await page.waitForSelector('text=Date limite de réponse', { timeout: 10000 });

      expect(await page.locator('input[type="date"]').count()).toBeGreaterThan(0);
    });

    test('should show message fields', async ({ page }) => {
      await page.click('text=Paramètres');
      await page.waitForSelector('text=Messages personnalisés', { timeout: 10000 });

      expect(await page.locator('text=Message d\'accueil').count()).toBe(1);
      expect(await page.locator('text=Message de remerciement').count()).toBe(1);
    });
  });

  test.describe('Questions Tab', () => {
    test('should display empty state when no questions', async ({ page }) => {
      await page.click('text=Questions');
      await page.waitForSelector('text=Questions personnalisées', { timeout: 10000 });

      await expect(page.locator('text=Aucune question personnalisée')).toBeVisible();
    });

    test('should show question type buttons', async ({ page }) => {
      await page.click('text=Questions');
      await page.waitForSelector('text=Questions personnalisées', { timeout: 10000 });

      await expect(page.locator('text=Champ texte libre')).toBeVisible();
      await expect(page.locator('text=Choix unique')).toBeVisible();
      await expect(page.locator('text=Choix multiple')).toBeVisible();
    });

    test('adding a text question should work', async ({ page }) => {
      await page.click('text=Questions');
      await page.waitForSelector('text=Champ texte libre', { timeout: 10000 });

      // Click add text question button
      await page.click('text=Champ texte libre');

      // Should show the question editor
      await expect(page.locator('text=Question sans titre')).toBeVisible({ timeout: 5000 });
    });

    test('question editor should match snapshot', async ({ page }) => {
      await page.click('text=Questions');
      await page.waitForSelector('text=Champ texte libre', { timeout: 10000 });

      // Add a question
      await page.click('text=Champ texte libre');
      await page.waitForSelector('text=Question sans titre', { timeout: 5000 });

      // Click to expand
      await page.click('text=Question sans titre');
      await page.waitForSelector('text=Intitulé de la question', { timeout: 5000 });

      const questionEditor = page.locator('text=Intitulé de la question').locator('..').locator('..');
      await expect(questionEditor).toHaveScreenshot('rsvp-question-editor.png');
    });
  });

  test.describe('Responses Tab', () => {
    test('should display empty state when no responses', async ({ page }) => {
      // Click on the Réponses tab (not the stat)
      const responsesTab = page.locator('nav[aria-label="Tabs"] button:has-text("Réponses")');
      await responsesTab.click();
      await page.waitForSelector('text=Aucune réponse', { timeout: 10000 });

      await expect(page.locator('text=Aucune réponse')).toBeVisible();
    });

    test('should show search and filter controls', async ({ page }) => {
      const responsesTab = page.locator('nav[aria-label="Tabs"] button:has-text("Réponses")');
      await responsesTab.click();
      await page.waitForSelector('text=Aucune réponse', { timeout: 10000 });

      // Search input
      await expect(page.locator('input[placeholder="Rechercher par nom ou email..."]')).toBeVisible();

      // Filter dropdown
      await expect(page.locator('select')).toBeVisible();

      // Export button
      await expect(page.locator('text=Exporter')).toBeVisible();
    });

    test('filter and export controls should match snapshot', async ({ page }) => {
      const responsesTab = page.locator('nav[aria-label="Tabs"] button:has-text("Réponses")');
      await responsesTab.click();
      await page.waitForSelector('text=Aucune réponse', { timeout: 10000 });

      const controls = page.locator('input[placeholder="Rechercher par nom ou email..."]').locator('..').locator('..');
      await expect(controls).toHaveScreenshot('rsvp-response-controls.png');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page).toHaveScreenshot('rsvp-manager-mobile.png', {
        fullPage: true,
      });
    });

    test('tabs should stack on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const tabNav = page.locator('nav[aria-label="Tabs"]');
      await expect(tabNav).toHaveScreenshot('rsvp-tabs-mobile.png');
    });
  });

  test.describe('Toggle Functionality', () => {
    test('should toggle RSVP enabled state', async ({ page }) => {
      const toggle = page.locator('button[role="switch"]').first();

      // Get initial state
      const initialState = await toggle.getAttribute('aria-checked');

      // Click toggle
      await toggle.click();

      // State should change
      const newState = await toggle.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);

      // Save button should appear
      await expect(page.locator('text=Enregistrer')).toBeVisible({ timeout: 5000 });
    });
  });
});
