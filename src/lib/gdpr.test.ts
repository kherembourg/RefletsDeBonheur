import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DATA_RETENTION_DAYS,
  COOKIE_CONSENT_KEY,
  getDataExpirationDate,
  isDataExpired,
} from './gdpr';

describe('GDPR Utilities', () => {
  describe('Constants', () => {
    it('should have a default retention period of 365 days', () => {
      expect(DEFAULT_DATA_RETENTION_DAYS).toBe(365);
    });

    it('should have a cookie consent key', () => {
      expect(COOKIE_CONSENT_KEY).toBe('reflets_cookie_consent');
    });
  });

  describe('getDataExpirationDate', () => {
    it('should return a date 365 days after the wedding by default', () => {
      const weddingDate = '2025-06-15T00:00:00.000Z';
      const expiration = getDataExpirationDate(weddingDate);
      const expected = new Date('2025-06-15T00:00:00.000Z');
      expected.setDate(expected.getDate() + 365);
      expect(new Date(expiration).toISOString()).toBe(expected.toISOString());
    });

    it('should respect custom retention days', () => {
      const weddingDate = '2025-06-15T00:00:00.000Z';
      const expiration = getDataExpirationDate(weddingDate, 30);
      const expected = new Date('2025-06-15T00:00:00.000Z');
      expected.setDate(expected.getDate() + 30);
      expect(new Date(expiration).toISOString()).toBe(expected.toISOString());
    });

    it('should handle zero retention days', () => {
      const weddingDate = '2025-06-15T00:00:00.000Z';
      const expiration = getDataExpirationDate(weddingDate, 0);
      expect(new Date(expiration).toISOString()).toBe('2025-06-15T00:00:00.000Z');
    });
  });

  describe('isDataExpired', () => {
    it('should return true for a wedding far in the past', () => {
      expect(isDataExpired('2020-01-01')).toBe(true);
    });

    it('should return false for a wedding in the future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      expect(isDataExpired(futureDate.toISOString())).toBe(false);
    });

    it('should return false for a recent wedding within retention', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);
      expect(isDataExpired(recentDate.toISOString(), 365)).toBe(false);
    });

    it('should return true for a wedding just past retention', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);
      expect(isDataExpired(oldDate.toISOString(), 365)).toBe(true);
    });
  });
});
