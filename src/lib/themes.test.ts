import { describe, it, expect } from 'vitest';
import {
  getTheme,
  generateThemeCSS,
  createThemeContext,
  themeList,
  type ThemeId,
} from './themes';

describe('themes.ts', () => {
  describe('getTheme', () => {
    it('returns the classic theme by default', () => {
      const theme = getTheme('classic');
      expect(theme).toBeDefined();
      expect(theme.id).toBe('classic');
    });

    it('returns the luxe theme', () => {
      const theme = getTheme('luxe');
      expect(theme).toBeDefined();
      expect(theme.id).toBe('luxe');
    });

    it('returns all available themes', () => {
      const themeIds: ThemeId[] = ['classic', 'luxe', 'jardin', 'cobalt', 'editorial', 'french'];
      for (const id of themeIds) {
        const theme = getTheme(id);
        expect(theme).toBeDefined();
      }
    });

    it('falls back to classic theme for unknown theme ID', () => {
      const theme = getTheme('nonexistent' as ThemeId);
      expect(theme.id).toBe('classic');
    });
  });

  describe('generateThemeCSS', () => {
    it('generates CSS variables from theme', () => {
      const theme = getTheme('classic');
      const css = generateThemeCSS(theme);

      expect(css).toContain('--theme-primary:');
      expect(css).toContain('--theme-accent:');
      expect(css).toContain('--theme-background:');
      expect(css).toContain('--theme-text:');
      expect(css).toContain('--theme-border-radius:');
      expect(css).toContain('--theme-font-display:');
      expect(css).toContain('--theme-font-body:');
    });

    it('uses the theme colors in CSS', () => {
      const theme = getTheme('classic');
      const css = generateThemeCSS(theme);

      expect(css).toContain(theme.colors.primary);
      expect(css).toContain(theme.colors.background);
    });

    it('generates different CSS for different themes', () => {
      const classicCSS = generateThemeCSS(getTheme('classic'));
      const luxeCSS = generateThemeCSS(getTheme('luxe'));

      expect(classicCSS).not.toBe(luxeCSS);
    });
  });

  describe('createThemeContext', () => {
    it('creates context for classic theme', () => {
      const context = createThemeContext('classic');

      expect(context.theme).toBeDefined();
      expect(context.colors).toBeDefined();
      expect(context.isClassic).toBe(true);
      expect(context.isLuxe).toBe(false);
    });

    it('creates context for luxe theme', () => {
      const context = createThemeContext('luxe');

      expect(context.isLuxe).toBe(true);
      expect(context.isClassic).toBe(false);
    });

    it('returns correct colors from theme', () => {
      const context = createThemeContext('classic');
      const theme = getTheme('classic');

      expect(context.colors).toEqual(theme.colors);
    });
  });

  describe('themeList', () => {
    it('contains all themes', () => {
      expect(themeList.length).toBeGreaterThan(0);
    });

    it('each theme has required fields', () => {
      for (const theme of themeList) {
        expect(theme.id).toBeDefined();
        expect(theme.name).toBeDefined();
        expect(theme.colors).toBeDefined();
        expect(theme.typography).toBeDefined();
        expect(theme.layout).toBeDefined();
      }
    });
  });
});
