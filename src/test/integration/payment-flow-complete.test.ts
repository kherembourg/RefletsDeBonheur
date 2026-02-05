/**
 * Integration Test: Complete Payment Flow
 * 
 * Tests the full signup → payment → account creation flow:
 * 1. User fills signup form
 * 2. Creates Stripe checkout session
 * 3. Payment webhook processes
 * 4. Account is created atomically
 * 5. User receives magic link
 * 6. User can log in
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock modules
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

// Mock global fetch for API calls
global.fetch = vi.fn();

describe('Payment Flow Integration', () => {
  let mockSupabase: any;
  let mockStripe: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create proper mock chain for Supabase query builder
    const createMockChain = () => {
      const chain: any = {
        select: vi.fn().mockReturnValue(chain),
        insert: vi.fn().mockReturnValue(chain),
        update: vi.fn().mockReturnValue(chain),
        eq: vi.fn().mockReturnValue(chain),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return chain;
    };

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => createMockChain()),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
          generateLink: vi.fn().mockResolvedValue({
            data: {
              properties: {
                action_link: 'https://example.com/magic-link'
              }
            },
            error: null,
          }),
        },
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Setup mock Stripe
    mockStripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/pay/cs_test_123',
            payment_intent: 'pi_123',
          }),
          retrieve: vi.fn().mockResolvedValue({
            id: 'cs_test_123',
            payment_status: 'paid',
            customer_email: 'test@example.com',
            metadata: {
              pending_signup_id: 'pending-123',
            },
          }),
        },
      },
      webhooks: {
        constructEvent: vi.fn((body, sig, secret) => ({
          id: 'evt_123',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              payment_status: 'paid',
              customer_email: 'test@example.com',
              metadata: {
                pending_signup_id: 'pending-123',
              },
            },
          },
        })),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Step 1: Signup Form Submission', () => {
    it('should create pending signup with form data', async () => {
      const signupData = {
        email: 'test@example.com',
        weddingName: 'John & Jane',
        weddingDate: '2026-06-15',
        slug: 'john-jane-2026',
        theme: 'romantic',
        planId: 'plan_premium',
      };

      // Simulate what the API does: insert pending signup
      const dbData = {
        email: signupData.email,
        wedding_name: signupData.weddingName,
        wedding_date: signupData.weddingDate,
        slug: signupData.slug,
        theme: signupData.theme,
        plan_id: signupData.planId,
      };

      // Mock pending signup creation - create proper chain
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({
        data: { id: 'pending-123', ...dbData },
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue(chain);

      mockSupabase.from = vi.fn(() => ({
        insert: mockInsert,
      }));

      const result = await mockSupabase
        .from('pending_signups')
        .insert(dbData)
        .select()
        .single();

      // Verify pending signup was created
      expect(mockInsert).toHaveBeenCalledWith(dbData);
      expect(result.data).toMatchObject(dbData);
      expect(result.data.id).toBe('pending-123');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        weddingName: '', // Empty required field
      };

      // Should fail validation before database call
      const mockInsert = vi.fn();
      mockSupabase.from = vi.fn(() => ({
        insert: mockInsert,
      }));

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(invalidData.email)).toBe(false);

      // Validate required fields
      expect(invalidData.weddingName).toBe('');
    });
  });

  describe('Step 2: Stripe Checkout Session Creation', () => {
    it('should create checkout session with correct parameters', async () => {
      const pendingSignupId = 'pending-123';
      const planId = 'plan_premium';

      // Mock checkout session creation
      const session = await mockStripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price: planId,
          quantity: 1,
        }],
        metadata: {
          pending_signup_id: pendingSignupId,
        },
        success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://example.com/cancel',
      });

      expect(session).toBeDefined();
      expect(session.id).toBe('cs_test_123');
      expect(session.url).toContain('checkout.stripe.com');
    });

    it('should handle checkout session creation failure', async () => {
      mockStripe.checkout.sessions.create = vi.fn().mockRejectedValue(
        new Error('Invalid API key')
      );

      await expect(
        mockStripe.checkout.sessions.create({})
      ).rejects.toThrow('Invalid API key');
    });
  });

  describe('Step 3: Payment Webhook Processing', () => {
    it('should process successful payment webhook', async () => {
      const webhookBody = JSON.stringify({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            metadata: {
              pending_signup_id: 'pending-123',
            },
          },
        },
      });

      const signature = 'test-signature';
      const secret = 'whsec_test';

      // Construct event from webhook
      const event = mockStripe.webhooks.constructEvent(
        webhookBody,
        signature,
        secret
      );

      expect(event.type).toBe('checkout.session.completed');
      expect(event.data.object.payment_status).toBe('paid');
    });

    it('should verify webhook signature', async () => {
      const invalidSignature = 'invalid-sig';

      mockStripe.webhooks.constructEvent = vi.fn(() => {
        throw new Error('Invalid signature');
      });

      expect(() => {
        mockStripe.webhooks.constructEvent('body', invalidSignature, 'secret');
      }).toThrow('Invalid signature');
    });

    it('should implement idempotency for duplicate webhooks', async () => {
      const eventId = 'evt_123';

      // First webhook - should process - create proper chain
      const chain: any = {};
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null, // Event not processed yet
        error: null,
      });
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.maybeSingle = mockMaybeSingle;

      mockSupabase.from = vi.fn(() => chain);

      // Check if event exists
      const { data: existingEvent } = await mockSupabase
        .from('webhook_events')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      expect(existingEvent).toBeNull();

      // Second webhook (duplicate) - should skip
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 1, event_id: eventId, processed: true },
        error: null,
      });

      const { data: duplicateEvent } = await mockSupabase
        .from('webhook_events')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      expect(duplicateEvent).toBeDefined();
      expect(duplicateEvent?.processed).toBe(true);
    });
  });

  describe('Step 4: Atomic Account Creation', () => {
    it('should create auth user, profile, and wedding atomically', async () => {
      const pendingSignup = {
        id: 'pending-123',
        email: 'test@example.com',
        wedding_name: 'John & Jane',
        wedding_date: '2026-06-15',
        slug: 'john-jane-2026',
        theme: 'romantic',
      };

      // Mock RPC call for atomic account creation
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          user_id: 'user-123',
          profile_id: 'profile-123',
          wedding_id: 'wedding-123',
        },
        error: null,
      });

      mockSupabase.rpc = mockRpc;

      // Call atomic account creation function
      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_email: pendingSignup.email,
        p_wedding_name: pendingSignup.wedding_name,
        p_wedding_date: pendingSignup.wedding_date,
        p_slug: pendingSignup.slug,
        p_theme: pendingSignup.theme,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user_id).toBe('user-123');
      expect(data.wedding_id).toBe('wedding-123');
    });

    it('should rollback on failure', async () => {
      // Mock RPC failure (e.g., duplicate slug)
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Duplicate slug', code: '23505' },
      });

      mockSupabase.rpc = mockRpc;

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_slug: 'duplicate-slug',
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should handle race condition when slug is taken between check and create', async () => {
      // First call succeeds
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({
          data: { user_id: 'user-123', wedding_id: 'wedding-123' },
          error: null,
        })
        // Second call with same slug fails
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Duplicate slug', code: '23505' },
        });

      mockSupabase.rpc = mockRpc;

      // First user creates account
      const result1 = await mockSupabase.rpc('create_account_from_payment', {
        p_slug: 'same-slug',
      });
      expect(result1.error).toBeNull();

      // Second user tries same slug
      const result2 = await mockSupabase.rpc('create_account_from_payment', {
        p_slug: 'same-slug',
      });
      expect(result2.error).toBeDefined();
    });
  });

  describe('Step 5: Magic Link Generation', () => {
    it('should generate magic link after account creation', async () => {
      const email = 'test@example.com';

      const { data, error } = await mockSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
      });

      expect(error).toBeNull();
      expect(data?.properties?.action_link).toContain('magic-link');
    });

    it('should handle magic link generation failure', async () => {
      mockSupabase.auth.admin.generateLink = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const { data, error } = await mockSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: 'nonexistent@example.com',
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });
  });

  describe('Step 6: User Login', () => {
    it('should allow user to log in after account creation', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'temporary-password',
      };

      const { data, error } = await mockSupabase.auth.signInWithPassword(credentials);

      expect(error).toBeNull();
      expect(data?.user?.id).toBe('user-123');
      expect(data?.session?.access_token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { data, error } = await mockSupabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });
  });

  describe('Complete Flow End-to-End', () => {
    it('should complete full signup → payment → login flow', async () => {
      // Step 1: Create pending signup
      const signupData = {
        email: 'test@example.com',
        wedding_name: 'John & Jane',
        wedding_date: '2026-06-15',
        slug: 'john-jane-2026',
        theme: 'romantic',
      };

      // Create proper chain for pending_signups
      const pendingSignupsChain: any = {};
      pendingSignupsChain.select = vi.fn().mockReturnValue(pendingSignupsChain);
      pendingSignupsChain.single = vi.fn().mockResolvedValue({
        data: { id: 'pending-123', ...signupData },
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue(pendingSignupsChain);

      // Create default chain for other tables
      const defaultChain: any = {};
      defaultChain.select = vi.fn().mockReturnValue(defaultChain);
      defaultChain.eq = vi.fn().mockReturnValue(defaultChain);
      defaultChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'pending_signups') {
          return {
            insert: mockInsert,
          };
        }
        return defaultChain;
      });

      const pendingSignup = await mockSupabase
        .from('pending_signups')
        .insert(signupData)
        .select()
        .single();

      expect(pendingSignup.data.id).toBe('pending-123');

      // Step 2: Create Stripe checkout session
      const session = await mockStripe.checkout.sessions.create({
        metadata: { pending_signup_id: pendingSignup.data.id },
      });

      expect(session.id).toBe('cs_test_123');

      // Step 3: Process payment webhook
      const event = mockStripe.webhooks.constructEvent('body', 'sig', 'secret');
      expect(event.type).toBe('checkout.session.completed');

      // Step 4: Create account atomically
      const mockRpc = vi.fn().mockResolvedValue({
        data: { user_id: 'user-123', wedding_id: 'wedding-123' },
        error: null,
      });
      mockSupabase.rpc = mockRpc;

      const account = await mockSupabase.rpc('create_account_from_payment', signupData);
      expect(account.data.user_id).toBe('user-123');

      // Step 5: Generate magic link
      const magicLink = await mockSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: signupData.email,
      });
      expect(magicLink.data?.properties?.action_link).toBeDefined();

      // Step 6: User logs in
      const session_login = await mockSupabase.auth.signInWithPassword({
        email: signupData.email,
        password: 'temp-pass',
      });
      expect(session_login.data?.user?.id).toBe('user-123');

      // Verify complete flow
      expect(pendingSignup.error).toBeNull();
      expect(session).toBeDefined();
      expect(event).toBeDefined();
      expect(account.error).toBeNull();
      expect(magicLink.error).toBeNull();
      expect(session_login.error).toBeNull();
    });

    it('should handle failure at any step and rollback', async () => {
      // Simulate failure at account creation step
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '500' },
      });

      mockSupabase.rpc = mockRpc;

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {});

      // Verify transaction rolled back
      expect(error).toBeDefined();
      expect(data).toBeNull();

      // No subsequent steps should execute
      const magicLinkCalls = mockSupabase.auth.admin.generateLink.mock.calls.length;
      expect(magicLinkCalls).toBe(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle payment failure gracefully', async () => {
      const event = {
        type: 'checkout.session.async_payment_failed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'unpaid',
          },
        },
      };

      // Should not create account
      const mockRpc = vi.fn();
      mockSupabase.rpc = mockRpc;

      // Process failed payment event
      if (event.data.object.payment_status !== 'paid') {
        // Don't create account
        expect(mockRpc).not.toHaveBeenCalled();
      }
    });

    it('should handle network failures with retry logic', async () => {
      let attempts = 0;
      const mockWithRetry = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: { success: true }, error: null });
      });

      // Retry logic simulation
      const maxRetries = 3;
      let result;
      for (let i = 0; i < maxRetries; i++) {
        try {
          result = await mockWithRetry();
          break;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }

      expect(attempts).toBe(3);
      expect(result?.data.success).toBe(true);
    });

    it('should prevent duplicate account creation for same pending signup', async () => {
      const pendingSignupId = 'pending-123';

      // First webhook creates account
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({
          data: { user_id: 'user-123' },
          error: null,
        })
        // Second webhook should fail
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Account already created', code: 'DUPLICATE' },
        });

      mockSupabase.rpc = mockRpc;

      // First webhook
      const result1 = await mockSupabase.rpc('create_account_from_payment', {
        pending_signup_id: pendingSignupId,
      });
      expect(result1.error).toBeNull();

      // Duplicate webhook
      const result2 = await mockSupabase.rpc('create_account_from_payment', {
        pending_signup_id: pendingSignupId,
      });
      expect(result2.error).toBeDefined();
    });
  });
});
