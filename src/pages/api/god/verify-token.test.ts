/**
 * Integration Tests: God Mode Verify Token Endpoint
 *
 * Tests the god mode token verification endpoint including:
 * - Token validation and verification
 * - Token expiration checks
 * - Token usage tracking
 * - Client data retrieval
 * - Error handling for invalid/malformed tokens
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './verify-token';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/api/middleware', () => ({
  apiGuards: {
    requireSupabase: vi.fn().mockReturnValue(null),
    requireServiceRole: vi.fn().mockReturnValue(null),
  },
  apiResponse: {
    success: (data: unknown) => new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  },
}));

describe('God Mode Verify Token Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== SUCCESS CASES =====
  describe('Token Verification - Success', () => {
    it('should return verified: true with valid token', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockUpdate = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'god_access_tokens') {
            if (table === 'god_access_tokens') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    gt: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: 'token-123',
                          god_admin_id: 'god-admin-123',
                          wedding_id: 'wedding-123',
                          token: 'valid-token',
                          expires_at: futureDate.toISOString(),
                          used_count: 0,
                          max_uses: 1,
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
                update: vi.fn().mockReturnValue({
                  eq: mockUpdate,
                }),
              };
            }
          }
          if (table === 'weddings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'wedding-123',
                      owner_id: 'user-123',
                      slug: 'alice-bob',
                      pin_code: 'GUEST1',
                      magic_token: 'ADMIN1',
                      name: 'Alice & Bob Wedding',
                      bride_name: 'Alice',
                      groom_name: 'Bob',
                      wedding_date: '2026-06-15',
                      config: {
                        features: { gallery: true, guestbook: true },
                        theme: { name: 'classic' },
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'user-123',
                      email: 'test@example.com',
                      subscription_status: 'active',
                      subscription_end_date: futureDate.toISOString(),
                      created_at: '2026-01-01T00:00:00Z',
                      updated_at: '2026-01-01T00:00:00Z',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'audit_log') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.client).toBeDefined();
      expect(data.client.id).toBe('user-123');
      expect(data.client.email).toBe('test@example.com');
      expect(data.client.wedding_slug).toBe('alice-bob');
    });

    it('should increment token usage counter', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockReturnValue(mockUpdate);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'god_access_tokens') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'token-123',
                        god_admin_id: 'god-admin-123',
                        wedding_id: 'wedding-123',
                        expires_at: futureDate.toISOString(),
                        used_count: 2,
                        max_uses: 5,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: mockEq,
              }),
            };
          }
          if (table === 'weddings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'wedding-123',
                      owner_id: 'user-123',
                      slug: 'test',
                      pin_code: 'PIN',
                      magic_token: 'MAGIC',
                      bride_name: 'Bride',
                      groom_name: 'Groom',
                      config: {},
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'user-123',
                      email: 'test@example.com',
                      subscription_status: 'active',
                      created_at: '2026-01-01T00:00:00Z',
                      updated_at: '2026-01-01T00:00:00Z',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'audit_log') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token' }),
      });

      await POST({ request } as any);

      expect(mockEq).toHaveBeenCalledWith('id', 'token-123');
    });
  });

  // ===== INVALID/EXPIRED TOKENS =====
  describe('Token Validation - Failures', () => {
    it('should return verified: false with invalid token', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'god_access_tokens') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Token not found' },
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Invalid or expired access token');
    });

    it('should return verified: false with expired token', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'god_access_tokens') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null, // Query filters out expired tokens
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'expired-token' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
    });

    it('should return verified: false when token exceeds max uses', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'god_access_tokens') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'token-123',
                        wedding_id: 'wedding-123',
                        expires_at: futureDate.toISOString(),
                        used_count: 5,
                        max_uses: 5, // Already used max times
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'maxed-out-token' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Access token has been used');
    });

    it('should handle malformed tokens', async () => {
      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing token
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Token is required');
    });
  });

  // ===== ERROR HANDLING =====
  describe('Error Handling', () => {
    it('should handle wedding not found', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'god_access_tokens') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'token-123',
                        wedding_id: 'wedding-123',
                        expires_at: futureDate.toISOString(),
                        used_count: 0,
                        max_uses: 1,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'weddings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Wedding not found' },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Wedding not found');
    });

    it('should handle profile not found', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'god_access_tokens') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  gt: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'token-123',
                        wedding_id: 'wedding-123',
                        expires_at: futureDate.toISOString(),
                        used_count: 0,
                        max_uses: 1,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'weddings') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'wedding-123',
                      owner_id: 'user-123',
                      slug: 'test',
                      pin_code: 'PIN',
                      magic_token: 'MAGIC',
                      bride_name: 'Bride',
                      groom_name: 'Groom',
                      config: {},
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Profile not found' },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Profile not found');
    });

    it('should handle database errors gracefully', async () => {
      const mockClient = {
        from: vi.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/verify-token', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token' }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.valid).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});
