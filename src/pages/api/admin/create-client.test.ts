/**
 * Integration Tests: Admin Create Client Endpoint
 *
 * Tests the admin endpoint for creating new client accounts including:
 * - Client account creation with Supabase auth
 * - Profile creation with trial status
 * - Wedding record creation with generated slug
 * - Transaction atomicity and rollback
 * - Authorization and validation
 * - Error handling for conflicts and failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './create-client';

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

describe('Admin Create Client Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== SUCCESS CASES =====
  describe('Client Creation - Success', () => {
    it('should create client account with valid data', async () => {
      const mockUserId = 'user-123';
      const mockProfileCreatedAt = '2026-02-04T10:00:00Z';
      const mockWeddingId = 'wedding-123';
      const mockMagicToken = 'magic-token-123';

      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: mockUserId,
                      email: 'test@example.com',
                      full_name: 'Alice & Bob',
                      subscription_status: 'trial',
                      created_at: mockProfileCreatedAt,
                      updated_at: mockProfileCreatedAt,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'weddings') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: mockWeddingId,
                      owner_id: mockUserId,
                      slug: 'alice-bob-2026',
                      pin_code: 'ABC123',
                      magic_token: mockMagicToken,
                      name: 'Alice & Bob Wedding',
                      bride_name: 'Alice',
                      groom_name: 'Bob',
                      wedding_date: '2026-06-15',
                    },
                    error: null,
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

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_name: 'Alice & Bob Wedding',
          couple_names: 'Alice & Bob',
          wedding_date: '2026-06-15',
          wedding_slug: 'alice-bob-2026',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          username: 'alice-bob',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.client).toBeDefined();
      expect(data.client.id).toBe(mockUserId);
      expect(data.client.email).toBe('test@example.com');
      expect(data.client.couple_names).toBe('Alice & Bob');
      expect(data.client.wedding_slug).toBe('alice-bob-2026');
      expect(data.client.status).toBe('trial');
      expect(data.client.guest_code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should create Supabase auth user with correct parameters', async () => {
      const mockUserId = 'user-456';
      const mockCreateUser = vi.fn().mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      });

      const mockClient = {
        auth: {
          admin: {
            createUser: mockCreateUser,
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: mockUserId,
                      email: 'test@example.com',
                      full_name: 'Alice & Bob',
                      subscription_status: 'trial',
                      created_at: '2026-02-04T10:00:00Z',
                      updated_at: '2026-02-04T10:00:00Z',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'weddings') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'wedding-456',
                      owner_id: mockUserId,
                      slug: 'alice-bob',
                      pin_code: 'XYZ789',
                      magic_token: 'magic-456',
                    },
                    error: null,
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

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_name: 'Test Wedding',
          couple_names: 'Alice & Bob',
          wedding_slug: 'alice-bob',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          username: 'alice-bob',
        }),
      });

      await POST({ request } as any);

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Alice & Bob',
          username: 'alice-bob',
        },
      });
    });

    it('should create profile with trial status and 31-day expiration', async () => {
      const mockUserId = 'user-789';
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockUserId,
              subscription_status: 'trial',
              subscription_end_date: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
            },
            error: null,
          }),
        }),
      });

      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return { upsert: mockUpsert };
          }
          if (table === 'weddings') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'wedding-789', owner_id: mockUserId, slug: 'test', pin_code: 'ABC', magic_token: 'magic' },
                    error: null,
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

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test',
          couple_names: 'Test & Test',
          wedding_slug: 'test',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify upsert was called with trial status and expiration date
      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.subscription_status).toBe('trial');
      expect(upsertCall.subscription_end_date).toBeDefined();
      
      // Verify expiration is approximately 31 days from now
      const expirationDate = new Date(upsertCall.subscription_end_date);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 31);
      const diffDays = Math.abs(expirationDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeLessThan(1); // Within 1 day tolerance
    });

    it('should create wedding record with generated slug and guest code', async () => {
      const mockUserId = 'user-101';
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'wedding-101',
              owner_id: mockUserId,
              slug: 'alice-bob-2026',
              pin_code: 'GUEST1',
              magic_token: 'admin-token',
              name: 'Alice & Bob Wedding',
              bride_name: 'Alice',
              groom_name: 'Bob',
            },
            error: null,
          }),
        }),
      });

      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockUserId, subscription_status: 'trial' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'weddings') {
            return { insert: mockInsert };
          }
          return {};
        }),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Alice & Bob Wedding',
          couple_names: 'Alice & Bob',
          wedding_slug: 'alice-bob-2026',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verify insert was called with correct data
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.owner_id).toBe(mockUserId);
      expect(insertCall.slug).toBe('alice-bob-2026');
      expect(insertCall.bride_name).toBe('Alice');
      expect(insertCall.groom_name).toBe('Bob');
      expect(insertCall.pin_code).toMatch(/^[A-Z0-9]+$/); // Generated code
      expect(insertCall.is_published).toBe(true);
      
      // Verify response contains guest code
      expect(data.client.guest_code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should return account credentials and access info', async () => {
      const mockUserId = 'user-202';
      const mockCreatedAt = '2026-02-04T10:00:00Z';
      const trialEndDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: mockUserId,
                      email: 'test@example.com',
                      full_name: 'Alice & Bob',
                      subscription_status: 'trial',
                      subscription_end_date: trialEndDate,
                      created_at: mockCreatedAt,
                      updated_at: mockCreatedAt,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'weddings') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'wedding-202',
                      owner_id: mockUserId,
                      slug: 'alice-bob',
                      pin_code: 'GUEST2',
                      magic_token: 'ADMIN2',
                      wedding_date: '2026-06-15',
                    },
                    error: null,
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

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test Wedding',
          couple_names: 'Alice & Bob',
          wedding_slug: 'alice-bob',
          wedding_date: '2026-06-15',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.client).toMatchObject({
        id: mockUserId,
        email: 'test@example.com',
        couple_names: 'Alice & Bob',
        wedding_slug: 'alice-bob',
        admin_code: 'ADMIN2',
        status: 'trial',
      });
      expect(data.client.guest_code).toMatch(/^[A-Z0-9]{6}$/);
    });
  });


  // ===== VALIDATION =====
  describe('Validation', () => {
    it('should validate required fields', async () => {
      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_name: 'Test Wedding',
          // Missing couple_names, wedding_slug, email, password
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
      expect(data.message).toContain('wedding_name');
      expect(data.message).toContain('couple_names');
      expect(data.message).toContain('wedding_slug');
      expect(data.message).toContain('email');
      expect(data.message).toContain('password');
    });

    it('should handle duplicate email gracefully', async () => {
      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'User already registered' },
            }),
          },
        },
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test',
          couple_names: 'Test & Test',
          wedding_slug: 'test',
          email: 'duplicate@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create user');
      expect(data.message).toContain('User already registered');
    });

    it('should handle slug conflicts', async () => {
      const mockUserId = 'user-303';
      
      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockUserId, subscription_status: 'trial' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'weddings') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates unique constraint "weddings_slug_key"' },
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

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test',
          couple_names: 'Test & Test',
          wedding_slug: 'duplicate-slug',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Wedding creation failed');
    });
  });

  // ===== AUTHORIZATION =====
  describe('Authorization', () => {
    it('should require service role authentication', async () => {
      const { apiGuards } = await import('../../../lib/api/middleware');
      (apiGuards.requireServiceRole as any).mockReturnValueOnce(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test',
          couple_names: 'Test & Test',
          wedding_slug: 'test',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  // ===== ERROR HANDLING =====
  describe('Error Handling', () => {
    it('should handle auth creation failures', async () => {
      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: null },
              error: { message: 'Database connection failed' },
            }),
          },
        },
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test',
          couple_names: 'Test & Test',
          wedding_slug: 'test',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create user');
      expect(data.message).toBe('Database connection failed');
    });

    it('should handle profile creation failures', async () => {
      const mockUserId = 'user-404';
      
      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({
              data: { user: { id: mockUserId } },
              error: null,
            }),
          },
        },
        from: vi.fn((table: string) => {
          if (table === 'profiles') {
            return {
              upsert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Profile insert failed' },
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

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test',
          couple_names: 'Test & Test',
          wedding_slug: 'test',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Profile creation failed');
      expect(data.message).toBe('Profile insert failed');
    });

    it('should handle database errors', async () => {
      const mockClient = {
        auth: {
          admin: {
            createUser: vi.fn().mockRejectedValue(new Error('Network timeout')),
          },
        },
        from: vi.fn(),
      };

      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const request = new Request('http://localhost:4321/api/admin/create-client', {
        method: 'POST',
        body: JSON.stringify({
          wedding_name: 'Test',
          couple_names: 'Test & Test',
          wedding_slug: 'test',
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Network timeout');
    });
  });
});
