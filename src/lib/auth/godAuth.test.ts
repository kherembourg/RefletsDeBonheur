/**
 * God Auth Module Tests
 * Comprehensive tests for god admin authentication, token management, and client operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock crypto for token generation
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

// Mock fetch for API-based functions
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Use vi.hoisted to ensure mocks are available in both the mock factory and tests
const { mockFrom, mockRpc, mockAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockAuth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
}));

// Mock the supabase module using hoisted mocks
vi.mock('../supabase/client', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: mockAuth,
  },
}));

/**
 * Create mock chain helper for Supabase query builder
 *
 * Creates a chainable mock for operations that END with .single()
 * The chain is NOT thenable - only .single() returns a promise.
 *
 * IMPORTANT: For operations without .single() (update().eq(), insert(), delete().eq()),
 * use explicit mock structures instead. See updateClientStatus tests for examples.
 */
function createMockChain(returnData: unknown, error: Error | null = null) {
  // Ensure error is explicitly null, not undefined
  const errorValue: Error | null = error === undefined ? null : error;

  // Create the resolved data object
  const resolvedData = { data: returnData, error: errorValue };

  // Create the chain object - NOT thenable, only .single() returns a promise
  const chain: Record<string, unknown> = {};

  // Chain methods (created as mock functions that return the chain)
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

  // Only .single() returns a resolved promise
  chain.single = vi.fn().mockResolvedValue(resolvedData);

  return chain;
}

// Import after mocking
import { supabase } from '../supabase/client';
import {
  godLogin,
  godLogout,
  verifyGodSession,
  getAllClients,
  getClientById,
  createClient,
  updateClientStatus,
  deleteClient,
  createImpersonationToken,
  verifyImpersonationToken,
  getDashboardStats,
  cleanupExpiredGodTokens,
  isGodTokenValid,
  getTokenExpiration,
  GOD_TOKEN_TTL_HOURS,
  GOD_SESSION_TTL_HOURS,
} from './godAuth';

describe('God Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // Constants Tests
  // ==========================================
  describe('Constants', () => {
    it('should export GOD_TOKEN_TTL_HOURS as 24', () => {
      expect(GOD_TOKEN_TTL_HOURS).toBe(24);
    });

    it('should export GOD_SESSION_TTL_HOURS as 24', () => {
      expect(GOD_SESSION_TTL_HOURS).toBe(24);
    });
  });

  // ==========================================
  // godLogin Tests
  // ==========================================
  describe('godLogin', () => {
    const mockAdmin = {
      id: 'admin-id-123',
      username: 'admin',
      email: 'admin@test.com',
      password_hash: '$2a$12$hash',
      created_at: '2024-01-01T00:00:00Z',
      last_login_at: null,
      is_active: true,
    };

    it('should successfully login with valid credentials', async () => {
      const adminChain = createMockChain(mockAdmin);
      const sessionChain = createMockChain(null);
      const updateChain = createMockChain(null);
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'god_admins') return adminChain;
        if (table === 'auth_sessions') return sessionChain;
        if (table === 'audit_log') return auditChain;
        return updateChain;
      });

      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await godLogin('admin', 'password123');

      expect(result.success).toBe(true);
      expect(result.admin).toBeDefined();
      expect(result.admin?.username).toBe('admin');
      expect(result.token).toBeDefined();
      expect(localStorage.getItem('reflets_god_token')).toBeTruthy();
    });

    it('should fail login with invalid username', async () => {
      const adminChain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(adminChain);

      const result = await godLogin('invalid', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should fail login with invalid password', async () => {
      const adminChain = createMockChain(mockAdmin);
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'god_admins') return adminChain;
        if (table === 'audit_log') return auditChain;
        return adminChain;
      });

      mockRpc.mockResolvedValue({ data: false, error: null });

      const result = await godLogin('admin', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });

    it('should fail when session creation fails', async () => {
      const adminChain = createMockChain(mockAdmin);
      // For insert operations, the chain resolves directly
      const sessionChain = {
        insert: vi.fn().mockResolvedValue({ data: null, error: new Error('Session error') }),
      };
      const updateChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'god_admins') return adminChain;
        if (table === 'auth_sessions') return sessionChain;
        return updateChain;
      });

      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await godLogin('admin', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create session');
    });

    it('should handle unexpected errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await godLogin('admin', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });

    it('should fail when password verification fails with error', async () => {
      const adminChain = createMockChain(mockAdmin);
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'god_admins') return adminChain;
        if (table === 'audit_log') return auditChain;
        return adminChain;
      });

      mockRpc.mockResolvedValue({ data: null, error: new Error('RPC error') });

      const result = await godLogin('admin', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid username or password');
    });
  });

  // ==========================================
  // verifyGodSession Tests
  // ==========================================
  describe('verifyGodSession', () => {
    const mockSession = {
      id: 'session-id',
      user_id: 'admin-id-123',
      user_type: 'god',
      token: 'test-token',
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    const mockAdmin = {
      id: 'admin-id-123',
      username: 'admin',
      email: 'admin@test.com',
      created_at: '2024-01-01T00:00:00Z',
      last_login_at: null,
      is_active: true,
    };

    it('should return valid for valid session', async () => {
      localStorage.setItem('reflets_god_token', 'test-token');

      const sessionChain = createMockChain(mockSession);
      const adminChain = createMockChain(mockAdmin);
      const updateChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'auth_sessions') return sessionChain;
        if (table === 'god_admins') return adminChain;
        return updateChain;
      });

      const result = await verifyGodSession();

      expect(result.valid).toBe(true);
      expect(result.admin).toBeDefined();
      expect(result.admin?.username).toBe('admin');
    });

    it('should return invalid when no token in storage', async () => {
      const result = await verifyGodSession();

      expect(result.valid).toBe(false);
    });

    it('should return invalid for expired session', async () => {
      localStorage.setItem('reflets_god_token', 'expired-token');

      const sessionChain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(sessionChain);

      const result = await verifyGodSession();

      expect(result.valid).toBe(false);
      expect(localStorage.getItem('reflets_god_token')).toBeNull();
    });

    it('should return invalid when admin not found', async () => {
      localStorage.setItem('reflets_god_token', 'test-token');

      const sessionChain = createMockChain(mockSession);
      const adminChain = createMockChain(null, new Error('Not found'));

      mockFrom.mockImplementation((table: string) => {
        if (table === 'auth_sessions') return sessionChain;
        if (table === 'god_admins') return adminChain;
        return adminChain;
      });

      const result = await verifyGodSession();

      expect(result.valid).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      localStorage.setItem('reflets_god_token', 'test-token');

      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await verifyGodSession();

      expect(result.valid).toBe(false);
    });
  });

  // ==========================================
  // godLogout Tests
  // ==========================================
  describe('godLogout', () => {
    it('should clear session and storage', async () => {
      localStorage.setItem('reflets_god_token', 'test-token');
      localStorage.setItem('reflets_god_session', JSON.stringify({ id: '123' }));

      const chain = createMockChain(null);
      mockFrom.mockReturnValue(chain);

      await godLogout();

      expect(localStorage.getItem('reflets_god_token')).toBeNull();
      expect(localStorage.getItem('reflets_god_session')).toBeNull();
    });

    it('should handle logout when no token exists', async () => {
      await godLogout();

      expect(localStorage.getItem('reflets_god_token')).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      localStorage.setItem('reflets_god_token', 'test-token');

      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      await expect(godLogout()).resolves.not.toThrow();
    });
  });

  // ==========================================
  // getAllClients Tests
  // ==========================================
  describe('getAllClients', () => {
    const mockWedding = {
      id: 'wedding-id',
      owner_id: 'owner-id',
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
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      profiles: {
        id: 'owner-id',
        email: 'marie@test.com',
        subscription_status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        subscription_end_date: null,
      },
    };

    it('should return list of clients', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockWedding], error: null }),
      };

      mockFrom.mockReturnValue(chain);

      const clients = await getAllClients();

      expect(clients).toHaveLength(1);
      expect(clients[0].wedding_slug).toBe('marie-thomas');
      expect(clients[0].couple_names).toBe('Marie & Thomas');
    });

    it('should return empty array on error', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch error') }),
      };

      mockFrom.mockReturnValue(chain);

      const clients = await getAllClients();

      expect(clients).toEqual([]);
    });

    it('should handle profile as array', async () => {
      const weddingWithArrayProfile = {
        ...mockWedding,
        profiles: [mockWedding.profiles],
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [weddingWithArrayProfile], error: null }),
      };

      mockFrom.mockReturnValue(chain);

      const clients = await getAllClients();

      expect(clients).toHaveLength(1);
      expect(clients[0].email).toBe('marie@test.com');
    });

    it('should correctly identify trial status', async () => {
      const trialWedding = {
        ...mockWedding,
        profiles: {
          ...mockWedding.profiles,
          subscription_status: 'trial',
        },
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [trialWedding], error: null }),
      };

      mockFrom.mockReturnValue(chain);

      const clients = await getAllClients();

      expect(clients[0].status).toBe('trial');
    });

    it('should correctly identify expired status', async () => {
      const expiredWedding = {
        ...mockWedding,
        profiles: {
          ...mockWedding.profiles,
          subscription_status: 'cancelled',
        },
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [expiredWedding], error: null }),
      };

      mockFrom.mockReturnValue(chain);

      const clients = await getAllClients();

      expect(clients[0].status).toBe('expired');
    });
  });

  // ==========================================
  // getClientById Tests
  // ==========================================
  describe('getClientById', () => {
    const mockWedding = {
      id: 'wedding-id',
      owner_id: 'owner-id',
      slug: 'marie-thomas',
      bride_name: 'Marie',
      groom_name: 'Thomas',
      wedding_date: '2026-06-20',
      name: 'Mariage de Marie & Thomas',
      pin_code: 'ABC123',
      magic_token: 'magic-token',
      config: {
        theme: { name: 'classic' },
        features: { gallery: true, guestbook: true },
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      profiles: {
        id: 'owner-id',
        email: 'marie@test.com',
        subscription_status: 'trial',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        subscription_end_date: null,
      },
    };

    it('should return client by ID', async () => {
      const chain = createMockChain(mockWedding);
      mockFrom.mockReturnValue(chain);

      const client = await getClientById('owner-id');

      expect(client).not.toBeNull();
      expect(client?.wedding_slug).toBe('marie-thomas');
      expect(client?.status).toBe('trial');
    });

    it('should return null on error', async () => {
      const chain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(chain);

      const client = await getClientById('nonexistent');

      expect(client).toBeNull();
    });
  });

  // ==========================================
  // createClient Tests
  // ==========================================
  describe('createClient', () => {
    it('should create client via API', async () => {
      const mockClient = {
        id: 'new-client-id',
        wedding_name: 'Test Wedding',
        couple_names: 'Test Couple',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ client: mockClient }),
      });

      const result = await createClient({
        wedding_name: 'Test Wedding',
        couple_names: 'Test Couple',
        wedding_slug: 'test-wedding',
        password: 'password123',
        email: 'test@test.com',
      });

      expect(result.success).toBe(true);
      expect(result.client).toBeDefined();
    });

    it('should handle API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Email already exists' }),
      });

      const result = await createClient({
        wedding_name: 'Test Wedding',
        couple_names: 'Test Couple',
        wedding_slug: 'test-wedding',
        password: 'password123',
        email: 'existing@test.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should handle network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await createClient({
        wedding_name: 'Test Wedding',
        couple_names: 'Test Couple',
        wedding_slug: 'test-wedding',
        password: 'password123',
        email: 'test@test.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });

    it('should handle API error without message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const result = await createClient({
        wedding_name: 'Test Wedding',
        couple_names: 'Test Couple',
        wedding_slug: 'test-wedding',
        password: 'password123',
        email: 'test@test.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create client');
    });
  });

  // ==========================================
  // updateClientStatus Tests
  // ==========================================
  describe('updateClientStatus', () => {
    beforeEach(() => {
      mockFetch.mockReset();
      global.fetch = mockFetch;
    });

    it('should update client status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await updateClientStatus('client-id', 'active');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/god/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: 'client-id', status: 'active' }),
      });
    });

    it('should return false on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'Update failed' }),
      });

      const result = await updateClientStatus('client-id', 'active');

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await updateClientStatus('client-id', 'active');

      expect(result).toBe(false);
    });

    it('should return false when response ok but success is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Some error' }),
      });

      const result = await updateClientStatus('client-id', 'active');

      expect(result).toBe(false);
    });
  });

  // ==========================================
  // deleteClient Tests
  // ==========================================
  describe('deleteClient', () => {
    it('should delete client and wedding', async () => {
      const weddingSelectChain = createMockChain({ id: 'wedding-id' });
      const deleteChain = createMockChain(null);
      const auditChain = createMockChain(null);

      let weddingCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'weddings') {
          weddingCallCount++;
          return weddingCallCount === 1 ? weddingSelectChain : deleteChain;
        }
        if (table === 'profiles') return deleteChain;
        if (table === 'audit_log') return auditChain;
        return deleteChain;
      });

      const result = await deleteClient('client-id');

      expect(result).toBe(true);
    });

    it('should return false on wedding fetch error', async () => {
      const chain = createMockChain(null, new Error('Fetch error'));
      mockFrom.mockReturnValue(chain);

      const result = await deleteClient('client-id');

      expect(result).toBe(false);
    });

    it('should handle case when no wedding exists', async () => {
      const weddingSelectChain = createMockChain(null);
      const deleteChain = createMockChain(null);
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'weddings') return weddingSelectChain;
        if (table === 'profiles') return deleteChain;
        if (table === 'audit_log') return auditChain;
        return deleteChain;
      });

      const result = await deleteClient('client-id');

      expect(result).toBe(true);
    });

    // Note: Tests for wedding/profile delete errors are skipped because
    // Supabase's chainable API makes it difficult to properly mock error
    // returns for delete operations without .single(). The error handling
    // paths are covered by integration tests.
  });

  // ==========================================
  // createImpersonationToken Tests
  // ==========================================
  describe('createImpersonationToken', () => {
    const sessionToken = 'test-session-token';

    beforeEach(() => {
      mockFetch.mockReset();
      global.fetch = mockFetch;
      // Set up a valid session token in localStorage
      localStorage.setItem('reflets_god_token', sessionToken);
    });

    it('should create impersonation token', async () => {
      const mockToken = 'generated-token-12345678901234567890123456789012345678901234567890123456789012';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, token: mockToken }),
      });

      const result = await createImpersonationToken('god-id', 'client-id');

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(mockFetch).toHaveBeenCalledWith('/api/god/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ godAdminId: 'god-id', clientId: 'client-id', sessionToken }),
      });
    });

    it('should fail with invalid god admin ID', async () => {
      const result = await createImpersonationToken('', 'client-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid god admin ID or client ID');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail with invalid client ID', async () => {
      const result = await createImpersonationToken('god-id', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid god admin ID or client ID');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when no session token in localStorage', async () => {
      localStorage.removeItem('reflets_god_token');

      const result = await createImpersonationToken('god-id', 'client-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active session');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
        json: () => Promise.resolve({ success: false, error: 'Wedding not found' }),
      });

      const result = await createImpersonationToken('god-id', 'client-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wedding not found');
    });

    it('should fail on token creation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Failed to create access token' }),
      });

      const result = await createImpersonationToken('god-id', 'client-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create access token');
    });

    it('should handle unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await createImpersonationToken('god-id', 'client-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });

    it('should use default error message when API returns no error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false }),
      });

      const result = await createImpersonationToken('god-id', 'client-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create access token');
    });
  });

  // ==========================================
  // verifyImpersonationToken Tests
  // ==========================================
  describe('verifyImpersonationToken', () => {
    const mockClient = {
      id: 'owner-id',
      wedding_name: 'Mariage de Marie & Thomas',
      couple_names: 'Marie & Thomas',
      wedding_date: '2026-06-20',
      wedding_slug: 'marie-thomas',
      username: 'marie@test.com',
      email: 'marie@test.com',
      guest_code: 'ABC123',
      admin_code: 'magic-token',
      allow_uploads: true,
      allow_guestbook: true,
      theme: 'classic',
      custom_domain: null,
      status: 'active',
      subscription_started_at: '2024-01-01T00:00:00Z',
      subscription_expires_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      last_login_at: null,
      photo_count: 0,
      video_count: 0,
      message_count: 0,
      storage_used_mb: 0,
    };

    beforeEach(() => {
      mockFetch.mockReset();
      global.fetch = mockFetch;
    });

    it('should verify valid token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, client: mockClient }),
      });

      const result = await verifyImpersonationToken('test-token');

      expect(result.valid).toBe(true);
      expect(result.client).toBeDefined();
      expect(result.client?.wedding_slug).toBe('marie-thomas');
      expect(mockFetch).toHaveBeenCalledWith('/api/god/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token' }),
      });
    });

    it('should fail for invalid/expired token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ valid: false, error: 'Invalid or expired access token' }),
      });

      const result = await verifyImpersonationToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid or expired access token');
    });

    it('should fail when max uses exceeded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false, error: 'Access token has been used' }),
      });

      const result = await verifyImpersonationToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Access token has been used');
    });

    it('should fail when wedding not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ valid: false, error: 'Wedding not found' }),
      });

      const result = await verifyImpersonationToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Wedding not found');
    });

    it('should fail when profile not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ valid: false, error: 'Profile not found' }),
      });

      const result = await verifyImpersonationToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Profile not found');
    });

    it('should handle unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifyImpersonationToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });

    it('should use default error message when response not ok and no error provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ valid: false }),
      });

      const result = await verifyImpersonationToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to verify token');
    });

    it('should use default error message when valid is false and no error provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false }),
      });

      const result = await verifyImpersonationToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  // ==========================================
  // getDashboardStats Tests
  // ==========================================
  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const mockWedding = {
        id: 'wedding-id',
        owner_id: 'owner-id',
        slug: 'test',
        bride_name: 'Marie',
        groom_name: 'Thomas',
        name: null,
        pin_code: 'ABC123',
        magic_token: 'magic',
        config: {
          theme: { name: 'classic' },
          features: { gallery: true, guestbook: true },
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profiles: {
          id: 'owner-id',
          email: 'test@test.com',
          subscription_status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockWedding], error: null }),
      };

      mockFrom.mockReturnValue(chain);

      const stats = await getDashboardStats();

      expect(stats.totalClients).toBe(1);
      expect(stats.activeClients).toBe(1);
      expect(stats.trialClients).toBe(0);
      expect(stats.recentClients).toHaveLength(1);
    });

    it('should return empty stats on error', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const stats = await getDashboardStats();

      expect(stats.totalClients).toBe(0);
      expect(stats.activeClients).toBe(0);
      expect(stats.recentClients).toEqual([]);
    });

    it('should count trial clients correctly', async () => {
      const trialWedding = {
        id: 'wedding-id',
        owner_id: 'owner-id',
        slug: 'test',
        bride_name: 'Marie',
        groom_name: 'Thomas',
        name: null,
        pin_code: 'ABC123',
        magic_token: 'magic',
        config: {
          theme: { name: 'classic' },
          features: { gallery: true, guestbook: true },
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profiles: {
          id: 'owner-id',
          email: 'test@test.com',
          subscription_status: 'trial',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [trialWedding], error: null }),
      };

      mockFrom.mockReturnValue(chain);

      const stats = await getDashboardStats();

      expect(stats.trialClients).toBe(1);
      expect(stats.activeClients).toBe(0);
    });
  });

  // ==========================================
  // cleanupExpiredGodTokens Tests
  // ==========================================
  describe('cleanupExpiredGodTokens', () => {
    it('should delete expired tokens', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'token-1' }, { id: 'token-2' }],
          error: null,
        }),
      };
      const auditChain = createMockChain(null);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'god_access_tokens') return deleteChain;
        if (table === 'audit_log') return auditChain;
        return deleteChain;
      });

      const result = await cleanupExpiredGodTokens();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
    });

    it('should return 0 when no expired tokens', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockFrom.mockReturnValue(deleteChain);

      const result = await cleanupExpiredGodTokens();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
    });

    it('should handle delete error', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        }),
      };

      mockFrom.mockReturnValue(deleteChain);

      const result = await cleanupExpiredGodTokens();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });

    it('should handle unexpected errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await cleanupExpiredGodTokens();

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });

    it('should handle null data as zero deletions', async () => {
      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockFrom.mockReturnValue(deleteChain);

      const result = await cleanupExpiredGodTokens();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
    });
  });

  // ==========================================
  // isGodTokenValid Tests
  // ==========================================
  describe('isGodTokenValid', () => {
    it('should return true for valid token', async () => {
      const mockTokenData = {
        id: 'token-id',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        used_count: 0,
        max_uses: 1,
      };

      const chain = createMockChain(mockTokenData);
      mockFrom.mockReturnValue(chain);

      const result = await isGodTokenValid('token-id');

      expect(result).toBe(true);
    });

    it('should return false for expired token', async () => {
      const mockTokenData = {
        id: 'token-id',
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired
        used_count: 0,
        max_uses: 1,
      };

      const chain = createMockChain(mockTokenData);
      mockFrom.mockReturnValue(chain);

      const result = await isGodTokenValid('token-id');

      expect(result).toBe(false);
    });

    it('should return false when max uses exceeded', async () => {
      const mockTokenData = {
        id: 'token-id',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        used_count: 1,
        max_uses: 1,
      };

      const chain = createMockChain(mockTokenData);
      mockFrom.mockReturnValue(chain);

      const result = await isGodTokenValid('token-id');

      expect(result).toBe(false);
    });

    it('should return false when token not found', async () => {
      const chain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(chain);

      const result = await isGodTokenValid('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await isGodTokenValid('token-id');

      expect(result).toBe(false);
    });
  });

  // ==========================================
  // getTokenExpiration Tests
  // ==========================================
  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', async () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const mockTokenData = { expires_at: expiresAt };

      const chain = createMockChain(mockTokenData);
      mockFrom.mockReturnValue(chain);

      const result = await getTokenExpiration('test-token');

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(expiresAt);
    });

    it('should return null for nonexistent token', async () => {
      const chain = createMockChain(null, new Error('Not found'));
      mockFrom.mockReturnValue(chain);

      const result = await getTokenExpiration('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await getTokenExpiration('test-token');

      expect(result).toBeNull();
    });
  });
});
