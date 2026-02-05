/**
 * Integration Tests: Stripe Subscription Status Endpoint
 *
 * Tests the subscription information retrieval endpoint including:
 * - Subscription data retrieval with various statuses
 * - Authorization and ownership verification
 * - Status mapping (trial, active, expired, cancelled)
 * - Days remaining calculations
 * - Error handling for missing/invalid data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './subscription';
import type { SubscriptionInfo } from '../../../lib/stripe/types';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

describe('Stripe Subscription Status Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== SUCCESS CASES =====
  describe('Subscription Data Retrieval', () => {
    it('should return active subscription data with correct calculations', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: {
          subscription_status: 'active',
          subscription_end_date: futureDate.toISOString(),
          stripe_customer_id: 'cus_test_123',
        },
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data: SubscriptionInfo = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('active');
      expect(data.currentPeriodEnd).toBe(futureDate.toISOString());
      expect(data.trialEndsAt).toBeNull();
      expect(data.daysRemaining).toBe(30);
      expect(data.isTrialExpired).toBe(false);
      expect(data.canUploadToCloud).toBe(true);
      expect(data.stripeCustomerId).toBe('cus_test_123');
    });

    it('should return trial subscription data with trial end date', async () => {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial remaining

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: {
          subscription_status: 'trial',
          subscription_end_date: trialEndDate.toISOString(),
          stripe_customer_id: null,
        },
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data: SubscriptionInfo = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('trial');
      expect(data.trialEndsAt).toBe(trialEndDate.toISOString());
      expect(data.currentPeriodEnd).toBeNull();
      expect(data.daysRemaining).toBe(14);
      expect(data.isTrialExpired).toBe(false);
      expect(data.canUploadToCloud).toBe(false);
      expect(data.stripeCustomerId).toBeNull();
    });

    it('should return expired status when trial has ended', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: {
          subscription_status: 'trial',
          subscription_end_date: pastDate.toISOString(),
          stripe_customer_id: null,
        },
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data: SubscriptionInfo = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('expired'); // Should be mapped from 'trial' to 'expired'
      expect(data.isTrialExpired).toBe(true);
      expect(data.daysRemaining).toBe(0);
      expect(data.canUploadToCloud).toBe(false);
    });

    it('should return cancelled subscription status', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 20);

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: {
          subscription_status: 'cancelled',
          subscription_end_date: futureDate.toISOString(),
          stripe_customer_id: 'cus_test_123',
        },
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data: SubscriptionInfo = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('cancelled');
      expect(data.daysRemaining).toBe(20);
      expect(data.canUploadToCloud).toBe(false);
    });

    it('should handle null subscription_end_date', async () => {
      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: {
          subscription_status: 'trial',
          subscription_end_date: null,
          stripe_customer_id: null,
        },
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data: SubscriptionInfo = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('trial');
      expect(data.daysRemaining).toBe(0);
      expect(data.isTrialExpired).toBe(false);
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          // No x-client-token header
        },
      });

      const response = await GET({ request, url } as any);
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'expired-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid or expired session');
    });
  });

  // ===== VALIDATION TESTS =====
  describe('Input Validation', () => {
    it('should reject request without profileId parameter', async () => {
      const mockClient = {
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const url = new URL('http://localhost:4321/api/stripe/subscription');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing profileId parameter');
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Profile not found');
    });

    it('should handle database errors gracefully', async () => {
      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup with database error
      const mockProfileSingle = vi.fn().mockRejectedValue(new Error('Database connection error'));

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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      // Should not expose internal error details
      expect(data.error).not.toContain('Database connection');
    });
  });

  // ===== CONFIGURATION TESTS =====
  describe('Service Configuration', () => {
    it('should return 503 when Supabase is not configured', async () => {
      const { isSupabaseConfigured } = await import('../../../lib/supabase/client');
      (isSupabaseConfigured as any).mockReturnValue(false);

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Database not configured');

      // Reset mock
      (isSupabaseConfigured as any).mockReturnValue(true);
    });

    it('should return 503 when Supabase service role is not configured', async () => {
      const { isSupabaseServiceRoleConfigured } = await import('../../../lib/supabase/server');
      (isSupabaseServiceRoleConfigured as any).mockReturnValue(false);

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Database not configured');

      // Reset mock
      (isSupabaseServiceRoleConfigured as any).mockReturnValue(true);
    });
  });

  // ===== DAYS REMAINING CALCULATION =====
  describe('Days Remaining Calculation', () => {
    it('should calculate days remaining correctly for dates in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45); // 45 days from now

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: {
          subscription_status: 'active',
          subscription_end_date: futureDate.toISOString(),
          stripe_customer_id: 'cus_test_123',
        },
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data: SubscriptionInfo = await response.json();

      expect(response.status).toBe(200);
      expect(data.daysRemaining).toBe(45);
    });

    it('should return 0 days remaining for past dates', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      // Mock auth session lookup
      const mockAuthSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'profile-123' },
        error: null,
      });

      // Mock profile lookup
      const mockProfileSingle = vi.fn().mockResolvedValue({
        data: {
          subscription_status: 'trial',
          subscription_end_date: pastDate.toISOString(),
          stripe_customer_id: null,
        },
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

      const url = new URL('http://localhost:4321/api/stripe/subscription?profileId=profile-123');
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'x-client-token': 'valid-token-123',
        },
      });

      const response = await GET({ request, url } as any);
      const data: SubscriptionInfo = await response.json();

      expect(response.status).toBe(200);
      expect(data.daysRemaining).toBe(0);
    });
  });
});
