import { describe, it, expect } from 'vitest';
import {
  RESERVED_SLUGS,
  isValidSlugFormat,
  normalizeSlug,
  generateSlugSuggestions,
} from './slugValidation';

describe('slugValidation.ts', () => {
  describe('RESERVED_SLUGS', () => {
    it('contains system route slugs', () => {
      expect(RESERVED_SLUGS.has('admin')).toBe(true);
      expect(RESERVED_SLUGS.has('api')).toBe(true);
      expect(RESERVED_SLUGS.has('demo')).toBe(true);
    });

    it('contains language prefix slugs', () => {
      expect(RESERVED_SLUGS.has('fr')).toBe(true);
      expect(RESERVED_SLUGS.has('es')).toBe(true);
      expect(RESERVED_SLUGS.has('en')).toBe(true);
    });

    it('is a Set instance', () => {
      expect(RESERVED_SLUGS).toBeInstanceOf(Set);
    });
  });

  describe('isValidSlugFormat', () => {
    describe('valid slugs', () => {
      it('accepts simple lowercase slug', () => {
        expect(isValidSlugFormat('alice-bob')).toBe(true);
      });

      it('accepts slug with numbers', () => {
        expect(isValidSlugFormat('alice-bob-2026')).toBe(true);
      });

      it('accepts minimum length (3 chars)', () => {
        expect(isValidSlugFormat('abc')).toBe(true);
        expect(isValidSlugFormat('123')).toBe(true);
        expect(isValidSlugFormat('a1b')).toBe(true);
      });

      it('accepts maximum length (50 chars)', () => {
        const slug = 'a'.repeat(25) + '-' + 'b'.repeat(24);
        expect(slug.length).toBe(50);
        expect(isValidSlugFormat(slug)).toBe(true);
      });

      it('accepts slug with multiple hyphens', () => {
        expect(isValidSlugFormat('alice-and-bob-2026')).toBe(true);
      });
    });

    describe('invalid slugs', () => {
      it('rejects too short slugs (< 3 chars)', () => {
        expect(isValidSlugFormat('ab')).toBe(false);
        expect(isValidSlugFormat('a')).toBe(false);
        expect(isValidSlugFormat('')).toBe(false);
      });

      it('rejects too long slugs (> 50 chars)', () => {
        const slug = 'a'.repeat(51);
        expect(isValidSlugFormat(slug)).toBe(false);
      });

      it('rejects uppercase letters', () => {
        expect(isValidSlugFormat('Alice-Bob')).toBe(false);
        expect(isValidSlugFormat('ALICE')).toBe(false);
      });

      it('rejects slug starting with hyphen', () => {
        expect(isValidSlugFormat('-alice')).toBe(false);
      });

      it('rejects slug ending with hyphen', () => {
        expect(isValidSlugFormat('alice-')).toBe(false);
      });

      it('rejects special characters', () => {
        expect(isValidSlugFormat('alice_bob')).toBe(false);
        expect(isValidSlugFormat('alice.bob')).toBe(false);
        expect(isValidSlugFormat('alice bob')).toBe(false);
        expect(isValidSlugFormat('alice@bob')).toBe(false);
      });
    });
  });

  describe('normalizeSlug', () => {
    it('converts to lowercase', () => {
      expect(normalizeSlug('ALICE-BOB')).toBe('alice-bob');
      expect(normalizeSlug('Alice-Bob')).toBe('alice-bob');
    });

    it('trims whitespace', () => {
      expect(normalizeSlug('  alice-bob  ')).toBe('alice-bob');
    });

    it('handles already normalized slug', () => {
      expect(normalizeSlug('alice-bob')).toBe('alice-bob');
    });
  });

  describe('generateSlugSuggestions', () => {
    it('returns array of suggestions', () => {
      const suggestions = generateSlugSuggestions('alice-bob');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('includes year-based suggestion', () => {
      const suggestions = generateSlugSuggestions('alice-bob');
      const currentYear = new Date().getFullYear();
      expect(suggestions).toContain(`alice-bob-${currentYear}`);
    });

    it('includes number-based suggestions', () => {
      const suggestions = generateSlugSuggestions('alice-bob');
      expect(suggestions).toContain('alice-bob-2');
      expect(suggestions).toContain('alice-bob-3');
    });

    it('only includes valid slugs in suggestions', () => {
      const suggestions = generateSlugSuggestions('alice-bob');
      suggestions.forEach(slug => {
        expect(isValidSlugFormat(slug)).toBe(true);
      });
    });

    it('handles base slug near max length gracefully', () => {
      // A slug that when combined with -2026 would exceed max length
      const longSlug = 'a'.repeat(46); // 46 chars - adding -2026 makes 51 (too long)
      const suggestions = generateSlugSuggestions(longSlug);
      // Should still return some suggestions (number ones)
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });
});
