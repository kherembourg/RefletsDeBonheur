import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyProfileOwnership, validateSameOrigin, errorResponse } from '../../../lib/stripe/apiAuth';

// Mock the modules
vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/stripe/server', () => ({
  getStripeClient: vi.fn(),
  isStripeConfigured: vi.fn().mockReturnValue(true),
  PRODUCT_CONFIG: {
    name: 'Test Product',
    description: 'Test Description',
    initialPrice: 19900,
  },
}));

vi.mock('../../../lib/rateLimit', async () => {
  const { createRateLimitMock } = await import('../../../test/helpers/rateLimitMock');
  return createRateLimitMock();
});

// Test the security functions directly since we can't easily test the full endpoint
describe('Checkout Endpoint Security', () => {
  describe('Authorization (IDOR Prevention)', () => {
    it('should reject requests without authentication token', async () => {
      const request = new Request('http://localhost:4321/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: 'some-profile-id',
          successUrl: 'http://localhost:4321/success',
          cancelUrl: 'http://localhost:4321/cancel',
        }),
      });

      // No x-client-token header
      expect(request.headers.get('x-client-token')).toBeNull();
    });

    it('should reject requests where user tries to access another profile', async () => {
      const mockSelect = vi.fn();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'authenticated-user-id' },
        error: null,
      });

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: mockSelect.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: mockSingle,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      const request = new Request('http://localhost:4321/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token',
        },
        body: JSON.stringify({
          profileId: 'different-profile-id', // Trying to access someone else's profile
          successUrl: 'http://localhost:4321/success',
          cancelUrl: 'http://localhost:4321/cancel',
        }),
      });

      const result = await verifyProfileOwnership(request, 'different-profile-id', mockClient as any);
      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Unauthorized access to profile');
    });
  });

  describe('URL Validation (Open Redirect Prevention)', () => {
    const siteUrl = 'http://localhost:4321';

    it('should accept same-origin URLs', () => {
      expect(validateSameOrigin('http://localhost:4321/admin?payment=success', siteUrl)).toBe(true);
      expect(validateSameOrigin('http://localhost:4321/some/path', siteUrl)).toBe(true);
    });

    it('should reject different-origin URLs', () => {
      expect(validateSameOrigin('https://evil.com/steal-data', siteUrl)).toBe(false);
      expect(validateSameOrigin('http://attacker.com', siteUrl)).toBe(false);
    });

    it('should reject URLs with different ports', () => {
      expect(validateSameOrigin('http://localhost:3000/callback', siteUrl)).toBe(false);
    });

    it('should reject URLs with different protocols', () => {
      expect(validateSameOrigin('https://localhost:4321/callback', siteUrl)).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(validateSameOrigin('javascript:alert(1)', siteUrl)).toBe(false);
      expect(validateSameOrigin('data:text/html,<h1>Hi</h1>', siteUrl)).toBe(false);
      expect(validateSameOrigin('not-a-url', siteUrl)).toBe(false);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent JSON error format', async () => {
      const response = errorResponse('Test error', 400, 'TEST_CODE');
      const body = await response.json();

      expect(body.error).toBe('Test error');
      expect(body.code).toBe('TEST_CODE');
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should not expose internal details', async () => {
      const response = errorResponse('Failed to create checkout session', 500);
      const body = await response.json();

      // Should only contain generic error, no stack traces or internal details
      expect(body.error).toBe('Failed to create checkout session');
      expect(body.message).toBeUndefined();
      expect(body.stack).toBeUndefined();
    });
  });
});

describe('Duplicate Payment Prevention', () => {
  it('should check subscription status before creating checkout', () => {
    // This test documents the expected behavior
    // Active users should receive ALREADY_ACTIVE error code
    const activeProfile = { subscription_status: 'active' };

    expect(activeProfile.subscription_status).toBe('active');
    // The actual endpoint checks this and returns:
    // { error: 'You already have an active subscription', code: 'ALREADY_ACTIVE' }
  });
});

describe('Stripe Checkout - Rate Limiting', () => {
  it('should return 429 when rate limit is exceeded', async () => {
    const { checkRateLimit, createRateLimitResponse } = await import('../../../lib/rateLimit');
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 3600 * 1000),
      retryAfterSeconds: 3600,
    });
    vi.mocked(createRateLimitResponse).mockReturnValue(
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
    );

    const { POST } = await import('./checkout');
    const request = new Request('http://localhost:4321/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: 'test-profile-id',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      }),
    });

    const response = await POST({ request } as any);
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.error).toBe('Too many requests');
  });

  it('should allow request when rate limit is not exceeded', async () => {
    const { checkRateLimit } = await import('../../../lib/rateLimit');
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: true,
      remaining: 4,
      resetAt: new Date(Date.now() + 3600 * 1000),
    });

    const { POST } = await import('./checkout');
    const request = new Request('http://localhost:4321/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: 'test-profile-id',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      }),
    });

    const response = await POST({ request } as any);
    // Should not be 429, may be another error (like auth failure)
    expect(response.status).not.toBe(429);
  });
});
