/**
 * Integration Tests: God Mode Create Token Endpoint
 *
 * Tests the god mode token creation endpoint including:
 * - Token generation with valid god admin credentials
 * - Session validation and authentication
 * - Token expiration settings
 * - Authorization checks
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './create-token';

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

describe('God Mode Create Token Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== SUCCESS CASES =====
  describe('Token Creation - Success', () => {
    it('should create god token with valid credentials', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: {
                            user_id: 'god-admin-123',
                            user_type: 'god',
                            expires_at: futureDate.toISOString(),
                          },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'god_admins') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'god-admin-123' },
                    error: null,
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
                    data: { id: 'wedding-123' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'god_access_tokens') {
            return { insert: mockInsert };
          }
          if (table === 'audit_log') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          godAdminId: 'god-admin-123',
          clientId: 'client-123',
          sessionToken: 'valid-session-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.token.length).toBeGreaterThan(0);
    });

    it('should set token expiration to 24 hours', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 48); // Valid session

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: {
                            user_id: 'god-admin-123',
                            user_type: 'god',
                            expires_at: futureDate.toISOString(),
                          },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'god_admins') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'god-admin-123' },
                    error: null,
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
                    data: { id: 'wedding-123' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'god_access_tokens') {
            return { insert: mockInsert };
          }
          if (table === 'audit_log') {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        body: JSON.stringify({
          godAdminId: 'god-admin-123',
          clientId: 'client-123',
          sessionToken: 'valid-token',
        }),
      });

      await POST({ request } as any);

      expect(mockInsert).toHaveBeenCalled();
      const insertCall = mockInsert.mock.calls[0][0];
      
      // Verify expiration is approximately 24 hours from now
      const expiresAt = new Date(insertCall.expires_at);
      const expectedExpiration = new Date();
      expectedExpiration.setHours(expectedExpiration.getHours() + 24);
      
      const diffHours = Math.abs(expiresAt.getTime() - expectedExpiration.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeLessThan(1); // Within 1 hour tolerance
    });
  });

  // ===== AUTHORIZATION =====
  describe('Authorization', () => {
    it('should return 401 with invalid session token', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: null,
                          error: { message: 'Session not found' },
                        }),
                      }),
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

      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        body: JSON.stringify({
          godAdminId: 'god-admin-123',
          clientId: 'client-123',
          sessionToken: 'invalid-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid or expired session');
    });

    it('should return 401 with expired session', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // Expired 1 hour ago

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: {
                            user_id: 'god-admin-123',
                            user_type: 'god',
                            expires_at: pastDate.toISOString(),
                          },
                          error: null,
                        }),
                      }),
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

      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        body: JSON.stringify({
          godAdminId: 'god-admin-123',
          clientId: 'client-123',
          sessionToken: 'expired-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Session expired');
    });

    it('should return 403 when god admin not found', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: {
                            user_id: 'god-admin-123',
                            user_type: 'god',
                            expires_at: futureDate.toISOString(),
                          },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'god_admins') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'God admin not found' },
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

      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        body: JSON.stringify({
          godAdminId: 'invalid-god-admin',
          clientId: 'client-123',
          sessionToken: 'valid-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('God admin not found');
    });
  });

  // ===== VALIDATION =====
  describe('Validation', () => {
    it('should validate required fields', async () => {
      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing godAdminId and clientId
          sessionToken: 'token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('godAdminId and clientId are required');
    });

    it('should require session token', async () => {
      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        body: JSON.stringify({
          godAdminId: 'god-admin-123',
          clientId: 'client-123',
          // Missing sessionToken
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Session token required');
    });
  });

  // ===== ERROR HANDLING =====
  describe('Error Handling', () => {
    it('should handle wedding not found', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: {
                            user_id: 'god-admin-123',
                            user_type: 'god',
                            expires_at: futureDate.toISOString(),
                          },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'god_admins') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'god-admin-123' },
                    error: null,
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

      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        body: JSON.stringify({
          godAdminId: 'god-admin-123',
          clientId: 'nonexistent-client',
          sessionToken: 'valid-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Wedding not found for this client');
    });

    it('should handle database errors during token creation', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: {
                            user_id: 'god-admin-123',
                            user_type: 'god',
                            expires_at: futureDate.toISOString(),
                          },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'god_admins') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'god-admin-123' },
                    error: null,
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
                    data: { id: 'wedding-123' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'god_access_tokens') {
            return {
              insert: vi.fn().mockResolvedValue({
                error: { message: 'Database connection lost' },
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/create-token', {
        method: 'POST',
        body: JSON.stringify({
          godAdminId: 'god-admin-123',
          clientId: 'client-123',
          sessionToken: 'valid-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create access token');
      expect(data.message).toBe('Database connection lost');
    });
  });
});
