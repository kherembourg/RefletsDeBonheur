/**
 * Integration Tests: Stripe Webhook Handler
 *
 * Comprehensive tests for webhook idempotency, event processing, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './webhook';
import type Stripe from 'stripe';

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
  getStripeWebhookSecret: vi.fn().mockReturnValue('whsec_test_secret'),
  isStripeConfigured: vi.fn().mockReturnValue(true),
  PRODUCT_CONFIG: {
    initialPeriodYears: 2,
  },
}));

vi.mock('../../../lib/api/middleware', () => ({
  apiGuards: {
    requireSupabase: vi.fn().mockReturnValue(null),
    requireServiceRole: vi.fn().mockReturnValue(null),
    requireStripe: vi.fn().mockReturnValue(null),
  },
}));

describe('Stripe Webhook Handler - Phase 1.1: Comprehensive Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== IDEMPOTENCY TESTS (6 tests) =====
  describe('Idempotency: Atomic INSERT-first Pattern', () => {
    it('should use atomic INSERT-first pattern with success', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_test_123',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: mockInsert,
              update: vi.fn().mockReturnValue({
                eq: mockUpdate().eq,
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify INSERT was called first (atomic ownership claim)
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith({
        stripe_event_id: 'evt_test_123',
        type: 'checkout.session.completed',
        status: 'processing',
      });

      // Verify event was marked as completed
      expect(mockClient.from).toHaveBeenCalledWith('stripe_events');
      expect(data.received).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should skip processing when INSERT fails with duplicate key error (23505)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_test_duplicate',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      // Simulate duplicate key violation (unique constraint)
      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return { insert: mockInsert };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify duplicate was detected and handled correctly
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(data.received).toBe(true);
      expect(data.duplicate).toBe(true);
      expect(response.status).toBe(200);

      // Verify NO further processing occurred (no calls to other tables)
      expect(mockClient.from).toHaveBeenCalledTimes(1);
      expect(mockClient.from).toHaveBeenCalledWith('stripe_events');
    });

    it('should continue processing on non-duplicate INSERT errors', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_test_other_error',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      // Simulate non-duplicate error (e.g., connection issue)
      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '08006', message: 'connection failure' },
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: mockInsert,
              update: vi.fn().mockReturnValue({
                eq: mockUpdate().eq,
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify processing continued despite INSERT error
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(data.received).toBe(true);
      expect(data.duplicate).toBeUndefined();
      expect(response.status).toBe(200);

      // Verify event was processed (pending_signups was updated)
      expect(mockClient.from).toHaveBeenCalledWith('pending_signups');
    });

    it('should simulate concurrent webhook delivery (race condition)', async () => {
      // This test simulates two webhook requests arriving simultaneously
      // Only the first should process, the second should get duplicate response

      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_test_concurrent',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      let insertCallCount = 0;
      const mockInsert = vi.fn().mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 1) {
          // First request succeeds
          return Promise.resolve({ error: null });
        } else {
          // Second request gets duplicate key error
          return Promise.resolve({
            error: { code: '23505', message: 'duplicate key' },
          });
        }
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: mockInsert,
              update: vi.fn().mockReturnValue({
                eq: mockUpdate().eq,
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      // Simulate two concurrent requests
      const request1 = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const request2 = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const [response1, response2] = await Promise.all([
        POST({ request: request1 } as any),
        POST({ request: request2 } as any),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // First request should process successfully
      expect(response1.status).toBe(200);
      expect(data1.received).toBe(true);
      expect(data1.duplicate).toBeUndefined();

      // Second request should be marked as duplicate
      expect(response2.status).toBe(200);
      expect(data2.received).toBe(true);
      expect(data2.duplicate).toBe(true);

      // Verify both tried to INSERT
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('should track event status: processing → completed', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_test_status',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: mockInsert,
              update: mockUpdate,
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      await POST({ request } as any);

      // Verify status progression: processing (INSERT) → completed (UPDATE)
      expect(mockInsert).toHaveBeenCalledWith({
        stripe_event_id: 'evt_test_status',
        type: 'checkout.session.completed',
        status: 'processing',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          processed_at: expect.any(String),
        })
      );

      expect(mockUpdateEq).toHaveBeenCalledWith('stripe_event_id', 'evt_test_status');
    });

    it('should verify event ID stored correctly', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_verify_id_123',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: mockInsert,
              update: vi.fn().mockReturnValue({
                eq: mockUpdateEq,
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      await POST({ request } as any);

      // Verify correct event ID was used throughout
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_event_id: 'evt_verify_id_123',
        })
      );

      expect(mockUpdateEq).toHaveBeenCalledWith('stripe_event_id', 'evt_verify_id_123');
    });
  });

  // ===== CHECKOUT.SESSION.COMPLETED TESTS (8 tests) =====
  describe('checkout.session.completed Events', () => {
    it('should handle new signup flow (type=new_signup)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_new_signup',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_new_signup_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      const mockPendingSignupUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockPendingSignupEq = vi.fn().mockReturnValue(mockPendingSignupUpdate);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn((data: any) => ({
                eq: mockPendingSignupEq,
              })),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify pending_signups was marked as completed
      expect(mockClient.from).toHaveBeenCalledWith('pending_signups');
      expect(mockPendingSignupEq).toHaveBeenCalledWith('stripe_session_id', 'cs_new_signup_123');
      expect(data.received).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should handle existing profile upgrade flow', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_upgrade',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_upgrade_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: {
                  profileId: 'profile-456',
                  type: 'upgrade', // Not 'new_signup'
                },
              },
            },
          }),
        },
      };

      const mockProfileUpdateEq = vi.fn().mockResolvedValue({ error: null });
      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: mockProfileUpdateEq,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify profile was updated
      expect(mockClient.from).toHaveBeenCalledWith('profiles');
      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'active',
          stripe_customer_id: 'cus_test_123',
        })
      );
      expect(mockProfileUpdateEq).toHaveBeenCalledWith('id', 'profile-456');
      expect(data.received).toBe(true);
    });

    it('should handle missing profileId (log error, skip processing)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_no_profile',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_no_profile_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: {}, // No profileId
              },
            },
          }),
        },
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify NO profile update was attempted (only stripe_events was touched)
      expect(mockClient.from).toHaveBeenCalledWith('stripe_events');
      expect(mockClient.from).not.toHaveBeenCalledWith('profiles');
      expect(data.received).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should validate payment status (paid vs unpaid)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_unpaid',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_unpaid_123',
                payment_status: 'unpaid',
                customer: 'cus_test_123',
                metadata: { profileId: 'profile-456' },
              },
            },
          }),
        },
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify NO profile update for unpaid session
      expect(mockClient.from).not.toHaveBeenCalledWith('profiles');
      expect(data.received).toBe(true);
    });

    it('should calculate subscription end date (2 years from now)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_date_calc',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_date_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { profileId: 'profile-456' },
              },
            },
          }),
        },
      };

      let capturedEndDate: string | null = null;

      const mockProfileUpdate = vi.fn((data: any) => {
        capturedEndDate = data.subscription_end_date;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      await POST({ request } as any);

      // Verify end date is approximately 2 years from now
      expect(capturedEndDate).toBeTruthy();
      const endDate = new Date(capturedEndDate!);
      const now = new Date();
      const twoYearsLater = new Date(now);
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);

      const diffYears = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      expect(Math.round(diffYears)).toBe(2);
    });

    it('should store customer ID in profile', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_customer_id',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_specific_id_789',
                metadata: { profileId: 'profile-456' },
              },
            },
          }),
        },
      };

      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      await POST({ request } as any);

      // Verify customer ID was stored
      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_customer_id: 'cus_specific_id_789',
        })
      );
    });

    it('should handle missing session metadata', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_no_metadata',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_no_meta_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                // No metadata at all
              },
            },
          }),
        },
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Should handle gracefully (no crash)
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockClient.from).not.toHaveBeenCalledWith('profiles');
    });

    it('should prioritize new_signup when both flows present', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_both_flows',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_both_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: {
                  type: 'new_signup',
                  profileId: 'profile-456', // Both present
                },
              },
            },
          }),
        },
      };

      const mockPendingSignupEq = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn().mockReturnValue({
                eq: mockPendingSignupEq,
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      await POST({ request } as any);

      // Verify new_signup flow was used (not upgrade)
      expect(mockClient.from).toHaveBeenCalledWith('pending_signups');
      expect(mockClient.from).not.toHaveBeenCalledWith('profiles');
      expect(mockPendingSignupEq).toHaveBeenCalledWith('stripe_session_id', 'cs_both_123');
    });
  });

  // ===== SUBSCRIPTION EVENTS TESTS (6 tests) =====
  describe('Subscription Events', () => {
    it('should handle customer.subscription.updated with status mapping', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_sub_updated',
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: 'sub_123',
                customer: 'cus_test_123',
                status: 'active',
                current_period_end: 1735689600, // 2025-01-01 00:00:00 UTC
              },
            },
          }),
        },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'profile-456' },
            error: null,
          }),
        }),
      });

      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: mockSelect,
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      });

      await POST({ request } as any);

      // Verify profile lookup by customer ID
      expect(mockSelect).toHaveBeenCalled();

      // Verify status was mapped correctly (active → active)
      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'active',
        })
      );
    });

    it('should handle customer.subscription.deleted', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_sub_deleted',
            type: 'customer.subscription.deleted',
            data: {
              object: {
                id: 'sub_123',
                customer: 'cus_test_123',
                status: 'canceled',
              },
            },
          }),
        },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'profile-456' },
            error: null,
          }),
        }),
      });

      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: mockSelect,
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'customer.subscription.deleted' }),
      });

      await POST({ request } as any);

      // Verify profile was marked as cancelled
      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'cancelled',
        })
      );
    });

    it('should lookup profile by stripe_customer_id (found)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_lookup_found',
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: 'sub_123',
                customer: 'cus_found_123',
                status: 'active',
                current_period_end: 1735689600,
              },
            },
          }),
        },
      };

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'profile-found' },
          error: null,
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: mockSelect,
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      });

      await POST({ request } as any);

      // Verify lookup was performed with correct customer ID
      expect(mockEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_found_123');
    });

    it('should handle profile lookup by stripe_customer_id (not found)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_lookup_not_found',
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: 'sub_123',
                customer: 'cus_not_found_123',
                status: 'active',
                current_period_end: 1735689600,
              },
            },
          }),
        },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null, // Profile not found
            error: null,
          }),
        }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: mockSelect,
              update: vi.fn(), // Should not be called
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      });

      const response = await POST({ request } as any);

      // Should complete successfully without attempting update
      expect(response.status).toBe(200);
      expect(mockClient.from('profiles').update).not.toHaveBeenCalled();
    });

    it('should extract current_period_end and convert to date', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_period_end',
            type: 'customer.subscription.updated',
            data: {
              object: {
                id: 'sub_123',
                customer: 'cus_test_123',
                status: 'active',
                current_period_end: 1704067200, // 2024-01-01 00:00:00 UTC
              },
            },
          }),
        },
      };

      let capturedEndDate: string | null = null;

      const mockProfileUpdate = vi.fn((data: any) => {
        capturedEndDate = data.subscription_end_date;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'profile-456' },
                    error: null,
                  }),
                }),
              }),
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'customer.subscription.updated' }),
      });

      await POST({ request } as any);

      // Verify timestamp was converted correctly
      expect(capturedEndDate).toBeTruthy();
      const endDate = new Date(capturedEndDate!);
      expect(endDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should map Stripe statuses correctly (active/trialing/canceled/past_due)', async () => {
      const testCases = [
        { stripeStatus: 'active', expectedStatus: 'active' },
        { stripeStatus: 'trialing', expectedStatus: 'active' },
        { stripeStatus: 'canceled', expectedStatus: 'cancelled' },
        { stripeStatus: 'past_due', expectedStatus: 'expired' },
        { stripeStatus: 'unpaid', expectedStatus: 'expired' },
        { stripeStatus: 'incomplete', expectedStatus: 'expired' },
        { stripeStatus: 'incomplete_expired', expectedStatus: 'expired' },
        { stripeStatus: 'paused', expectedStatus: 'expired' },
      ];

      for (const testCase of testCases) {
        const mockStripe = {
          webhooks: {
            constructEvent: vi.fn().mockReturnValue({
              id: `evt_status_${testCase.stripeStatus}`,
              type: 'customer.subscription.updated',
              data: {
                object: {
                  id: 'sub_123',
                  customer: 'cus_test_123',
                  status: testCase.stripeStatus,
                  current_period_end: 1735689600,
                },
              },
            }),
          },
        };

        let capturedStatus: string | null = null;

        const mockProfileUpdate = vi.fn((data: any) => {
          capturedStatus = data.subscription_status;
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        });

        const mockClient = {
          from: vi.fn((table: string) => {
            if (table === 'stripe_events') {
              return {
                insert: vi.fn().mockResolvedValue({ error: null }),
                update: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              };
            }
            if (table === 'profiles') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'profile-456' },
                      error: null,
                    }),
                  }),
                }),
                update: mockProfileUpdate,
              };
            }
            return {};
          }),
        };

        const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
        (getSupabaseAdminClient as any).mockReturnValue(mockClient);

        const { getStripeClient } = await import('../../../lib/stripe/server');
        (getStripeClient as any).mockReturnValue(mockStripe);

        const request = new Request('http://localhost:4321/api/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'test_signature' },
          body: JSON.stringify({ type: 'customer.subscription.updated' }),
        });

        await POST({ request } as any);

        // Verify status was mapped correctly
        expect(capturedStatus).toBe(testCase.expectedStatus);
      }
    });
  });

  // ===== INVOICE EVENTS TESTS (5 tests) =====
  describe('Invoice Events', () => {
    it('should handle invoice.payment_succeeded with renewal (billing_reason: subscription_cycle)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_invoice_renewal',
            type: 'invoice.payment_succeeded',
            data: {
              object: {
                id: 'in_123',
                customer: 'cus_test_123',
                billing_reason: 'subscription_cycle',
              },
            },
          }),
        },
      };

      let capturedEndDate: string | null = null;

      const mockProfileUpdate = vi.fn((data: any) => {
        capturedEndDate = data.subscription_end_date;
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'profile-456' },
                    error: null,
                  }),
                }),
              }),
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
      });

      await POST({ request } as any);

      // Verify subscription was extended by 1 year
      expect(capturedEndDate).toBeTruthy();
      const endDate = new Date(capturedEndDate!);
      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const diffYears = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
      expect(Math.round(diffYears)).toBe(1);

      // Verify status was set to active
      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'active',
        })
      );
    });

    it('should skip invoice.payment_succeeded with initial payment (billing_reason: subscription_create)', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_invoice_initial',
            type: 'invoice.payment_succeeded',
            data: {
              object: {
                id: 'in_123',
                customer: 'cus_test_123',
                billing_reason: 'subscription_create', // Initial payment
              },
            },
          }),
        },
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn(),
              update: vi.fn(),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
      });

      const response = await POST({ request } as any);

      // Verify NO profile update occurred (initial payment handled elsewhere)
      expect(mockClient.from('profiles').select).not.toHaveBeenCalled();
      expect(mockClient.from('profiles').update).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should handle invoice.payment_failed - mark as expired', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_invoice_failed',
            type: 'invoice.payment_failed',
            data: {
              object: {
                id: 'in_123',
                customer: 'cus_test_123',
              },
            },
          }),
        },
      };

      const mockProfileUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'profile-456' },
                    error: null,
                  }),
                }),
              }),
              update: mockProfileUpdate,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'invoice.payment_failed' }),
      });

      await POST({ request } as any);

      // Verify profile was marked as expired
      expect(mockProfileUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'expired',
        })
      );
    });

    it('should filter billing reasons (subscription_cycle only)', async () => {
      const testCases = [
        { reason: 'subscription_cycle', shouldProcess: true },
        { reason: 'subscription_create', shouldProcess: false },
        { reason: 'manual', shouldProcess: false },
        { reason: 'subscription_update', shouldProcess: false },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        const mockStripe = {
          webhooks: {
            constructEvent: vi.fn().mockReturnValue({
              id: `evt_${testCase.reason}`,
              type: 'invoice.payment_succeeded',
              data: {
                object: {
                  id: 'in_123',
                  customer: 'cus_test_123',
                  billing_reason: testCase.reason,
                },
              },
            }),
          },
        };

        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'profile-456' },
              error: null,
            }),
          }),
        });

        const mockClient = {
          from: vi.fn((table: string) => {
            if (table === 'stripe_events') {
              return {
                insert: vi.fn().mockResolvedValue({ error: null }),
                update: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              };
            }
            if (table === 'profiles') {
              return {
                select: mockSelect,
                update: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
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

        const request = new Request('http://localhost:4321/api/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'test_signature' },
          body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
        });

        await POST({ request } as any);

        // Verify profile lookup only happened for subscription_cycle
        if (testCase.shouldProcess) {
          expect(mockSelect).toHaveBeenCalled();
        } else {
          expect(mockSelect).not.toHaveBeenCalled();
        }
      }
    });

    it('should handle missing customer profile during invoice processing', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_no_profile_invoice',
            type: 'invoice.payment_succeeded',
            data: {
              object: {
                id: 'in_123',
                customer: 'cus_not_found_123',
                billing_reason: 'subscription_cycle',
              },
            },
          }),
        },
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null, // Profile not found
                    error: null,
                  }),
                }),
              }),
              update: vi.fn(),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'invoice.payment_succeeded' }),
      });

      const response = await POST({ request } as any);

      // Should complete successfully without attempting update
      expect(response.status).toBe(200);
      expect(mockClient.from('profiles').update).not.toHaveBeenCalled();
    });
  });

  // ===== ERROR HANDLING TESTS (3 tests) =====
  describe('Error Handling', () => {
    it('should handle signature verification failures', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockImplementation(() => {
            throw new Error('Invalid signature');
          }),
        },
      };

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue(mockStripe);

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'invalid_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const text = await response.text();

      // Verify 400 response with error message
      expect(response.status).toBe(400);
      expect(text).toContain('Webhook Error');
      expect(text).toContain('Invalid signature');
    });

    it('should handle missing signature header', async () => {
      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: {}, // No stripe-signature header
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const text = await response.text();

      // Verify 400 response
      expect(response.status).toBe(400);
      expect(text).toBe('Missing signature');
    });

    it('should mark event as failed on database errors during processing', async () => {
      const mockStripe = {
        webhooks: {
          constructEvent: vi.fn().mockReturnValue({
            id: 'evt_db_error',
            type: 'checkout.session.completed',
            data: {
              object: {
                id: 'cs_test_123',
                payment_status: 'paid',
                customer: 'cus_test_123',
                metadata: { type: 'new_signup' },
              },
            },
          }),
        },
      };

      const mockUpdateForFailure = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'stripe_events') {
            const callCount = { current: 0 };
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
              update: vi.fn((data: any) => {
                callCount.current++;
                // First update (failure), second update (event status)
                if (data.status === 'failed') {
                  return {
                    eq: mockUpdateForFailure,
                  };
                }
                return {
                  eq: vi.fn().mockResolvedValue({ error: null }),
                };
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              update: vi.fn().mockImplementation(() => {
                throw new Error('Database connection lost');
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

      const request = new Request('http://localhost:4321/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'test_signature' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify error response
      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook handler failed');

      // Verify event was marked as failed with error message
      expect(mockUpdateForFailure).toHaveBeenCalledWith('stripe_event_id', 'evt_db_error');
    });
  });
});
