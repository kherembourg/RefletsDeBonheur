import { describe, it, expect } from 'vitest';
import {
  generatePlaceholderSVG,
  generatePlaceholderGradient,
  getPlaceholder,
  optimizeUnsplashUrl,
  DEMO_PLACEHOLDERS,
} from './imagePlaceholders';

describe('imagePlaceholders.ts', () => {
  describe('generatePlaceholderSVG', () => {
    it('returns a data URL', () => {
      const result = generatePlaceholderSVG();
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('uses default dimensions when none provided', () => {
      const result = generatePlaceholderSVG();
      expect(result).toBeTruthy();
    });

    it('uses provided dimensions', () => {
      const result = generatePlaceholderSVG(800, 600);
      const decoded = atob(result.replace('data:image/svg+xml;base64,', ''));
      expect(decoded).toContain('800');
      expect(decoded).toContain('600');
    });

    it('cycles through color palette using modulo', () => {
      const result0 = generatePlaceholderSVG(400, 300, 0);
      const result5 = generatePlaceholderSVG(400, 300, 5); // Same as 0 (5 colors)
      expect(result0).toBe(result5);
    });

    it('generates different SVGs for different color indices', () => {
      const result0 = generatePlaceholderSVG(400, 300, 0);
      const result1 = generatePlaceholderSVG(400, 300, 1);
      expect(result0).not.toBe(result1);
    });
  });

  describe('generatePlaceholderGradient', () => {
    it('returns a CSS gradient string', () => {
      const result = generatePlaceholderGradient();
      expect(result).toMatch(/^linear-gradient\(135deg,/);
    });

    it('generates different gradients for different color indices', () => {
      const gradient0 = generatePlaceholderGradient(0);
      const gradient1 = generatePlaceholderGradient(1);
      expect(gradient0).not.toBe(gradient1);
    });

    it('cycles through color palette', () => {
      const gradient0 = generatePlaceholderGradient(0);
      const gradient5 = generatePlaceholderGradient(5); // Same as 0
      expect(gradient0).toBe(gradient5);
    });
  });

  describe('getPlaceholder', () => {
    it('returns demo placeholder for known media IDs', () => {
      const result = getPlaceholder('1');
      expect(result).toBe(DEMO_PLACEHOLDERS['1']);
    });

    it('generates placeholder for unknown media IDs', () => {
      const result = getPlaceholder('unknown-id');
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('handles numeric-looking IDs', () => {
      const result = getPlaceholder('42');
      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('all 10 demo placeholders are populated', () => {
      for (let i = 1; i <= 10; i++) {
        expect(DEMO_PLACEHOLDERS[i.toString()]).toBeTruthy();
      }
    });
  });

  describe('optimizeUnsplashUrl', () => {
    it('returns non-Unsplash URLs unchanged', () => {
      const url = 'https://example.com/image.jpg';
      expect(optimizeUnsplashUrl(url)).toBe(url);
    });

    it('adds optimization parameters to Unsplash URLs', () => {
      const url = 'https://images.unsplash.com/photo-12345';
      const result = optimizeUnsplashUrl(url);

      expect(result).toContain('unsplash.com');
      expect(result).toContain('w=400');
      expect(result).toContain('q=75');
      expect(result).toContain('auto=format');
      expect(result).toContain('fit=crop');
    });

    it('uses custom width', () => {
      const url = 'https://images.unsplash.com/photo-12345';
      const result = optimizeUnsplashUrl(url, { width: 1200 });
      expect(result).toContain('w=1200');
    });

    it('uses custom quality', () => {
      const url = 'https://images.unsplash.com/photo-12345';
      const result = optimizeUnsplashUrl(url, { quality: 90 });
      expect(result).toContain('q=90');
    });

    it('adds format parameter when specified', () => {
      const url = 'https://images.unsplash.com/photo-12345';
      const result = optimizeUnsplashUrl(url, { format: 'webp' });
      expect(result).toContain('fm=webp');
    });

    it('does not add format parameter when auto', () => {
      const url = 'https://images.unsplash.com/photo-12345';
      const result = optimizeUnsplashUrl(url, { format: 'auto' });
      expect(result).not.toContain('fm=');
    });

    it('strips existing query params from URL', () => {
      const url = 'https://images.unsplash.com/photo-12345?old=param&another=value';
      const result = optimizeUnsplashUrl(url);
      // Should not contain old params
      expect(result).not.toContain('old=param');
    });
  });
});
