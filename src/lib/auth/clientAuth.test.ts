/**
 * Client Auth Module Tests
 * Comprehensive tests for client/guest authentication and session management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock crypto
const mockCrypto = {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
  randomUUID: () => 'test-uuid-1234',
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock Supabase
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

// Import after mocking
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

// Helper to create mock chain
function createMockChain(returnData: unknown, error: Error | null = null) {
  const mockResolvedValue = { data: returnData, error };

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(mockResolvedValue);

  return chain;
}

describe('Client Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // clientLogin Tests
  // ==========================================
  describe('clientLogin', () => {
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
      magic_token: 'magic-token',
      config: {
        theme: { name: 'classic' },
        features: { gallery: true, guestbook: true },
      },
    };

    it('should successfully login with valid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const profileChain = createMockChain(mockProfile);
      const weddingChain = createMockChain(mockWedding);
      const sessionChain = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'weddings') return weddingChain;
        if (table === 'auth_sessions') return sessionChain;
        if (table === 'audit_log') return auditChain;
        return profileChain;
      });

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.client).toBeDefined();
      expect(result.client?.email).toBe('client@test.com');
      expect(result.token).toBeDefined();
      expect(localStorage.getItem('reflets_client_token')).toBeTruthy();
    });

    it('should fail login with invalid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid credentials'),
      });

      const auditChain = createMockChain(null);
      mockFrom.mockReturnValue(auditChain);

      const result = await clientLogin('invalid@test.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should fail when profile not found', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const profileChain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(profileChain);

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
    });

    it('should fail when subscription is not active', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const inactiveProfile = { ...mockProfile, subscription_status: 'cancelled' };
      const profileChain = createMockChain(inactiveProfile);

      mockFrom.mockReturnValue(profileChain);

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is suspended or expired');
    });

    it('should fail when subscription is expired', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const expiredProfile = {
        ...mockProfile,
        subscription_end_date: '2020-01-01T00:00:00Z',
      };
      const profileChain = createMockChain(expiredProfile);
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

    it('should fail when wedding not found', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const profileChain = createMockChain(mockProfile);
      const weddingChain = createMockChain(null, new Error('Not found'));

      mockFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileChain;
        if (table === 'weddings') return weddingChain;
        return profileChain;
      });

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wedding not found');
    });

    it('should handle unexpected errors', async () => {
      mockAuth.signInWithPassword.mockRejectedValue(new Error('Network error'));

      const result = await clientLogin('client@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  // ==========================================
  // guestLogin Tests
  // ==========================================
  describe('guestLogin', () => {
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

    const mockProfile = {
      id: 'user-id-123',
      email: 'client@test.com',
      subscription_status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      subscription_end_date: null,
    };

    it('should successfully login with guest PIN code', async () => {
      const weddingChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [mockWedding], error: null }),
      };
      const profileChain = createMockChain(mockProfile);
      const sessionChain = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'weddings') return weddingChain;
        if (table === 'profiles') return profileChain;
        if (table === 'guest_sessions') return sessionChain;
        if (table === 'audit_log') return auditChain;
        return profileChain;
      });

      const result = await guestLogin('ABC123', 'John');

      expect(result.success).toBe(true);
      expect(result.accessType).toBe('guest');
      expect(result.token).toBeDefined();
      expect(localStorage.getItem('reflets_guest_token')).toBeTruthy();
    });

    it('should successfully login with admin magic token', async () => {
      const weddingChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [mockWedding], error: null }),
      };
      const profileChain = createMockChain(mockProfile);
      const sessionChain = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'weddings') return weddingChain;
        if (table === 'profiles') return profileChain;
        if (table === 'guest_sessions') return sessionChain;
        if (table === 'audit_log') return auditChain;
        return profileChain;
      });

      const result = await guestLogin('ADMIN99');

      expect(result.success).toBe(true);
      expect(result.accessType).toBe('admin');
    });

    it('should fail with invalid access code', async () => {
      const weddingChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockFrom.mockReturnValue(weddingChain);

      const result = await guestLogin('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid access code');
    });

    it('should fail when wedding space is not available', async () => {
      const inactiveProfile = { ...mockProfile, subscription_status: 'cancelled' };
      const weddingChain = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [mockWedding], error: null }),
      };
      const profileChain = createMockChain(inactiveProfile);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'weddings') return weddingChain;
        if (table === 'profiles') return profileChain;
        return profileChain;
      });

      const result = await guestLogin('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('This wedding space is not available');
    });

    it('should handle errors gracefully', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await guestLogin('ABC123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  // ==========================================
  // verifyClientSession Tests
  // ==========================================
  describe('verifyClientSession', () => {
    const mockSession = {
      id: 'session-id',
      user_id: 'user-id-123',
      user_type: 'client',
      token: 'test-token',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

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
      name: null,
      config: {
        theme: { name: 'classic' },
        features: { gallery: true, guestbook: true },
      },
    };

    it('should return valid for valid session', async () => {
      localStorage.setItem('reflets_client_token', 'test-token');
      localStorage.setItem('reflets_client_session', JSON.stringify({
        client_id: 'user-id-123',
        wedding_name: 'Test Wedding',
        couple_names: 'Marie & Thomas',
        wedding_slug: 'marie-thomas',
        is_admin: true,
      }));

      const sessionChain = createMockChain(mockSession);
      const profileChain = createMockChain(mockProfile);
      const weddingChain = createMockChain(mockWedding);
      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'auth_sessions') return { ...sessionChain, ...updateChain };
        if (table === 'profiles') return profileChain;
        if (table === 'weddings') return weddingChain;
        return sessionChain;
      });

      const result = await verifyClientSession();

      expect(result.valid).toBe(true);
      expect(result.client).toBeDefined();
    });

    it('should return invalid when no token in storage', async () => {
      const result = await verifyClientSession();

      expect(result.valid).toBe(false);
    });

    it('should return invalid for expired/invalid session', async () => {
      localStorage.setItem('reflets_client_token', 'expired-token');

      const sessionChain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(sessionChain);

      const result = await verifyClientSession();

      expect(result.valid).toBe(false);
      expect(localStorage.getItem('reflets_client_token')).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      localStorage.setItem('reflets_client_token', 'test-token');

      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await verifyClientSession();

      expect(result.valid).toBe(false);
    });
  });

  // ==========================================
  // verifyGuestSession Tests
  // ==========================================
  describe('verifyGuestSession', () => {
    const mockGuestSession = {
      id: 'session-id',
      wedding_id: 'wedding-id',
      session_token: 'guest-token',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    const mockWedding = {
      id: 'wedding-id',
      owner_id: 'user-id-123',
      slug: 'marie-thomas',
      bride_name: 'Marie',
      groom_name: 'Thomas',
      name: null,
      config: {
        theme: { name: 'classic' },
        features: { gallery: true, guestbook: true },
      },
    };

    const mockProfile = {
      id: 'user-id-123',
      email: 'client@test.com',
      subscription_status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      subscription_end_date: null,
    };

    it('should return valid for valid guest session', async () => {
      localStorage.setItem('reflets_guest_token', 'guest-token');
      localStorage.setItem('reflets_guest_session', JSON.stringify({
        client_id: 'user-id-123',
        wedding_slug: 'marie-thomas',
        access_type: 'guest',
        guest_name: 'John',
      }));

      const sessionChain = createMockChain(mockGuestSession);
      const weddingChain = createMockChain(mockWedding);
      const profileChain = createMockChain(mockProfile);
      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'guest_sessions') return { ...sessionChain, ...updateChain };
        if (table === 'weddings') return weddingChain;
        if (table === 'profiles') return profileChain;
        return sessionChain;
      });

      const result = await verifyGuestSession();

      expect(result.valid).toBe(true);
      expect(result.session?.guest_name).toBe('John');
    });

    it('should return invalid when no token in storage', async () => {
      const result = await verifyGuestSession();

      expect(result.valid).toBe(false);
    });

    it('should return invalid for expired session', async () => {
      localStorage.setItem('reflets_guest_token', 'expired-token');

      const sessionChain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(sessionChain);

      const result = await verifyGuestSession();

      expect(result.valid).toBe(false);
      expect(localStorage.getItem('reflets_guest_token')).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      localStorage.setItem('reflets_guest_token', 'guest-token');

      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await verifyGuestSession();

      expect(result.valid).toBe(false);
    });
  });

  // ==========================================
  // refreshClientToken Tests
  // ==========================================
  describe('refreshClientToken', () => {
    const mockSession = {
      id: 'session-id',
      user_id: 'user-id-123',
      user_type: 'client',
      refresh_token: 'refresh-token',
      refresh_expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
    };

    it('should refresh token successfully', async () => {
      const sessionChain = createMockChain(mockSession);
      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };

      mockFrom.mockImplementation(() => {
        return { ...sessionChain, ...updateChain };
      });

      const result = await refreshClientToken('refresh-token');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const sessionChain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(sessionChain);

      const result = await refreshClientToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });

    it('should handle errors gracefully', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await refreshClientToken('refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });

  // ==========================================
  // clientLogout Tests
  // ==========================================
  describe('clientLogout', () => {
    it('should clear session and storage', async () => {
      localStorage.setItem('reflets_client_token', 'test-token');
      localStorage.setItem('reflets_client_session', JSON.stringify({ id: '123' }));

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockFrom.mockReturnValue(updateChain);

      await clientLogout();

      expect(localStorage.getItem('reflets_client_token')).toBeNull();
      expect(localStorage.getItem('reflets_client_session')).toBeNull();
    });

    it('should handle logout when no token exists', async () => {
      await clientLogout();

      expect(localStorage.getItem('reflets_client_token')).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      localStorage.setItem('reflets_client_token', 'test-token');

      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      await expect(clientLogout()).resolves.not.toThrow();
    });
  });

  // ==========================================
  // guestLogout Tests
  // ==========================================
  describe('guestLogout', () => {
    it('should clear session and storage', async () => {
      localStorage.setItem('reflets_guest_token', 'guest-token');
      localStorage.setItem('reflets_guest_session', JSON.stringify({ id: '123' }));

      const deleteChain = {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      mockFrom.mockReturnValue(deleteChain);

      await guestLogout();

      expect(localStorage.getItem('reflets_guest_token')).toBeNull();
      expect(localStorage.getItem('reflets_guest_session')).toBeNull();
    });

    it('should handle logout when no token exists', async () => {
      await guestLogout();

      expect(localStorage.getItem('reflets_guest_token')).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      localStorage.setItem('reflets_guest_token', 'guest-token');

      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      await expect(guestLogout()).resolves.not.toThrow();
    });
  });

  // ==========================================
  // getCurrentSessionType Tests
  // ==========================================
  describe('getCurrentSessionType', () => {
    it('should return "client" when client token exists', () => {
      localStorage.setItem('reflets_client_token', 'client-token');

      const result = getCurrentSessionType();

      expect(result).toBe('client');
    });

    it('should return "guest" when only guest token exists', () => {
      localStorage.setItem('reflets_guest_token', 'guest-token');

      const result = getCurrentSessionType();

      expect(result).toBe('guest');
    });

    it('should return null when no tokens exist', () => {
      const result = getCurrentSessionType();

      expect(result).toBeNull();
    });

    it('should prioritize client over guest', () => {
      localStorage.setItem('reflets_client_token', 'client-token');
      localStorage.setItem('reflets_guest_token', 'guest-token');

      const result = getCurrentSessionType();

      expect(result).toBe('client');
    });
  });

  // ==========================================
  // getCurrentSession Tests
  // ==========================================
  describe('getCurrentSession', () => {
    it('should return client session when available', () => {
      const clientSession = {
        client_id: 'user-id',
        wedding_name: 'Test Wedding',
        couple_names: 'Marie & Thomas',
        wedding_slug: 'marie-thomas',
        is_admin: true,
      };
      localStorage.setItem('reflets_client_session', JSON.stringify(clientSession));

      const result = getCurrentSession();

      expect(result).toEqual(clientSession);
    });

    it('should return guest session when no client session', () => {
      const guestSession = {
        client_id: 'user-id',
        wedding_slug: 'marie-thomas',
        access_type: 'guest',
        guest_name: 'John',
      };
      localStorage.setItem('reflets_guest_session', JSON.stringify(guestSession));

      const result = getCurrentSession();

      expect(result).toEqual(guestSession);
    });

    it('should return null when no sessions exist', () => {
      const result = getCurrentSession();

      expect(result).toBeNull();
    });

    it('should prioritize client over guest session', () => {
      const clientSession = {
        client_id: 'user-id',
        wedding_name: 'Test Wedding',
        couple_names: 'Marie & Thomas',
        wedding_slug: 'marie-thomas',
        is_admin: true,
      };
      const guestSession = {
        client_id: 'user-id',
        wedding_slug: 'marie-thomas',
        access_type: 'guest',
      };
      localStorage.setItem('reflets_client_session', JSON.stringify(clientSession));
      localStorage.setItem('reflets_guest_session', JSON.stringify(guestSession));

      const result = getCurrentSession();

      expect(result).toEqual(clientSession);
    });
  });
});
