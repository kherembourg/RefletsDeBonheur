/**
 * Integration Tests: Stripe Customer Portal Endpoint
 *
 * Tests the customer portal session creation endpoint including:
 * - Authorization and ownership verification
 * - Portal session creation with valid data
 * - Error handling for missing/invalid data
 * - Open redirect prevention
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './portal';

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
}));

describe('Stripe Customer Portal Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== SUCCESS CASES =====
  describe('Portal Session Creation', () => {
    it('should create portal session with valid customer ID and return URL', async () => {
      const mockPortalSession = {
        url: 'https://billing.stripe.com/session/test_portal_session_123',
        id: 'bps_test_123',
      };

      const mockStripe = {
        billingPortal: {
          sessions: {
            create: vi.fn().mockResolvedValue(mockPortalSession),
          },
        },
      };

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_test_123' },
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      gt: vi.fn().mockReturnValue({
                        single: mockAuthSingle,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockProfileSingle,
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe('https://billing.stripe.com/session/test_portal_session_123');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: 'http://localhost:4321/admin/subscription',
      });
    });
  });

  // ===== AUTHORIZATION TESTS =====
  describe('Authorization (IDOR Prevention)', () => {
    it('should reject request without authentication token', async () => {
      const mockClient = {
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No x-client-token header
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Missing authentication token');
    });

    it('should reject request when user tries to access another profile', async () => {
      // Mock auth session showing user owns 'profile-999'
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-999' }, // Different from requested profile
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      gt: vi.fn().mockReturnValue({
                        single: mockAuthSingle,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123', // Trying to access someone else's profile
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized access to profile');
    });

    it('should reject request with expired session token', async () => {
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Session expired' },
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      gt: vi.fn().mockReturnValue({
                        single: mockAuthSingle,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'expired-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid or expired session');
    });
  });

  // ===== VALIDATION TESTS =====
  describe('Input Validation', () => {
    it('should reject request without profileId', async () => {
      const mockClient = {
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          // Missing profileId
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should reject request without returnUrl', async () => {
      const mockClient = {
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          // Missing returnUrl
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should reject request with cross-origin returnUrl (open redirect prevention)', async () => {
      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      gt: vi.fn().mockReturnValue({
                        single: mockAuthSingle,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'https://evil.com/steal-session', // Cross-origin URL
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid return URL');
      expect(data.code).toBe('INVALID_URL');
    });
  });

  // ===== ERROR HANDLING =====
  describe('Error Handling', () => {
    it('should return 404 when profile is not found', async () => {
      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup returning null
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      gt: vi.fn().mockReturnValue({
                        single: mockAuthSingle,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockProfileSingle,
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Profile not found');
    });

    it('should return 400 when profile has no Stripe customer ID', async () => {
      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile with null stripe_customer_id
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: { stripe_customer_id: null },
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      gt: vi.fn().mockReturnValue({
                        single: mockAuthSingle,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockProfileSingle,
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No Stripe customer found for this profile');
    });

    it('should handle Stripe API errors gracefully', async () => {
      const mockStripe = {
        billingPortal: {
          sessions: {
            create: vi.fn().mockRejectedValue(new Error('Stripe API error: Invalid customer')),
          },
        },
      };

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_invalid' },
        error: null,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      gt: vi.fn().mockReturnValue({
                        single: mockAuthSingle,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: mockProfileSingle,
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create portal session');
      // Should not expose internal error details
      expect(data.error).not.toContain('Invalid customer');
    });
  });

  // ===== CONFIGURATION TESTS =====
  describe('Service Configuration', () => {
    it('should return 503 when Supabase is not configured', async () => {
      const { isSupabaseConfigured } = await import('../../../lib/supabase/client');
      (isSupabaseConfigured as any).mockReturnValue(false);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Database not configured');

      // Reset mock
      (isSupabaseConfigured as any).mockReturnValue(true);
    });

    it('should return 503 when Stripe is not configured', async () => {
      const { isStripeConfigured } = await import('../../../lib/stripe/server');
      (isStripeConfigured as any).mockReturnValue(false);

      const mockClient = {
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-token': 'valid-token-123',
        },
        body: JSON.stringify({
          profileId: 'profile-123',
          returnUrl: 'http://localhost:4321/admin/subscription',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Payment system not configured');

      // Reset mock
      (isStripeConfigured as any).mockReturnValue(true);
    });
  });
});
