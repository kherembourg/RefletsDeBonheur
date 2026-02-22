import { vi } from 'vitest';

/**
 * Default rate limit mock factory for tests.
 * Call vi.mock() with the result of this function to mock the rateLimit module.
 *
 * Usage:
 *   import { createRateLimitMock } from '../../test/helpers/rateLimitMock';
 *   vi.mock('../../lib/rateLimit', () => createRateLimitMock());
 */
export function createRateLimitMock() {
  return {
    checkRateLimit: vi.fn().mockReturnValue({
      allowed: true,
      remaining: 9,
      resetAt: new Date(Date.now() + 3600 * 1000),
    }),
    getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
    createRateLimitResponse: vi.fn().mockReturnValue(
      new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 3600,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '3600',
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    ),
    checkWeddingRateLimit: vi.fn().mockReturnValue({
      allowed: true,
      remaining: 49,
      resetAt: new Date(Date.now() + 60 * 1000),
    }),
    RATE_LIMITS: {
      signup: { limit: 5, windowSeconds: 3600, prefix: 'signup' },
      slugCheck: { limit: 30, windowSeconds: 60, prefix: 'slug-check' },
      general: { limit: 100, windowSeconds: 60, prefix: 'general' },
      upload: { limit: 20, windowSeconds: 60, prefix: 'upload' },
      uploadPerWedding: { limit: 50, windowSeconds: 60, prefix: 'upload-wedding' },
      verifyPayment: { limit: 10, windowSeconds: 3600, prefix: 'verify-payment' },
      stripeCheckout: { limit: 5, windowSeconds: 3600, prefix: 'stripe-checkout' },
      createAccount: { limit: 5, windowSeconds: 3600, prefix: 'create-account' },
    },
  };
}
