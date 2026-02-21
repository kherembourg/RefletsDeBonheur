import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { getUser: vi.fn() },
  }),
  SupabaseClient: class {},
}));

import {
  isSupabaseServiceRoleConfigured,
  getSupabaseAdminClient,
} from './server';

describe('supabase/server.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSupabaseServiceRoleConfigured', () => {
    it('returns false when env vars are not set', () => {
      vi.stubEnv('PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      expect(isSupabaseServiceRoleConfigured()).toBe(false);
      vi.unstubAllEnvs();
    });

    it('returns false when only URL is set', () => {
      vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      expect(isSupabaseServiceRoleConfigured()).toBe(false);
      vi.unstubAllEnvs();
    });

    it('returns false when only key is set', () => {
      vi.stubEnv('PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
      expect(isSupabaseServiceRoleConfigured()).toBe(false);
      vi.unstubAllEnvs();
    });

    it('returns true when both URL and service role key are set', () => {
      vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
      expect(isSupabaseServiceRoleConfigured()).toBe(true);
      vi.unstubAllEnvs();
    });
  });

  describe('getSupabaseAdminClient', () => {
    it('throws when service role key is not configured', () => {
      vi.stubEnv('PUBLIC_SUPABASE_URL', '');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      expect(() => getSupabaseAdminClient()).toThrow('Supabase service role key not configured');
      vi.unstubAllEnvs();
    });

    it('throws when only URL is configured', () => {
      vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
      expect(() => getSupabaseAdminClient()).toThrow();
      vi.unstubAllEnvs();
    });
  });
});
