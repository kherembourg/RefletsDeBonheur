/**
 * Rate Limit Tests
 * 
 * Comprehensive tests for the in-memory rate limiting implementation
 * with sliding window algorithm.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkRateLimit,
  getClientIP,
  createRateLimitResponse,
  checkWeddingRateLimit,
  RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rateLimit';

describe('rateLimit', () => {
  let originalDateNow: () => number;

  beforeEach(() => {
    originalDateNow = Date.now;
    // Mock Date.now() to control time
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Date.now = originalDateNow;
  });

  describe('Basic Rate Limiting', () => {
    it('should allow first request within limit', () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        prefix: 'test',
      };

      const result = checkRateLimit('user1', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('should allow subsequent requests within limit', () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        prefix: 'test',
      };

      // Make 3 requests
      checkRateLimit('user2', config);
      checkRateLimit('user2', config);
      const result = checkRateLimit('user2', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should allow request at limit boundary', () => {
      const config: RateLimitConfig = {
        limit: 3,
        windowSeconds: 60,
        prefix: 'test',
      };

      // Make exactly 3 requests (at the limit)
      checkRateLimit('user3', config);
      checkRateLimit('user3', config);
      const result = checkRateLimit('user3', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should reject request exceeding limit', () => {
      const config: RateLimitConfig = {
        limit: 3,
        windowSeconds: 60,
        prefix: 'test',
      };

      // Make 3 allowed requests
      checkRateLimit('user4', config);
      checkRateLimit('user4', config);
      checkRateLimit('user4', config);

      // 4th request should be rejected
      const result = checkRateLimit('user4', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBeDefined();
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should decrement remaining count correctly', () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        prefix: 'test',
      };

      const result1 = checkRateLimit('user5', config);
      expect(result1.remaining).toBe(4);

      const result2 = checkRateLimit('user5', config);
      expect(result2.remaining).toBe(3);

      const result3 = checkRateLimit('user5', config);
      expect(result3.remaining).toBe(2);
    });

    it('should set resetAt timestamp correctly', () => {
      const now = Date.now();
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        prefix: 'test',
      };

      const result = checkRateLimit('user6', config);

      expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(now);
      expect(result.resetAt.getTime()).toBeLessThanOrEqual(now + 60 * 1000 + 100);
    });
  });

  describe('Window Expiration', () => {
    it('should create new record with count reset after window expires', () => {
      const config: RateLimitConfig = {
        limit: 3,
        windowSeconds: 60,
        prefix: 'test',
      };

      // Make 3 requests (hit limit)
      checkRateLimit('user7', config);
      checkRateLimit('user7', config);
      checkRateLimit('user7', config);

      // Should be rejected
      const result1 = checkRateLimit('user7', config);
      expect(result1.allowed).toBe(false);

      // Advance time by 61 seconds (past window)
      vi.advanceTimersByTime(61 * 1000);

      // Should be allowed again with fresh count
      const result2 = checkRateLimit('user7', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);
    });

    it('should allow requests after window expiration', () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 30,
        prefix: 'test',
      };

      checkRateLimit('user8', config);
      checkRateLimit('user8', config);

      // Should be rejected
      const result1 = checkRateLimit('user8', config);
      expect(result1.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(31 * 1000);

      // Should be allowed
      const result2 = checkRateLimit('user8', config);
      expect(result2.allowed).toBe(true);
    });

    it('should clean up expired records from store', () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 10,
        prefix: 'cleanup-test',
      };

      // Make requests for multiple users
      checkRateLimit('cleanup-user1', config);
      checkRateLimit('cleanup-user2', config);
      checkRateLimit('cleanup-user3', config);

      // Advance time to expire all records
      vi.advanceTimersByTime(11 * 1000);

      // New requests should start with fresh counts
      const result1 = checkRateLimit('cleanup-user1', config);
      const result2 = checkRateLimit('cleanup-user2', config);
      const result3 = checkRateLimit('cleanup-user3', config);

      expect(result1.remaining).toBe(4);
      expect(result2.remaining).toBe(4);
      expect(result3.remaining).toBe(4);
    });

    it('should track multiple identifiers with separate windows', () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 60,
        prefix: 'test',
      };

      // User A makes 2 requests
      checkRateLimit('userA', config);
      const resultA = checkRateLimit('userA', config);
      expect(resultA.remaining).toBe(0);

      // User B should have independent limit
      const resultB = checkRateLimit('userB', config);
      expect(resultB.remaining).toBe(1);
    });
  });

  describe('Rate Limit Response', () => {
    it('should include retryAfterSeconds when limit exceeded', () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 60,
        prefix: 'test',
      };

      checkRateLimit('user9', config);
      checkRateLimit('user9', config);
      const result = checkRateLimit('user9', config);

      expect(result.allowed).toBe(false);
      expect(result.retryAfterSeconds).toBeDefined();
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('should set remaining to 0 when limit exceeded', () => {
      const config: RateLimitConfig = {
        limit: 1,
        windowSeconds: 60,
        prefix: 'test',
      };

      checkRateLimit('user10', config);
      const result = checkRateLimit('user10', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return resetAt as Date object', () => {
      const config: RateLimitConfig = {
        limit: 1,
        windowSeconds: 60,
        prefix: 'test',
      };

      const result = checkRateLimit('user11', config);

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Identifier & Prefix', () => {
    it('should track different identifiers separately', () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 60,
        prefix: 'test',
      };

      // User 1 hits limit
      checkRateLimit('identifier1', config);
      checkRateLimit('identifier1', config);
      const result1 = checkRateLimit('identifier1', config);
      expect(result1.allowed).toBe(false);

      // User 2 should be allowed
      const result2 = checkRateLimit('identifier2', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    it('should track same identifier across different prefixes separately', () => {
      const config1: RateLimitConfig = {
        limit: 1,
        windowSeconds: 60,
        prefix: 'endpoint1',
      };

      const config2: RateLimitConfig = {
        limit: 1,
        windowSeconds: 60,
        prefix: 'endpoint2',
      };

      // Hit limit for endpoint1
      checkRateLimit('user-shared', config1);
      const result1 = checkRateLimit('user-shared', config1);
      expect(result1.allowed).toBe(false);

      // Should still be allowed for endpoint2
      const result2 = checkRateLimit('user-shared', config2);
      expect(result2.allowed).toBe(true);
    });

    it('should default prefix to "default" when not provided', () => {
      const config1: RateLimitConfig = {
        limit: 2,
        windowSeconds: 60,
      };

      const config2: RateLimitConfig = {
        limit: 2,
        windowSeconds: 60,
        prefix: 'default',
      };

      // Both should share the same rate limit
      checkRateLimit('user-default', config1);
      const result = checkRateLimit('user-default', config2);

      // Should be the second request (remaining = 0)
      expect(result.remaining).toBe(0);
    });

    it('should format key as "{prefix}:{identifier}"', () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        prefix: 'api',
      };

      // This is implicit - we test by ensuring prefix separation works
      const result1 = checkRateLimit('192.168.1.1', config);
      expect(result1.allowed).toBe(true);

      // Different prefix should not interfere
      const config2: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        prefix: 'upload',
      };
      const result2 = checkRateLimit('192.168.1.1', config2);
      expect(result2.remaining).toBe(4); // Fresh count
    });
  });

  describe('Client IP Extraction', () => {
    it('should extract IP from x-forwarded-for (first IP in chain)', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
        },
      });

      const ip = getClientIP(request);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-real-ip': '203.0.113.2',
        },
      });

      const ip = getClientIP(request);
      expect(ip).toBe('203.0.113.2');
    });

    it('should extract IP from cf-connecting-ip', () => {
      const request = new Request('https://example.com', {
        headers: {
          'cf-connecting-ip': '203.0.113.3',
        },
      });

      const ip = getClientIP(request);
      expect(ip).toBe('203.0.113.3');
    });

    it('should fall back to 127.0.0.1 when no headers present', () => {
      const request = new Request('https://example.com');

      const ip = getClientIP(request);
      expect(ip).toBe('127.0.0.1');
    });

    it('should trim whitespace from IPs', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '  203.0.113.4  , 198.51.100.1',
        },
      });

      const ip = getClientIP(request);
      expect(ip).toBe('203.0.113.4');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '203.0.113.5',
          'x-real-ip': '198.51.100.1',
          'cf-connecting-ip': '192.0.2.1',
        },
      });

      const ip = getClientIP(request);
      expect(ip).toBe('203.0.113.5');
    });
  });

  describe('createRateLimitResponse', () => {
    it('should return 429 status code', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date('2026-02-04T12:00:00Z'),
        retryAfterSeconds: 30,
      };

      const response = createRateLimitResponse(result);
      expect(response.status).toBe(429);
    });

    it('should include proper headers', async () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date('2026-02-04T12:00:00Z'),
        retryAfterSeconds: 45,
      };

      const response = createRateLimitResponse(result);

      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Retry-After')).toBe('45');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('2026-02-04T12:00:00.000Z');
    });

    it('should include error message in body', async () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date('2026-02-04T12:00:00Z'),
        retryAfterSeconds: 30,
      };

      const response = createRateLimitResponse(result);
      const body = await response.json();

      expect(body).toEqual({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 30,
      });
    });

    it('should default Retry-After to 60 when retryAfterSeconds is undefined', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date('2026-02-04T12:00:00Z'),
      };

      const response = createRateLimitResponse(result);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('checkWeddingRateLimit', () => {
    it('should apply rate limit per wedding ID', () => {
      const config: RateLimitConfig = {
        limit: 3,
        windowSeconds: 60,
        prefix: 'test-wedding',
      };

      checkWeddingRateLimit('wedding-123', config);
      checkWeddingRateLimit('wedding-123', config);
      const result = checkWeddingRateLimit('wedding-123', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should track different weddings separately', () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowSeconds: 60,
        prefix: 'test-wedding',
      };

      // Wedding 1 hits limit
      checkWeddingRateLimit('wedding-1', config);
      checkWeddingRateLimit('wedding-1', config);
      const result1 = checkWeddingRateLimit('wedding-1', config);
      expect(result1.allowed).toBe(false);

      // Wedding 2 should have independent limit
      const result2 = checkWeddingRateLimit('wedding-2', config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });
  });

  describe('RATE_LIMITS Predefined Configs', () => {
    it('should have signup config with correct values', () => {
      expect(RATE_LIMITS.signup).toEqual({
        limit: 5,
        windowSeconds: 3600,
        prefix: 'signup',
      });
    });

    it('should have slugCheck config with correct values', () => {
      expect(RATE_LIMITS.slugCheck).toEqual({
        limit: 30,
        windowSeconds: 60,
        prefix: 'slug-check',
      });
    });

    it('should have general config with correct values', () => {
      expect(RATE_LIMITS.general).toEqual({
        limit: 100,
        windowSeconds: 60,
        prefix: 'general',
      });
    });

    it('should have upload config with correct values', () => {
      expect(RATE_LIMITS.upload).toEqual({
        limit: 20,
        windowSeconds: 60,
        prefix: 'upload',
      });
    });

    it('should have uploadPerWedding config with correct values', () => {
      expect(RATE_LIMITS.uploadPerWedding).toEqual({
        limit: 50,
        windowSeconds: 60,
        prefix: 'upload-wedding',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero limit correctly', () => {
      const config: RateLimitConfig = {
        limit: 0,
        windowSeconds: 60,
        prefix: 'test',
      };

      const result = checkRateLimit('zero-limit', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle very large window correctly', () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 86400, // 24 hours
        prefix: 'test',
      };

      const result = checkRateLimit('large-window', config);
      expect(result.allowed).toBe(true);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now() + 86000 * 1000);
    });

    it('should handle rapid sequential requests correctly', () => {
      const config: RateLimitConfig = {
        limit: 10,
        windowSeconds: 60,
        prefix: 'test',
      };

      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit('rapid-user', config);
        expect(result.allowed).toBe(true);
      }

      // 11th should be rejected
      const result = checkRateLimit('rapid-user', config);
      expect(result.allowed).toBe(false);
    });

    it('should handle special characters in identifier', () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowSeconds: 60,
        prefix: 'test',
      };

      const result = checkRateLimit('user@example.com:8080', config);
      expect(result.allowed).toBe(true);
    });
  });
});
