import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing
vi.mock('./supabase/client', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(false),
  supabase: {
    from: vi.fn(),
  },
}));

import {
  MOCK_WEDDINGS,
  MOCK_RSVPS,
  getWeddingBySlugAsync,
  getWeddingBySlug,
  getWeddingById,
  validatePinCode,
  validateMagicToken,
  getRSVPsByWeddingId,
  getRSVPStats,
  getDaysUntilWedding,
  formatWeddingDate,
} from './weddingData';
import { isSupabaseConfigured } from './supabase/client';

describe('weddingData.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWeddingBySlug', () => {
    it('returns wedding when slug exists', () => {
      const wedding = getWeddingBySlug('julie-thomas');
      expect(wedding).toBeDefined();
      expect(wedding!.slug).toBe('julie-thomas');
    });

    it('returns undefined when slug does not exist', () => {
      const wedding = getWeddingBySlug('nonexistent-slug');
      expect(wedding).toBeUndefined();
    });
  });

  describe('getWeddingById', () => {
    it('returns wedding when id exists', () => {
      const id = MOCK_WEDDINGS[0].id;
      const wedding = getWeddingById(id);
      expect(wedding).toBeDefined();
      expect(wedding!.id).toBe(id);
    });

    it('returns undefined when id does not exist', () => {
      const wedding = getWeddingById('nonexistent-id');
      expect(wedding).toBeUndefined();
    });
  });

  describe('getWeddingBySlugAsync', () => {
    it('falls back to mock data when Supabase is not configured', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      const wedding = await getWeddingBySlugAsync('julie-thomas');
      expect(wedding).toBeDefined();
      expect(wedding!.slug).toBe('julie-thomas');
    });

    it('returns undefined when slug not found in mock data', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      const wedding = await getWeddingBySlugAsync('nonexistent');
      expect(wedding).toBeUndefined();
    });
  });

  describe('validatePinCode', () => {
    it('returns true for correct pin code', () => {
      const wedding = MOCK_WEDDINGS[0];
      expect(validatePinCode(wedding.slug, wedding.pinCode)).toBe(true);
    });

    it('returns false for incorrect pin code', () => {
      const wedding = MOCK_WEDDINGS[0];
      expect(validatePinCode(wedding.slug, '9999')).toBe(false);
    });

    it('returns false for nonexistent wedding slug', () => {
      expect(validatePinCode('nonexistent', '1234')).toBe(false);
    });
  });

  describe('validateMagicToken', () => {
    it('returns true for correct magic token', () => {
      const wedding = MOCK_WEDDINGS[0];
      expect(validateMagicToken(wedding.slug, wedding.magicToken!)).toBe(true);
    });

    it('returns false for incorrect magic token', () => {
      const wedding = MOCK_WEDDINGS[0];
      expect(validateMagicToken(wedding.slug, 'wrong-token')).toBe(false);
    });

    it('returns false for nonexistent wedding', () => {
      expect(validateMagicToken('nonexistent', 'any-token')).toBe(false);
    });
  });

  describe('getRSVPsByWeddingId', () => {
    it('returns RSVPs for a specific wedding', () => {
      const weddingId = MOCK_RSVPS[0].weddingId;
      const rsvps = getRSVPsByWeddingId(weddingId);
      expect(rsvps.length).toBeGreaterThan(0);
      rsvps.forEach(rsvp => expect(rsvp.weddingId).toBe(weddingId));
    });

    it('returns empty array for wedding with no RSVPs', () => {
      const rsvps = getRSVPsByWeddingId('nonexistent-wedding');
      expect(rsvps).toEqual([]);
    });
  });

  describe('getRSVPStats', () => {
    it('returns correct stats for a wedding with RSVPs', () => {
      const weddingId = MOCK_RSVPS[0].weddingId;
      const stats = getRSVPStats(weddingId);

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('confirmed');
      expect(stats).toHaveProperty('declined');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('totalGuests');
      expect(stats).toHaveProperty('plusOnes');

      const rsvps = getRSVPsByWeddingId(weddingId);
      expect(stats.total).toBe(rsvps.length);
    });

    it('returns zeros for wedding with no RSVPs', () => {
      const stats = getRSVPStats('no-rsvps-wedding');
      expect(stats.total).toBe(0);
      expect(stats.confirmed).toBe(0);
      expect(stats.declined).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.totalGuests).toBe(0);
    });

    it('correctly counts plus ones in total guests', () => {
      // Use the wedding that has RSVPs to verify counting
      const weddingId = MOCK_RSVPS[0].weddingId;
      const stats = getRSVPStats(weddingId);

      const rsvps = getRSVPsByWeddingId(weddingId);
      const yesRsvps = rsvps.filter(r => r.attendance === 'yes');
      const expectedGuests = yesRsvps.reduce((sum, r) => sum + 1 + (r.plusOne ? 1 : 0), 0);
      expect(stats.totalGuests).toBe(expectedGuests);
    });
  });

  describe('getDaysUntilWedding', () => {
    it('returns positive number for future date', () => {
      const futureDate = '2099-01-01';
      const days = getDaysUntilWedding(futureDate);
      expect(days).toBeGreaterThan(0);
    });

    it('returns negative number for past date', () => {
      const pastDate = '2000-01-01';
      const days = getDaysUntilWedding(pastDate);
      expect(days).toBeLessThan(0);
    });

    it('returns approximately 0 for today', () => {
      const today = new Date().toISOString().split('T')[0];
      const days = getDaysUntilWedding(today);
      expect(Math.abs(days)).toBeLessThanOrEqual(1);
    });
  });

  describe('formatWeddingDate', () => {
    it('formats date in French locale by default', () => {
      const result = formatWeddingDate('2026-06-15');
      // French format should contain the year
      expect(result).toContain('2026');
    });

    it('formats date with custom locale', () => {
      const result = formatWeddingDate('2026-06-15', 'en-US');
      expect(result).toContain('2026');
    });
  });

  describe('MOCK_WEDDINGS', () => {
    it('has at least one wedding', () => {
      expect(MOCK_WEDDINGS.length).toBeGreaterThan(0);
    });

    it('each wedding has required fields', () => {
      MOCK_WEDDINGS.forEach(wedding => {
        expect(wedding.id).toBeDefined();
        expect(wedding.slug).toBeDefined();
        expect(wedding.name).toBeDefined();
      });
    });
  });

  describe('MOCK_RSVPS', () => {
    it('has RSVPs for existing weddings', () => {
      expect(MOCK_RSVPS.length).toBeGreaterThan(0);
    });
  });
});
