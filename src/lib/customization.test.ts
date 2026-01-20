import { describe, it, expect } from 'vitest';
import {
  type CustomPalette,
  type CustomContent,
  type CustomImages,
  type WeddingCustomization,
  DEFAULT_CUSTOMIZATION,
  mergeCustomPalette,
  generateCustomPaletteCSS,
  getContentValue,
  getImageValue,
  isValidHexColor,
  validateCustomPalette,
  isValidImageUrl,
} from './customization';
import { classicTheme } from './themes';

describe('Customization', () => {
  describe('mergeCustomPalette', () => {
    it('should return theme colors when no custom palette', () => {
      const result = mergeCustomPalette(classicTheme.colors);
      expect(result).toEqual(classicTheme.colors);
    });

    it('should merge custom palette with theme colors', () => {
      const customPalette: CustomPalette = {
        primary: '#ff0000',
        accent: '#00ff00',
      };

      const result = mergeCustomPalette(classicTheme.colors, customPalette);

      expect(result.primary).toBe('#ff0000');
      expect(result.accent).toBe('#00ff00');
      expect(result.background).toBe(classicTheme.colors.background);
    });

    it('should filter out undefined values', () => {
      const customPalette: CustomPalette = {
        primary: '#ff0000',
        accent: undefined,
      };

      const result = mergeCustomPalette(classicTheme.colors, customPalette);

      expect(result.primary).toBe('#ff0000');
      expect(result.accent).toBe(classicTheme.colors.accent);
    });
  });

  describe('generateCustomPaletteCSS', () => {
    it('should generate CSS variables for theme colors', () => {
      const css = generateCustomPaletteCSS(classicTheme.colors);

      expect(css).toContain('--theme-primary:');
      expect(css).toContain('--theme-accent:');
      expect(css).toContain(classicTheme.colors.primary);
    });

    it('should generate CSS with custom palette merged', () => {
      const customPalette: CustomPalette = {
        primary: '#ff0000',
      };

      const css = generateCustomPaletteCSS(classicTheme.colors, customPalette);

      expect(css).toContain('--theme-primary: #ff0000');
    });
  });

  describe('getContentValue', () => {
    it('should return custom value when available', () => {
      const customContent: CustomContent = {
        heroTitle: 'Custom Title',
      };

      const result = getContentValue(customContent, 'heroTitle', 'Default Title');

      expect(result).toBe('Custom Title');
    });

    it('should return default value when custom not available', () => {
      const customContent: CustomContent = {};

      const result = getContentValue(customContent, 'heroTitle', 'Default Title');

      expect(result).toBe('Default Title');
    });

    it('should return default value when customContent is undefined', () => {
      const result = getContentValue(undefined, 'heroTitle', 'Default Title');

      expect(result).toBe('Default Title');
    });
  });

  describe('getImageValue', () => {
    it('should return custom image URL when available', () => {
      const customImages: CustomImages = {
        heroImage: 'https://example.com/hero.jpg',
      };

      const result = getImageValue(customImages, 'heroImage', '/default.jpg');

      expect(result).toBe('https://example.com/hero.jpg');
    });

    it('should return default URL when custom not available', () => {
      const customImages: CustomImages = {};

      const result = getImageValue(customImages, 'heroImage', '/default.jpg');

      expect(result).toBe('/default.jpg');
    });

    it('should return default URL when customImages is undefined', () => {
      const result = getImageValue(undefined, 'heroImage', '/default.jpg');

      expect(result).toBe('/default.jpg');
    });
  });

  describe('isValidHexColor', () => {
    it('should validate 6-digit hex colors', () => {
      expect(isValidHexColor('#ff0000')).toBe(true);
      expect(isValidHexColor('#FF0000')).toBe(true);
      expect(isValidHexColor('#abc123')).toBe(true);
    });

    it('should validate 3-digit hex colors', () => {
      expect(isValidHexColor('#f00')).toBe(true);
      expect(isValidHexColor('#ABC')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('ff0000')).toBe(false);
      expect(isValidHexColor('#ff00')).toBe(false);
      expect(isValidHexColor('#gg0000')).toBe(false);
      expect(isValidHexColor('red')).toBe(false);
    });
  });

  describe('validateCustomPalette', () => {
    it('should return no errors for valid palette', () => {
      const palette: CustomPalette = {
        primary: '#ff0000',
        accent: '#00ff00',
      };

      const errors = validateCustomPalette(palette);

      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid colors', () => {
      const palette: CustomPalette = {
        primary: 'invalid',
        accent: '#00ff00',
      };

      const errors = validateCustomPalette(palette);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('primary');
    });

    it('should accept rgba colors', () => {
      const palette: CustomPalette = {
        primary: 'rgba(255, 0, 0, 0.5)',
      };

      const errors = validateCustomPalette(palette);

      expect(errors).toHaveLength(0);
    });
  });

  describe('isValidImageUrl', () => {
    it('should validate valid image URLs', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.gif')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.webp')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.svg')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidImageUrl('not-a-url')).toBe(false);
      expect(isValidImageUrl('https://example.com/file.pdf')).toBe(false);
    });

    it('should be case insensitive for extensions', () => {
      expect(isValidImageUrl('https://example.com/image.JPG')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.PNG')).toBe(true);
    });
  });

  describe('DEFAULT_CUSTOMIZATION', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CUSTOMIZATION.themeId).toBe('classic');
      expect(DEFAULT_CUSTOMIZATION.customPalette).toBeUndefined();
      expect(DEFAULT_CUSTOMIZATION.customContent).toBeUndefined();
      expect(DEFAULT_CUSTOMIZATION.customImages).toBeUndefined();
    });
  });
});
