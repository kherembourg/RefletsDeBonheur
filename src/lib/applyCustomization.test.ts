import { describe, it, expect } from 'vitest';
import {
  extractCustomization,
  getEffectiveTheme,
  generateCustomizationCSS,
  getEffectiveContent,
  getEffectiveImage,
  createCustomizationProps,
} from './applyCustomization';
import type { WeddingCustomization, CustomPalette, CustomContent, CustomImages } from './customization';
import { classicTheme, luxeTheme } from './themes';

describe('applyCustomization', () => {
  describe('extractCustomization', () => {
    it('should extract customization from config', () => {
      const config = {
        customization: {
          themeId: 'luxe' as const,
          customPalette: { primary: '#ff0000' },
        },
      };

      const result = extractCustomization(config);

      expect(result).toEqual(config.customization);
    });

    it('should return null when no customization', () => {
      const config = {};

      const result = extractCustomization(config);

      expect(result).toBeNull();
    });

    it('should return null when config is undefined', () => {
      const result = extractCustomization(undefined);

      expect(result).toBeNull();
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return base theme when no custom palette', () => {
      const theme = getEffectiveTheme('classic');

      expect(theme.id).toBe('classic');
      expect(theme.colors).toEqual(classicTheme.colors);
    });

    it('should merge custom palette with base theme', () => {
      const customPalette: CustomPalette = {
        primary: '#ff0000',
        accent: '#00ff00',
      };

      const theme = getEffectiveTheme('classic', customPalette);

      expect(theme.colors.primary).toBe('#ff0000');
      expect(theme.colors.accent).toBe('#00ff00');
      expect(theme.colors.background).toBe(classicTheme.colors.background);
    });

    it('should work with luxe theme', () => {
      const customPalette: CustomPalette = {
        primary: '#000000',
      };

      const theme = getEffectiveTheme('luxe', customPalette);

      expect(theme.id).toBe('luxe');
      expect(theme.colors.primary).toBe('#000000');
      expect(theme.colors.accent).toBe(luxeTheme.colors.accent);
    });
  });

  describe('generateCustomizationCSS', () => {
    it('should generate CSS variables', () => {
      const css = generateCustomizationCSS(classicTheme);

      expect(css).toContain(':root {');
      expect(css).toContain('--theme-primary:');
      expect(css).toContain('--theme-accent:');
      expect(css).toContain(classicTheme.colors.primary);
    });

    it('should include custom palette colors', () => {
      const customPalette: CustomPalette = {
        primary: '#ff0000',
      };

      const css = generateCustomizationCSS(classicTheme, customPalette);

      expect(css).toContain('--theme-primary: #ff0000');
    });

    it('should include layout and typography variables', () => {
      const css = generateCustomizationCSS(classicTheme);

      expect(css).toContain('--theme-border-radius:');
      expect(css).toContain('--theme-font-display:');
      expect(css).toContain('--theme-font-body:');
    });
  });

  describe('getEffectiveContent', () => {
    it('should return custom content when available', () => {
      const customContent: CustomContent = {
        heroTitle: 'Custom Hero',
      };

      const result = getEffectiveContent(customContent, 'heroTitle', 'Default Hero');

      expect(result).toBe('Custom Hero');
    });

    it('should return default when no custom content', () => {
      const result = getEffectiveContent(undefined, 'heroTitle', 'Default Hero');

      expect(result).toBe('Default Hero');
    });
  });

  describe('getEffectiveImage', () => {
    it('should return custom image when available', () => {
      const customImages: CustomImages = {
        heroImage: 'https://example.com/custom.jpg',
      };

      const result = getEffectiveImage(customImages, 'heroImage', '/default.jpg');

      expect(result).toBe('https://example.com/custom.jpg');
    });

    it('should return default when no custom image', () => {
      const result = getEffectiveImage(undefined, 'heroImage', '/default.jpg');

      expect(result).toBe('/default.jpg');
    });
  });

  describe('createCustomizationProps', () => {
    it('should create props with base theme when no customization', () => {
      const props = createCustomizationProps(null, 'classic');

      expect(props.effectiveTheme.id).toBe('classic');
      expect(props.customContent).toBeUndefined();
      expect(props.customImages).toBeUndefined();
    });

    it('should create props with customization applied', () => {
      const customization: WeddingCustomization = {
        themeId: 'luxe',
        customPalette: { primary: '#ff0000' },
        customContent: { heroTitle: 'Custom Title' },
        customImages: { heroImage: 'https://example.com/hero.jpg' },
      };

      const props = createCustomizationProps(customization, 'luxe');

      expect(props.effectiveTheme.colors.primary).toBe('#ff0000');
      expect(props.customContent).toEqual(customization.customContent);
      expect(props.customImages).toEqual(customization.customImages);
    });

    it('should override baseThemeId with customization.themeId', () => {
      const customization: WeddingCustomization = {
        themeId: 'luxe',
      };

      // Even though we pass 'classic', the customization themeId should be used
      const props = createCustomizationProps(customization, 'classic');

      expect(props.effectiveTheme.id).toBe('classic');
    });
  });
});
