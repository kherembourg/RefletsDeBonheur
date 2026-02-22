/**
 * Integration tests for Stripe Checkout API endpoint
 * Tests the POST handler from checkout.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './checkout';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/stripe/server', () => ({
  getStripeClient: vi.fn(),
  isStripeConfigured: vi.fn().mockReturnValue(true),
  PRODUCT_CONFIG: {
    name: 'Reflets de Bonheur',
    description: 'Wedding platform',
    initialPrice: 19900,
  },
}));

vi.mock('../../../lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({
    allowed: true,
    remaining: 4,
    resetAt: new Date(Date.now() + 3600 * 1000),
  }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitResponse: vi.fn(),
  RATE_LIMITS: {
    stripeCheckout: { limit: 5, windowSeconds: 3600, prefix: 'stripe-checkout' },
  },
}));

vi.mock('../../../lib/stripe/apiAuth', () => ({
  verifyProfileOwnership: vi.fn(),
  validateSameOrigin: vi.fn(),
  errorResponse: vi.fn().mockImplementation((error: string, status = 400, code?: string) => {
    return new Response(
      JSON.stringify({ error, ...(code && { code }) }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }),
}));

import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { getStripeClient, isStripeConfigured } from '../../../lib/stripe/server';
import { verifyProfileOwnership, validateSameOrigin } from '../../../lib/stripe/apiAuth';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request('http://localhost:4321/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(isSupabaseServiceRoleConfigured).mockReturnValue(true);
    vi.mocked(isStripeConfigured).mockReturnValue(true);
  });

  describe('Configuration guards', () => {
    it('returns 503 when Supabase is not configured', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);

      const request = makeRequest({ profileId: 'p1', successUrl: 'http://localhost:4321/success', cancelUrl: 'http://localhost:4321/cancel' });
      const response = await POST({ request } as any);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe('Database not configured');
    });

    it('returns 503 when Supabase service role is not configured', async () => {
      vi.mocked(isSupabaseServiceRoleConfigured).mockReturnValue(false);

      const request = makeRequest({ profileId: 'p1', successUrl: 'http://localhost:4321/success', cancelUrl: 'http://localhost:4321/cancel' });
      const response = await POST({ request } as any);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe('Database not configured');
    });

    it('returns 503 when Stripe is not configured', async () => {
      vi.mocked(isStripeConfigured).mockReturnValue(false);

      const request = makeRequest({ profileId: 'p1', successUrl: 'http://localhost:4321/success', cancelUrl: 'http://localhost:4321/cancel' });
      const response = await POST({ request } as any);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error).toBe('Payment system not configured');
    });
  });

  describe('Request validation', () => {
    it('returns 400 when profileId is missing', async () => {
      vi.mocked(verifyProfileOwnership).mockResolvedValue({ authorized: true });
      vi.mocked(validateSameOrigin).mockReturnValue(true);
      vi.mocked(getSupabaseAdminClient).mockReturnValue({} as any);

      const request = makeRequest({ successUrl: 'http://localhost:4321/success', cancelUrl: 'http://localhost:4321/cancel' });
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
    });

    it('returns 400 when successUrl is missing', async () => {
      vi.mocked(getSupabaseAdminClient).mockReturnValue({} as any);

      const request = makeRequest({ profileId: 'p1', cancelUrl: 'http://localhost:4321/cancel' });
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
    });

    it('returns 400 when cancelUrl is missing', async () => {
      vi.mocked(getSupabaseAdminClient).mockReturnValue({} as any);

      const request = makeRequest({ profileId: 'p1', successUrl: 'http://localhost:4321/success' });
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
    });
  });

  describe('Authorization checks', () => {
    it('returns 403 when user is unauthorized', async () => {
      vi.mocked(getSupabaseAdminClient).mockReturnValue({} as any);
      vi.mocked(verifyProfileOwnership).mockResolvedValue({
        authorized: false,
        error: 'Unauthorized',
      });

      const request = makeRequest({
        profileId: 'p1',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(403);
    });

    it('returns 400 for invalid redirect URLs (open redirect prevention)', async () => {
      vi.mocked(getSupabaseAdminClient).mockReturnValue({} as any);
      vi.mocked(verifyProfileOwnership).mockResolvedValue({ authorized: true });
      vi.mocked(validateSameOrigin).mockReturnValue(false);

      const request = makeRequest({
        profileId: 'p1',
        successUrl: 'https://evil.com/steal',
        cancelUrl: 'http://localhost:4321/cancel',
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('INVALID_URL');
    });
  });

  describe('Profile and subscription checks', () => {
    beforeEach(() => {
      vi.mocked(verifyProfileOwnership).mockResolvedValue({ authorized: true });
      vi.mocked(validateSameOrigin).mockReturnValue(true);
    });

    it('returns 404 when profile is not found', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

      const request = makeRequest({
        profileId: 'nonexistent',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(404);
    });

    it('returns 400 when user already has an active subscription', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'p1',
                  email: 'user@example.com',
                  full_name: 'Test User',
                  stripe_customer_id: 'cus_existing',
                  subscription_status: 'active',
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

      const request = makeRequest({
        profileId: 'p1',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('ALREADY_ACTIVE');
    });
  });

  describe('Successful checkout creation', () => {
    beforeEach(() => {
      vi.mocked(verifyProfileOwnership).mockResolvedValue({ authorized: true });
      vi.mocked(validateSameOrigin).mockReturnValue(true);
    });

    it('creates checkout session for user with existing Stripe customer', async () => {
      const mockStripe = {
        customers: { create: vi.fn() },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/pay/cs_test_123',
            }),
          },
        },
      };
      vi.mocked(getStripeClient).mockReturnValue(mockStripe as any);

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'p1',
                  email: 'user@example.com',
                  full_name: 'Test User',
                  stripe_customer_id: 'cus_existing',
                  subscription_status: 'trial',
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

      const request = makeRequest({
        profileId: 'p1',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.sessionId).toBe('cs_test_123');
      expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    });

    it('creates a new Stripe customer when one does not exist', async () => {
      const mockCustomer = { id: 'cus_new_123' };
      const mockSession = {
        id: 'cs_new_session',
        url: 'https://checkout.stripe.com/pay/cs_new_session',
      };

      const mockStripe = {
        customers: {
          create: vi.fn().mockResolvedValue(mockCustomer),
        },
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue(mockSession),
          },
        },
      };
      vi.mocked(getStripeClient).mockReturnValue(mockStripe as any);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'p1',
                      email: 'newuser@example.com',
                      full_name: 'New User',
                      stripe_customer_id: null, // No customer yet
                      subscription_status: null,
                    },
                    error: null,
                  }),
                }),
              }),
              update: mockUpdate,
            };
          }
          return {};
        }),
      };
      vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

      const request = makeRequest({
        profileId: 'p1',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      // Verify a new customer was created
      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newuser@example.com' })
      );
      const body = await response.json();
      expect(body.sessionId).toBe('cs_new_session');
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      vi.mocked(verifyProfileOwnership).mockResolvedValue({ authorized: true });
      vi.mocked(validateSameOrigin).mockReturnValue(true);
    });

    it('returns 500 when Stripe throws an error', async () => {
      const mockStripe = {
        customers: { create: vi.fn() },
        checkout: {
          sessions: {
            create: vi.fn().mockRejectedValue(new Error('Stripe error')),
          },
        },
      };
      vi.mocked(getStripeClient).mockReturnValue(mockStripe as any);

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'p1',
                  email: 'user@example.com',
                  full_name: 'Test User',
                  stripe_customer_id: 'cus_existing',
                  subscription_status: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

      const request = makeRequest({
        profileId: 'p1',
        successUrl: 'http://localhost:4321/success',
        cancelUrl: 'http://localhost:4321/cancel',
      });
      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
    });
  });
});
