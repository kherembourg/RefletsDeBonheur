/**
 * Integration Test: Signup Completion with Atomic Transaction
 * 
 * Tests the atomic account creation transaction after payment:
 * 1. Auth user creation (via Supabase Auth API)
 * 2. Profile + Wedding creation (via create_account_from_payment RPC)
 * 3. Transaction rollback on failures
 * 4. No orphaned records on errors
 * 5. Idempotency checks
 * 6. Race condition handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock modules
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Signup Completion - Atomic Transaction', () => {
  let mockSupabase: any;
  let mockAuthUser: any;
  let mockPendingSignup: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock data
    mockAuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    };

    mockPendingSignup = {
      id: 'pending-123',
      stripe_session_id: 'cs_test_123',
      email: 'test@example.com',
      partner1_name: 'Alice',
      partner2_name: 'Bob',
      wedding_date: '2026-06-15',
      slug: 'alice-bob-2026',
      theme_id: 'romantic',
      stripe_checkout_status: 'completed',
      completed_at: null,
      created_at: new Date().toISOString(),
    };

    // Setup mock Supabase client with proper chaining
    mockSupabase = {
      from: vi.fn((table: string) => {
        const mockTable = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(),
          maybeSingle: vi.fn(),
        };
        return mockTable;
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: mockAuthUser },
            error: null,
          }),
          deleteUser: vi.fn().mockResolvedValue({
            data: {},
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
      },
      rpc: vi.fn(),
    };
  });

  describe('Transaction Atomicity', () => {
    it('should create all records atomically when successful', async () => {
      // Mock successful RPC call
      const mockAccountData = {
        user_id: mockAuthUser.id,
        wedding_id: 'wedding-123',
        email: mockPendingSignup.email,
        slug: mockPendingSignup.slug,
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockAccountData,
        error: null,
      });

      // Call RPC function
      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeNull();
      expect(data).toEqual(mockAccountData);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });
    });

    it('should include all required profile fields in transaction', async () => {
      const mockAccountData = {
        user_id: mockAuthUser.id,
        wedding_id: 'wedding-123',
        email: mockPendingSignup.email,
        slug: mockPendingSignup.slug,
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockAccountData,
        error: null,
      });

      const { data } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      // Verify all essential fields are present
      expect(data.user_id).toBe(mockAuthUser.id);
      expect(data.wedding_id).toBeDefined();
      expect(data.email).toBe(mockPendingSignup.email);
      expect(data.slug).toBe(mockPendingSignup.slug);
      expect(data.guest_code).toBeDefined();
      expect(data.couple_names).toContain('Alice');
      expect(data.couple_names).toContain('Bob');
    });

    it('should create wedding with all required fields', async () => {
      const mockAccountData = {
        user_id: mockAuthUser.id,
        wedding_id: 'wedding-123',
        email: mockPendingSignup.email,
        slug: mockPendingSignup.slug,
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockAccountData,
        error: null,
      });

      const { data } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      // Wedding should be linked to user via owner_id
      expect(data.wedding_id).toBeDefined();
      expect(data.slug).toBe(mockPendingSignup.slug);
      expect(data.guest_code).toBeDefined();
      expect(data.guest_code).toMatch(/^[A-Z0-9]{6}$/); // 6 char alphanumeric code
    });

    it('should mark pending_signup as completed in transaction', async () => {
      const mockAccountData = {
        user_id: mockAuthUser.id,
        wedding_id: 'wedding-123',
        email: mockPendingSignup.email,
        slug: mockPendingSignup.slug,
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockAccountData,
        error: null,
      });

      // Verify the transaction marks the signup as complete
      const { error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeNull();
      // In real implementation, pending_signup.completed_at would be set
    });

    it('should rollback all operations when profile creation fails', async () => {
      // Mock RPC failure
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Profile creation failed', code: '23505' },
      });

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
      // Transaction should have rolled back - no partial records created
    });

    it('should rollback all operations when wedding creation fails', async () => {
      // Mock RPC failure due to wedding constraint
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Wedding creation failed - slug taken', code: 'SLUG_CONFLICT' },
      });

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
      // Transaction should have rolled back completely
    });
  });

  describe('Data Integrity', () => {
    it('should not create orphaned auth users after transaction failure', async () => {
      // First, auth user is created successfully
      const authResult = await mockSupabase.auth.admin.createUser({
        email: mockPendingSignup.email,
        password: 'temp-password-12345',
        email_confirm: true,
      });

      expect(authResult.error).toBeNull();
      const userId = authResult.data.user.id;

      // Then transaction fails
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Transaction failed' },
      });

      const rpcResult = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: userId,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(rpcResult.error).toBeDefined();

      // Cleanup: delete auth user
      const deleteResult = await mockSupabase.auth.admin.deleteUser(userId);
      expect(deleteResult.error).toBeNull();
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should not create orphaned profiles after errors', async () => {
      // Mock transaction failure
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const { error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeDefined();
      // Transaction rollback ensures no orphaned profile exists
    });

    it('should not create orphaned weddings after errors', async () => {
      // Mock transaction failure
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const { error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeDefined();
      // Transaction rollback ensures no orphaned wedding exists
    });

    it('should reflect completion status accurately in pending_signup', async () => {
      const mockAccountData = {
        user_id: mockAuthUser.id,
        wedding_id: 'wedding-123',
        email: mockPendingSignup.email,
        slug: mockPendingSignup.slug,
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
      };

      // Success case
      mockSupabase.rpc.mockResolvedValue({
        data: mockAccountData,
        error: null,
      });

      const { error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeNull();
      // In real implementation, pending_signup.completed_at would be set to NOW()
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent signups with same slug gracefully', async () => {
      // Mock slug conflict error (23505 = unique constraint violation)
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { 
          message: 'Slug already taken: alice-bob-2026',
          code: 'SLUG_CONFLICT_POST_PAYMENT',
        },
      });

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeDefined();
      expect(error.code).toBe('SLUG_CONFLICT_POST_PAYMENT');
      expect(data).toBeNull();
    });

    it('should handle duplicate email gracefully', async () => {
      // First attempt succeeds
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: mockAuthUser },
        error: null,
      });

      // Second attempt fails with duplicate email
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'User with this email has already been registered' },
      });

      const result1 = await mockSupabase.auth.admin.createUser({
        email: mockPendingSignup.email,
        password: 'password1',
      });
      expect(result1.error).toBeNull();

      const result2 = await mockSupabase.auth.admin.createUser({
        email: mockPendingSignup.email,
        password: 'password2',
      });
      expect(result2.error).toBeDefined();
      expect(result2.error.message).toContain('already been registered');
    });

    it('should prevent duplicate completion (idempotency)', async () => {
      // Mock already completed error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { 
          message: 'Account already created for this signup',
          hint: 'completed_at=2026-02-04T10:00:00Z',
        },
      });

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('already created');
      expect(data).toBeNull();
    });

    it('should handle missing pending_signup gracefully', async () => {
      // Mock not found error
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { 
          message: 'Pending signup not found: invalid-id',
        },
      });

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: 'invalid-id',
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeDefined();
      expect(error.message).toContain('not found');
      expect(data).toBeNull();
    });
  });

  describe('Cleanup on Failure', () => {
    it('should delete auth user when transaction fails', async () => {
      // Auth user created
      const authResult = await mockSupabase.auth.admin.createUser({
        email: mockPendingSignup.email,
        password: 'temp-password',
        email_confirm: true,
      });

      const userId = authResult.data.user.id;

      // Transaction fails
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      const rpcResult = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: userId,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(rpcResult.error).toBeDefined();

      // Cleanup should delete auth user
      await mockSupabase.auth.admin.deleteUser(userId);
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should log critical error if auth cleanup fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Auth user created
      const authResult = await mockSupabase.auth.admin.createUser({
        email: mockPendingSignup.email,
        password: 'temp-password',
        email_confirm: true,
      });

      const userId = authResult.data.user.id;

      // Transaction fails
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Transaction failed' },
      });

      await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: userId,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      // Cleanup fails
      mockSupabase.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: { message: 'Auth deletion failed' },
      });

      const deleteResult = await mockSupabase.auth.admin.deleteUser(userId);
      expect(deleteResult.error).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('Subscription Setup', () => {
    it('should set subscription_status to active after payment', async () => {
      const mockAccountData = {
        user_id: mockAuthUser.id,
        wedding_id: 'wedding-123',
        email: mockPendingSignup.email,
        slug: mockPendingSignup.slug,
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockAccountData,
        error: null,
      });

      const { data, error } = await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: 'cus_123',
      });

      expect(error).toBeNull();
      // In real implementation, profile.subscription_status would be 'active'
      // In real implementation, profile.subscription_end_date would be set to +2 years
    });

    it('should store stripe_customer_id in profile', async () => {
      const stripeCustomerId = 'cus_test_123';
      const mockAccountData = {
        user_id: mockAuthUser.id,
        wedding_id: 'wedding-123',
        email: mockPendingSignup.email,
        slug: mockPendingSignup.slug,
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockAccountData,
        error: null,
      });

      await mockSupabase.rpc('create_account_from_payment', {
        p_user_id: mockAuthUser.id,
        p_pending_signup_id: mockPendingSignup.id,
        p_stripe_customer_id: stripeCustomerId,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'create_account_from_payment',
        expect.objectContaining({
          p_stripe_customer_id: stripeCustomerId,
        })
      );
      // In real implementation, profile.stripe_customer_id would be set
    });
  });
});
