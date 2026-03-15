import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCrypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let index = 0; index < arr.length; index += 1) {
      arr[index] = index;
    }
    return arr;
  },
  randomUUID: () => 'test-uuid-1234',
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

vi.mock('../supabase/client', () => {
  const mockFrom = vi.fn();
  const mockAuth = {
    signInWithPassword: vi.fn(),
    getUser: vi.fn(),
    signOut: vi.fn(),
  };

  return {
    supabase: {
      from: mockFrom,
      auth: mockAuth,
    },
  };
});

import { supabase } from '../supabase/client';
import {
  clientLogin,
  guestLogin,
  verifyClientSession,
  verifyGuestSession,
  refreshClientToken,
  clientLogout,
  guestLogout,
  getCurrentSessionType,
  getCurrentSession,
} from './clientAuth';

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockAuth = supabase.auth as unknown as {
  signInWithPassword: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

function createMockChain<T>(returnData: T, error: Error | null = null) {
  const resolvedValue = { data: returnData, error };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);

  return chain;
}

describe('clientAuth', () => {
  const mockUser = { id: 'user-id-123' };
  const mockProfile = {
    id: 'user-id-123',
    email: 'client@test.com',
    subscription_status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    subscription_end_date: null,
  };
  const mockWedding = {
    id: 'wedding-id',
    owner_id: 'user-id-123',
    slug: 'marie-thomas',
    bride_name: 'Marie',
    groom_name: 'Thomas',
    wedding_date: '2026-06-20',
    name: null,
    pin_code: 'ABC123',
    magic_token: 'ADMIN99',
    config: {
      theme: { name: 'classic' },
      features: { gallery: true, guestbook: true },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    mockAuth.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('clientLogin', () => {
    it('stores only session metadata after a successful login', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'supabase-access-token' } },
        error: null,
      });

      const profileChain = createMockChain(mockProfile);
      const weddingChain = createMockChain(mockWedding);
      const auditChain = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'weddings') return weddingChain;
        if (table === 'audit_log') return auditChain;
        return profileChain;
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          session: {
            client_id: mockProfile.id,
            wedding_name: 'Mariage de Marie & Thomas',
            couple_names: 'Marie & Thomas',
            wedding_slug: mockWedding.slug,
            is_admin: true,
          },
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.client?.email).toBe('client@test.com');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/client-session',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer supabase-access-token',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(localStorage.getItem('reflets_client_token')).toBeNull();
      expect(localStorage.getItem('reflets_client_session')).toContain('"wedding_slug":"marie-thomas"');
    });

    it('fails for invalid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid credentials'),
      });

      const auditChain = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      mockFrom.mockImplementation((table: string) => {
        if (table === 'audit_log') return auditChain;
        return createMockChain(null);
      });

      const result = await clientLogin('invalid@test.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('fails when profile is missing', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'supabase-access-token' } },
        error: null,
      });
      mockFrom.mockReturnValue(createMockChain(null, new Error('Not found')));

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
    });

    it('fails when subscription is inactive', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'supabase-access-token' } },
        error: null,
      });
      mockFrom.mockReturnValue(createMockChain({ ...mockProfile, subscription_status: 'cancelled' }));

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is suspended or expired');
    });

    it('fails when subscription is expired', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'supabase-access-token' } },
        error: null,
      });

      const profileChain = createMockChain({
        ...mockProfile,
        subscription_end_date: '2020-01-01T00:00:00Z',
      });
      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return { ...profileChain, ...updateChain };
        return profileChain;
      });

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription has expired');
    });

    it('fails when wedding is missing', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'supabase-access-token' } },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return createMockChain(mockProfile);
        if (table === 'weddings') return createMockChain(null, new Error('Not found'));
        return createMockChain(null);
      });

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wedding not found');
    });

    it('signs out when server session creation fails', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'supabase-access-token' } },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return createMockChain(mockProfile);
        if (table === 'weddings') return createMockChain(mockWedding);
        return createMockChain(null);
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Failed to create session' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create session');
      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('guestLogin', () => {
    it('stores only guest session metadata for guest access', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          wedding_id: mockWedding.id,
          wedding_slug: mockWedding.slug,
          access_type: 'guest',
          guest_name: 'John',
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await guestLogin('ABC123', 'John');

      expect(result.success).toBe(true);
      expect(result.accessType).toBe('guest');
      expect(result.weddingSlug).toBe('marie-thomas');
      expect(localStorage.getItem('reflets_guest_token')).toBeNull();
      expect(localStorage.getItem('reflets_guest_session')).toContain('"guest_name":"John"');
    });

    it('stores admin access as guest-session metadata', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          wedding_id: mockWedding.id,
          wedding_slug: mockWedding.slug,
          access_type: 'admin',
          guest_name: null,
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await guestLogin('ADMIN99');

      expect(result.success).toBe(true);
      expect(result.accessType).toBe('admin');
      expect(result.weddingSlug).toBe('marie-thomas');
    });

    it('returns API errors for invalid codes', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid access code.' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await guestLogin('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid access code.');
    });

    it('handles network errors gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await guestLogin('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  describe('verifyClientSession', () => {
    it('hydrates session metadata from the server cookie-backed session', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          session: {
            client_id: mockProfile.id,
            wedding_name: 'Mariage de Marie & Thomas',
            couple_names: 'Marie & Thomas',
            wedding_slug: mockWedding.slug,
            is_admin: true,
          },
        }),
      }));

      const result = await verifyClientSession();

      expect(result.valid).toBe(true);
      expect(result.session?.wedding_slug).toBe('marie-thomas');
      expect(localStorage.getItem('reflets_client_session')).toContain('"client_id":"user-id-123"');
    });

    it('clears legacy and cached storage when session is invalid', async () => {
      localStorage.setItem('reflets_client_token', 'legacy-token');
      localStorage.setItem('reflets_client_session', JSON.stringify({ client_id: 'cached' }));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ valid: false }),
      }));

      const result = await verifyClientSession();

      expect(result.valid).toBe(false);
      expect(localStorage.getItem('reflets_client_token')).toBeNull();
      expect(localStorage.getItem('reflets_client_session')).toBeNull();
    });
  });

  describe('verifyGuestSession', () => {
    it('hydrates guest session metadata from the server cookie-backed session', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          session: {
            client_id: mockWedding.id,
            wedding_slug: mockWedding.slug,
            access_type: 'guest',
            guest_name: 'John',
          },
        }),
      }));

      const result = await verifyGuestSession();

      expect(result.valid).toBe(true);
      expect(result.session?.guest_name).toBe('John');
      expect(localStorage.getItem('reflets_guest_session')).toContain('"guest_name":"John"');
    });

    it('clears legacy and cached guest storage when session is invalid', async () => {
      localStorage.setItem('reflets_guest_token', 'legacy-token');
      localStorage.setItem('reflets_guest_session', JSON.stringify({ client_id: 'cached' }));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ valid: false }),
      }));

      const result = await verifyGuestSession();

      expect(result.valid).toBe(false);
      expect(localStorage.getItem('reflets_guest_token')).toBeNull();
      expect(localStorage.getItem('reflets_guest_session')).toBeNull();
    });
  });

  describe('refreshClientToken', () => {
    it('returns the migration error message', async () => {
      const result = await refreshClientToken('refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh token flow has been replaced by HttpOnly session cookies.');
    });
  });

  describe('clientLogout', () => {
    it('clears cached state and calls the cookie session revoke endpoint', async () => {
      localStorage.setItem('reflets_client_token', 'legacy-token');
      localStorage.setItem('reflets_client_session', JSON.stringify({ client_id: '123' }));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

      await clientLogout();

      expect(fetch).toHaveBeenCalledWith('/api/auth/client-session', { method: 'DELETE' });
      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('reflets_client_token')).toBeNull();
      expect(localStorage.getItem('reflets_client_session')).toBeNull();
    });
  });

  describe('guestLogout', () => {
    it('clears cached state and calls the guest session revoke endpoint', async () => {
      localStorage.setItem('reflets_guest_token', 'legacy-token');
      localStorage.setItem('reflets_guest_session', JSON.stringify({ client_id: '123' }));
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

      await guestLogout();

      expect(fetch).toHaveBeenCalledWith('/api/auth/guest-session', { method: 'DELETE' });
      expect(localStorage.getItem('reflets_guest_token')).toBeNull();
      expect(localStorage.getItem('reflets_guest_session')).toBeNull();
    });
  });

  describe('getCurrentSessionType', () => {
    it('returns client when a client session is cached', () => {
      localStorage.setItem('reflets_client_session', JSON.stringify({ client_id: 'client-id' }));

      expect(getCurrentSessionType()).toBe('client');
    });

    it('returns guest when only a guest session is cached', () => {
      localStorage.setItem('reflets_guest_session', JSON.stringify({ client_id: 'guest-id' }));

      expect(getCurrentSessionType()).toBe('guest');
    });

    it('prioritizes client sessions over guest sessions', () => {
      localStorage.setItem('reflets_client_session', JSON.stringify({ client_id: 'client-id' }));
      localStorage.setItem('reflets_guest_session', JSON.stringify({ client_id: 'guest-id' }));

      expect(getCurrentSessionType()).toBe('client');
    });
  });

  describe('getCurrentSession', () => {
    it('returns the cached client session', () => {
      const clientSession = {
        client_id: 'user-id',
        wedding_name: 'Test Wedding',
        couple_names: 'Marie & Thomas',
        wedding_slug: 'marie-thomas',
        is_admin: true,
      };
      localStorage.setItem('reflets_client_session', JSON.stringify(clientSession));

      expect(getCurrentSession()).toEqual(clientSession);
    });

    it('falls back to the cached guest session', () => {
      const guestSession = {
        client_id: 'wedding-id',
        wedding_slug: 'marie-thomas',
        access_type: 'guest',
        guest_name: 'John',
      };
      localStorage.setItem('reflets_guest_session', JSON.stringify(guestSession));

      expect(getCurrentSession()).toEqual(guestSession);
    });
  });
});
