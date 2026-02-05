/**
 * Integration Tests: God Mode Update Status Endpoint
 *
 * Tests the god mode status update endpoint including:
 * - Subscription status updates (active, expired, trial)
 * - Authorization and authentication
 * - Profile updates
 * - Status validation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './update-status';

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

describe('God Mode Update Status Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== SUCCESS CASES =====
  describe('Status Updates - Success', () => {
    it('should update subscription status with valid token', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockUpdate = vi.fn().mockResolvedValue({ error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
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
          if (table === 'profiles') {
            return {
              update: vi.fn().mockReturnValue({
                eq: mockUpdate,
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

      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: 'client-123',
          status: 'active',
          godAdminId: 'god-admin-123',
          sessionToken: 'valid-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should update profile subscription_status field', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24);

      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockReturnValue(mockUpdate);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
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
          if (table === 'profiles') {
            return {
              update: vi.fn().mockReturnValue({
                eq: mockEq,
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

      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-456',
          status: 'expired',
          godAdminId: 'god-admin-123',
          sessionToken: 'valid-token',
        }),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      expect(mockEq).toHaveBeenCalledWith('id', 'client-456');
    });

    it('should accept valid status values (active, expired, trial)', async () => {
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
          if (table === 'profiles') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
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

      const validStatuses = ['active', 'expired', 'trial'];

      for (const status of validStatuses) {
        const request = new Request('http://localhost:4321/api/god/update-status', {
          method: 'POST',
          body: JSON.stringify({
            clientId: 'client-123',
            status,
            godAdminId: 'god-admin-123',
            sessionToken: 'valid-token',
          }),
        });

        const response = await POST({ request } as any);
        expect(response.status).toBe(200);
      }
    });
  });

  // ===== AUTHORIZATION =====
  describe('Authorization', () => {
    it('should return 401 with invalid token', async () => {
      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Session not found' },
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

      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-123',
          status: 'active',
          godAdminId: 'god-admin-123',
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
      pastDate.setHours(pastDate.getHours() - 1);

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'auth_sessions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
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
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-123',
          status: 'active',
          godAdminId: 'god-admin-123',
          sessionToken: 'expired-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Session expired');
    });

    it('should return 401 when god admin ID or session token missing', async () => {
      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-123',
          status: 'active',
          // Missing godAdminId and sessionToken
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('God admin authentication required');
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

      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-123',
          status: 'active',
          godAdminId: 'invalid-god-admin',
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
      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing clientId and status
          godAdminId: 'god-admin-123',
          sessionToken: 'token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('clientId and status are required');
    });

    it('should validate status values', async () => {
      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-123',
          status: 'invalid-status',
          godAdminId: 'god-admin-123',
          sessionToken: 'token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid status');
      expect(data.error).toContain('active, expired, or trial');
    });
  });

  // ===== ERROR HANDLING =====
  describe('Error Handling', () => {
    it('should handle database errors during update', async () => {
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
          if (table === 'profiles') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: { message: 'Database connection lost' },
                }),
              }),
            };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/god/update-status', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-123',
          status: 'active',
          godAdminId: 'god-admin-123',
          sessionToken: 'valid-token',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update status');
      expect(data.message).toBe('Database connection lost');
    });
  });
});
