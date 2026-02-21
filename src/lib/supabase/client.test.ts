import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/supabase-js before importing the module
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  }),
  SupabaseClient: class {},
}));

// Import after mocking
import {
  isSupabaseConfigured,
  getCurrentUser,
  getSession,
  signOut,
  onAuthStateChange,
} from './client';

describe('supabase/client.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSupabaseConfigured', () => {
    it('returns a boolean', () => {
      // In test environment, env vars are not set, so it returns false
      const result = isSupabaseConfigured();
      expect(typeof result).toBe('boolean');
    });

    it('returns false when env vars are not set', () => {
      // In tests, PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are not set
      expect(isSupabaseConfigured()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('returns null when Supabase is not configured', async () => {
      // In test env, isConfigured is false, so it returns null immediately
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('getSession', () => {
    it('returns null when Supabase is not configured', async () => {
      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe('signOut', () => {
    it('returns without error when Supabase is not configured', async () => {
      await expect(signOut()).resolves.toBeUndefined();
    });
  });

  describe('onAuthStateChange', () => {
    it('returns object with null subscription when not configured', () => {
      const callback = vi.fn();
      const result = onAuthStateChange(callback);
      expect(result).toEqual({ data: { subscription: null } });
    });
  });
});
