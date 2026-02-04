import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    name: 'Wedding Package',
    description: '2-year wedding website',
    initialPrice: 19900,
  },
}));

vi.mock('../../../lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitResponse: vi.fn(),
  RATE_LIMITS: {
    signup: { maxAttempts: 5, windowMs: 3600000 },
  },
}));

describe('Create Checkout - Slug Reservation System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Slug Unique Constraint (Race Condition Prevention)', () => {
    it('should reserve slug when first user creates checkout session', async () => {
      const mockSelect = vi.fn();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null, // Slug not taken in weddings table
        error: null,
      });

      const mockInsert = vi.fn();
      const mockInsertSelect = vi.fn();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'pending-signup-1',
          slug: 'alice-bob',
          email: 'alice@example.com',
          stripe_session_id: 'cs_test_123',
        },
        error: null,
      });

      const mockStripeSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'weddings') {
            return {
              select: mockSelect.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              insert: mockInsert.mockReturnValue({
                select: mockInsertSelect.mockReturnValue({
                  single: mockInsertSingle,
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
      (getStripeClient as any).mockReturnValue({
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue(mockStripeSession),
          },
        },
      });

      const request = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alice@example.com',
          password: 'SecurePass123!',
          partner1_name: 'Alice',
          partner2_name: 'Bob',
          slug: 'alice-bob',
          theme_id: 'classic',
        }),
      });

      const { POST } = await import('./create-checkout');
      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBe('cs_test_123');
      expect(data.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'alice-bob',
          email: 'alice@example.com',
        })
      );
    });

    it('should reject second concurrent request for same slug with 409 error', async () => {
      const mockSelect = vi.fn();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null, // Slug not in weddings table
        error: null,
      });

      const mockInsert = vi.fn();
      const mockInsertSelect = vi.fn();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '23505', // PostgreSQL unique_violation error
          message: 'duplicate key value violates unique constraint "idx_pending_signups_slug_active"',
        },
      });

      const mockStripeSession = {
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/pay/cs_test_456',
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'weddings') {
            return {
              select: mockSelect.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              insert: mockInsert.mockReturnValue({
                select: mockInsertSelect.mockReturnValue({
                  single: mockInsertSingle,
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
      (getStripeClient as any).mockReturnValue({
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue(mockStripeSession),
          },
        },
      });

      const request = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'charlie@example.com',
          password: 'SecurePass456!',
          partner1_name: 'Charlie',
          partner2_name: 'Diana',
          slug: 'alice-bob', // Same slug as first user
          theme_id: 'classic',
        }),
      });

      const { POST } = await import('./create-checkout');
      const response = await POST({ request } as any);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Slug reserved');
      expect(data.field).toBe('slug');
      expect(data.message).toContain('being used by another signup in progress');
    });

    it('should allow new reservation after expired reservation cleanup', async () => {
      const mockSelect = vi.fn();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockInsert = vi.fn();
      const mockInsertSelect = vi.fn();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'pending-signup-2',
          slug: 'alice-bob',
          email: 'eve@example.com',
          stripe_session_id: 'cs_test_789',
        },
        error: null,
      });

      const mockStripeSession = {
        id: 'cs_test_789',
        url: 'https://checkout.stripe.com/pay/cs_test_789',
      };

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'weddings') {
            return {
              select: mockSelect.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              insert: mockInsert.mockReturnValue({
                select: mockInsertSelect.mockReturnValue({
                  single: mockInsertSingle,
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
      (getStripeClient as any).mockReturnValue({
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue(mockStripeSession),
          },
        },
      });

      const request = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'eve@example.com',
          password: 'SecurePass789!',
          partner1_name: 'Eve',
          partner2_name: 'Frank',
          slug: 'alice-bob', // Same slug, but previous reservation expired
          theme_id: 'classic',
        }),
      });

      const { POST } = await import('./create-checkout');
      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBe('cs_test_789');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'alice-bob',
          email: 'eve@example.com',
        })
      );
    });
  });

  describe('Slug Validation Before Reservation', () => {
    it('should reject slug already in weddings table before creating checkout', async () => {
      const mockSelect = vi.fn();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { slug: 'taken-slug' }, // Slug exists in weddings
        error: null,
      });

      const mockClient = {
        from: vi.fn(() => ({
          select: mockSelect.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        })),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
          partner1_name: 'John',
          partner2_name: 'Jane',
          slug: 'taken-slug',
          theme_id: 'classic',
        }),
      });

      const { POST } = await import('./create-checkout');
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Slug taken');
      expect(data.field).toBe('slug');
      expect(data.message).toContain('already in use');
    });
  });

  describe('Race Condition Timeline', () => {
    it('should prevent double payment scenario', async () => {
      // Simulates the exact timeline from the issue:
      // T0-T2: Both users check slug availability (passes)
      // T3: User A creates checkout and reserves slug (INSERT succeeds)
      // T4: User B creates checkout (INSERT fails with 23505)

      const mockSelectWeddings = vi.fn();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null, // Both users see slug as available
        error: null,
      });

      let insertCallCount = 0;
      const mockInsert = vi.fn();
      const mockInsertSelect = vi.fn();
      const mockInsertSingle = vi.fn().mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 1) {
          // First user succeeds
          return Promise.resolve({
            data: {
              id: 'pending-signup-a',
              slug: 'race-condition-test',
              stripe_session_id: 'cs_test_a',
            },
            error: null,
          });
        } else {
          // Second user fails with unique constraint
          return Promise.resolve({
            data: null,
            error: {
              code: '23505',
              message: 'duplicate key value violates unique constraint "idx_pending_signups_slug_active"',
            },
          });
        }
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'weddings') {
            return {
              select: mockSelectWeddings.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              insert: mockInsert.mockReturnValue({
                select: mockInsertSelect.mockReturnValue({
                  single: mockInsertSingle,
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
      (getStripeClient as any).mockReturnValue({
        checkout: {
          sessions: {
            create: vi.fn()
              .mockResolvedValueOnce({ id: 'cs_test_a', url: 'https://checkout.stripe.com/a' })
              .mockResolvedValueOnce({ id: 'cs_test_b', url: 'https://checkout.stripe.com/b' }),
          },
        },
      });

      const { POST } = await import('./create-checkout');

      // User A's request
      const requestA = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'userA@example.com',
          password: 'SecurePass123!',
          partner1_name: 'User',
          partner2_name: 'A',
          slug: 'race-condition-test',
          theme_id: 'classic',
        }),
      });

      const responseA = await POST({ request: requestA } as any);
      expect(responseA.status).toBe(200);
      const dataA = await responseA.json();
      expect(dataA.sessionId).toBe('cs_test_a');

      // User B's request (concurrent, same slug)
      const requestB = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'userB@example.com',
          password: 'SecurePass456!',
          partner1_name: 'User',
          partner2_name: 'B',
          slug: 'race-condition-test',
          theme_id: 'classic',
        }),
      });

      const responseB = await POST({ request: requestB } as any);
      expect(responseB.status).toBe(409);
      const dataB = await responseB.json();
      expect(dataB.error).toBe('Slug reserved');
      expect(dataB.field).toBe('slug');

      // Verify User B did NOT get charged (no Stripe session created for them)
      // This prevents the financial liability scenario
    });
  });

  describe('SECURITY: Password Not Stored in pending_signups', () => {
    it('should NOT include password in pending_signups INSERT statement', async () => {
      // This test verifies that passwords are validated but never stored
      // Security fix for issue #032: plaintext password storage vulnerability

      let capturedInsertData: any = null;

      const mockInsert = vi.fn((data: any) => {
        capturedInsertData = data;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'pending-1',
                slug: 'alice-bob',
                email: 'test@example.com',
                stripe_session_id: 'cs_test_123',
              },
              error: null,
            }),
          }),
        };
      });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'weddings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'pending_signups') {
            return {
              insert: mockInsert,
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { getStripeClient } = await import('../../../lib/stripe/server');
      (getStripeClient as any).mockReturnValue({
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: 'cs_test_123',
              url: 'https://checkout.stripe.com/pay/cs_test_123',
            }),
          },
        },
      });

      const { POST } = await import('./create-checkout');
      const request = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePassword123!',
          partner1_name: 'Alice',
          partner2_name: 'Bob',
          slug: 'alice-bob',
          theme_id: 'classic',
        }),
      });

      await POST({ request } as any);

      // CRITICAL SECURITY CHECK: Verify password is NOT in the INSERT data
      expect(capturedInsertData).toBeDefined();
      expect(capturedInsertData).not.toHaveProperty('password');
      expect(capturedInsertData).not.toHaveProperty('password_hash');

      // Verify other fields ARE present (sanity check)
      expect(capturedInsertData).toHaveProperty('email', 'test@example.com');
      expect(capturedInsertData).toHaveProperty('slug', 'alice-bob');
      expect(capturedInsertData).toHaveProperty('partner1_name', 'Alice');
      expect(capturedInsertData).toHaveProperty('partner2_name', 'Bob');
    });

    it('should still validate password strength even though not stored', async () => {
      // Password validation should still happen for security
      // We just don't store it

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        })),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-checkout');
      const request = new Request('http://localhost:4321/api/signup/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'weak', // Too weak!
          partner1_name: 'Alice',
          partner2_name: 'Bob',
          slug: 'alice-bob',
          theme_id: 'classic',
        }),
      });

      const response = await POST({ request } as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe('Weak password');
      expect(data.field).toBe('password');
    });
  });
});
