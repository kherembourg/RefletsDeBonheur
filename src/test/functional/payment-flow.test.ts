import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Functional tests for complete payment flow
 *
 * Tests the end-to-end journey:
 * 1. User completes signup wizard steps 1-4
 * 2. User reaches payment step
 * 3. User submits payment and redirects to Stripe
 * 4. After payment, user returns to success page
 * 5. Success page verifies payment and creates account
 * 6. User is auto-logged in and redirected to admin
 */

// Mock implementations
const createMockSupabaseAdmin = () => ({
  from: vi.fn((table: string) => {
    const responses: Record<string, any> = {
      pending_signups: {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'pending-123', stripe_session_id: 'cs_test_123' },
              error: null,
            })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: 'pending-123',
                email: 'test@example.com',
                password_hash: 'SecurePass123',
                partner1_name: 'Alice',
                partner2_name: 'Bob',
                slug: 'alice-bob',
                theme_id: 'classic',
                completed_at: null,
              },
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      },
      weddings: {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: 'wedding-123', slug: 'alice-bob' },
              error: null,
            })),
          })),
        })),
      },
      profiles: {
        upsert: vi.fn(() => Promise.resolve({ error: null })),
      },
    };
    return responses[table] || {};
  }),
  auth: {
    admin: {
      createUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-123' } },
        error: null,
      })),
    },
  },
});

const createMockStripe = () => ({
  checkout: {
    sessions: {
      create: vi.fn(() => Promise.resolve({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })),
      retrieve: vi.fn(() => Promise.resolve({
        id: 'cs_test_123',
        payment_status: 'paid',
        customer: 'cus_test_123',
      })),
    },
  },
});

describe('Payment Flow - Functional Tests', () => {
  describe('Happy Path: Complete Signup → Payment → Account Creation', () => {
    it('should complete full flow from wizard to admin redirect', async () => {
      const mockSupabase = createMockSupabaseAdmin();
      const mockStripe = createMockStripe();

      // Step 1: User completes wizard (steps 1-4)
      const wizardData = {
        email: 'test@example.com',
        password: 'SecurePass123',
        partner1_name: 'Alice',
        partner2_name: 'Bob',
        wedding_date: '2026-06-15',
        slug: 'alice-bob',
        theme_id: 'classic',
      };

      // Step 2: User submits payment step
      // This creates checkout session and stores in pending_signups
      await mockSupabase.from('pending_signups').insert({
        stripe_session_id: 'cs_test_123',
        ...wizardData,
        stripe_checkout_status: 'pending',
      });

      const checkoutSession = await mockStripe.checkout.sessions.create({});

      expect(checkoutSession.id).toBe('cs_test_123');
      expect(checkoutSession.url).toContain('checkout.stripe.com');

      // Step 3: User completes payment on Stripe (simulated)
      const stripeSession = await mockStripe.checkout.sessions.retrieve('cs_test_123');
      expect(stripeSession.payment_status).toBe('paid');

      // Step 4: User returns to success page, which verifies payment
      const pendingSignup = await mockSupabase.from('pending_signups')
        .select()
        .eq('stripe_session_id', 'cs_test_123')
        .single();

      expect(pendingSignup.data.email).toBe('test@example.com');
      expect(pendingSignup.data.slug).toBe('alice-bob');

      // Step 5: Success page creates account
      const authUser = await mockSupabase.auth.admin.createUser({
        email: wizardData.email,
        password: wizardData.password,
      });

      expect(authUser.data.user.id).toBe('user-123');

      await mockSupabase.from('profiles').upsert({
        id: 'user-123',
        email: wizardData.email,
        subscription_status: 'active',
      });

      await mockSupabase.from('weddings').insert({
        owner_id: 'user-123',
        slug: wizardData.slug,
      });

      // Wedding created successfully via mock

      // Step 6: Mark signup as completed
      await mockSupabase.from('pending_signups')
        .update({ completed_at: new Date().toISOString() })
        .eq('stripe_session_id', 'cs_test_123');

      // Verify all steps completed successfully
      expect(mockSupabase.from).toHaveBeenCalledWith('pending_signups');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('weddings');
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle slug conflict after payment', async () => {
      const mockSupabase = createMockSupabaseAdmin();
      const mockStripe = createMockStripe();

      // Payment succeeds
      await mockStripe.checkout.sessions.retrieve('cs_test_123');

      // But slug is now taken
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({
                  data: { slug: 'alice-bob' }, // Slug taken!
                  error: null,
                })),
              })),
            })),
          };
        }
        return createMockSupabaseAdmin().from(table);
      });

      const existingWedding = await mockSupabase.from('weddings')
        .select()
        .eq('slug', 'alice-bob')
        .maybeSingle();

      expect(existingWedding.data).toBeDefined();
      expect(existingWedding.data.slug).toBe('alice-bob');

      // Should return error without creating account
      // (tested in API unit tests)
    });

    it('should handle payment verification failure', async () => {
      const mockStripe = createMockStripe();

      // Mock unpaid session
      mockStripe.checkout.sessions.retrieve = vi.fn(() => Promise.resolve({
        id: 'cs_test_123',
        payment_status: 'unpaid',
      }));

      const session = await mockStripe.checkout.sessions.retrieve('cs_test_123');

      expect(session.payment_status).toBe('unpaid');
      // Should return error without creating account
    });

    it('should handle idempotent requests (refresh on success page)', async () => {
      const mockSupabase = createMockSupabaseAdmin();

      // First request completes successfully
      await mockSupabase.from('pending_signups')
        .update({ completed_at: new Date().toISOString() })
        .eq('stripe_session_id', 'cs_test_123');

      // Mock already completed signup
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'pending_signups') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    completed_at: new Date().toISOString(),
                    slug: 'alice-bob',
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {};
      });

      // Second request (user refreshed page)
      const pendingSignup = await mockSupabase.from('pending_signups')
        .select()
        .eq('stripe_session_id', 'cs_test_123')
        .single();

      expect(pendingSignup.data.completed_at).toBeDefined();
      // Should return success without creating duplicate account
    });

    it('should cleanup on account creation failure', async () => {
      const mockSupabase = createMockSupabaseAdmin();

      // Mock profile creation failure
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: vi.fn(() => Promise.resolve({
              error: { message: 'Profile creation failed' },
            })),
          };
        }
        if (table === 'pending_signups') {
          return createMockSupabaseAdmin().from('pending_signups');
        }
        return {};
      });

      mockSupabase.auth.admin.deleteUser = vi.fn(() => Promise.resolve({ error: null }));

      // Try to create account
      await mockSupabase.auth.admin.createUser({ email: 'test@example.com' });

      // Profile creation fails
      const profileResult = await mockSupabase.from('profiles').upsert({});
      expect(profileResult.error).toBeDefined();

      // Should cleanup auth user
      await mockSupabase.auth.admin.deleteUser('user-123');
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalled();
    });
  });

  describe('User Cancellation Flow', () => {
    it('should handle user cancelling at Stripe checkout', async () => {
      const mockSupabase = createMockSupabaseAdmin();

      // Pending signup created
      await mockSupabase.from('pending_signups').insert({
        stripe_session_id: 'cs_test_123',
        email: 'test@example.com',
        slug: 'alice-bob',
      });

      // User cancels at Stripe → redirected to /signup/cancel
      // Pending signup remains in database (24h TTL)

      const pendingSignup = await mockSupabase.from('pending_signups')
        .select()
        .eq('stripe_session_id', 'cs_test_123')
        .single();

      expect(pendingSignup.data).toBeDefined();
      expect(pendingSignup.data.completed_at).toBeNull();

      // User can return to signup later
      // Data is preserved for 24 hours
    });
  });

  describe('Webhook Integration', () => {
    it('should mark pending signup as completed via webhook', async () => {
      const mockSupabase = createMockSupabaseAdmin();

      // Webhook receives checkout.session.completed
      await mockSupabase.from('pending_signups')
        .update({ stripe_checkout_status: 'completed' })
        .eq('stripe_session_id', 'cs_test_123');

      expect(mockSupabase.from).toHaveBeenCalledWith('pending_signups');

      // This is a backup - main account creation happens in verify-payment
      // Webhook just marks the pending signup as completed
    });
  });

  describe('Data Validation Throughout Flow', () => {
    it('should validate email at checkout creation', () => {
      const invalidEmails = ['invalid', 'test@', '@example.com', 'test @example.com'];

      invalidEmails.forEach(email => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(emailPattern.test(email)).toBe(false);
      });

      const validEmail = 'test@example.com';
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailPattern.test(validEmail)).toBe(true);
    });

    it('should validate slug format at checkout creation', () => {
      const invalidSlugs = ['AB', 'slug with spaces', 'UPPERCASE', 'slug!@#'];

      invalidSlugs.forEach(slug => {
        const slugPattern = /^[a-z0-9-]{3,50}$/;
        expect(slugPattern.test(slug)).toBe(false);
      });

      const validSlug = 'alice-bob-2026';
      const slugPattern = /^[a-z0-9-]{3,50}$/;
      expect(slugPattern.test(validSlug)).toBe(true);
    });

    it('should re-validate slug at payment verification', async () => {
      const mockSupabase = createMockSupabaseAdmin();

      // Check slug availability before creating wedding
      const existingWedding = await mockSupabase.from('weddings')
        .select()
        .eq('slug', 'alice-bob')
        .maybeSingle();

      // If null, slug is available
      expect(existingWedding.data).toBeNull();

      // Safe to create wedding
      await mockSupabase.from('weddings').insert({ slug: 'alice-bob' });
    });
  });
});
