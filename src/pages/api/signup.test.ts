/**
 * Tests: Signup API
 * 
 * Tests the signup POST endpoint that creates a pending signup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './signup';

// Mock dependencies
vi.mock('../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../lib/api/middleware', () => ({
  apiGuards: {
    requireSupabase: vi.fn().mockReturnValue(null),
    requireServiceRole: vi.fn().mockReturnValue(null),
  },
  apiResponse: {
    success: vi.fn((data) => new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })),
    error: vi.fn((error, message, status) => new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })),
  },
}));

vi.mock('../../lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitResponse: vi.fn(),
  RATE_LIMITS: {
    signup: { maxAttempts: 5, windowMs: 3600000 },
  },
}));

describe('POST /api/signup', () => {
  let mockAdminClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock Supabase admin client
    mockAdminClient = {
      from: vi.fn(),
      auth: {
        admin: {
          createUser: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
    };

    const { getSupabaseAdminClient } = await import('../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);
  });

  const validSignupData = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
    partner1_name: 'Alice',
    partner2_name: 'Bob',
    wedding_date: '2026-06-15',
    slug: 'alice-bob',
    theme_id: 'romantic',
  };

  describe('Happy Path', () => {
    it('should create account successfully with valid signup data', async () => {
      const mockUserId = 'user-123';
      const mockWeddingId = 'wedding-123';

      // Mock slug check (not taken)
      const mockSlugCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockSlugCheck,
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: mockWeddingId,
                    slug: 'alice-bob',
                    pin_code: 'ABC123',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({
              data: { id: mockUserId },
              error: null,
            }),
          };
        }
      });

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
          },
        },
        error: null,
      });

      // Mock sign in
      const { supabase } = await import('../../lib/supabase/client');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          session: {
            access_token: 'token-123',
            refresh_token: 'refresh-123',
            expires_at: Date.now() + 3600000,
          },
          user: null,
        },
        error: null,
      } as any);

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignupData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.slug).toBe('alice-bob');
      expect(data.redirect).toBe('/alice-bob/admin');
      expect(data.session).toBeDefined();
      expect(data.user.wedding_id).toBe(mockWeddingId);
    });
  });

  describe('Validation', () => {
    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        // Missing partner1_name, partner2_name, slug, theme_id
      };

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        ...validSignupData,
        email: 'not-an-email',
      };

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid email');
      expect(data.field).toBe('email');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = {
        ...validSignupData,
        password: 'weak',
      };

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Weak password');
      expect(data.field).toBe('password');
    });

    it('should return 400 for invalid slug format', async () => {
      const invalidData = {
        ...validSignupData,
        slug: 'Invalid Slug!',
      };

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid slug format');
      expect(data.field).toBe('slug');
    });

    it('should return 400 for reserved slug', async () => {
      const invalidData = {
        ...validSignupData,
        slug: 'admin', // Reserved slug
      };

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Slug reserved');
      expect(data.field).toBe('slug');
    });
  });

  describe('Slug Conflicts', () => {
    it('should return 400 when slug is already taken in weddings table', async () => {
      // Mock slug already exists
      const mockSlugCheck = vi.fn().mockResolvedValue({
        data: { slug: 'alice-bob' },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockSlugCheck,
              }),
            }),
          };
        }
      });

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignupData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Slug taken');
      expect(data.field).toBe('slug');
    });

    it('should return 409 for race condition slug conflict during wedding creation', async () => {
      const mockUserId = 'user-123';

      // Mock slug check passes (not taken)
      const mockSlugCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock wedding insert fails with unique constraint error
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockSlugCheck,
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: {
                    code: '23505', // Unique constraint violation
                    message: 'duplicate key value violates unique constraint "weddings_slug_key"',
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({
              data: { id: mockUserId },
              error: null,
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({}),
            }),
          };
        }
      });

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
          },
        },
        error: null,
      });

      // Mock cleanup (delete user)
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({});

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignupData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Slug taken');
      expect(data.field).toBe('slug');
      // Verify cleanup was called
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('Duplicate Email', () => {
    it('should handle duplicate email gracefully', async () => {
      // Mock slug check (not taken)
      const mockSlugCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockSlugCheck,
              }),
            }),
          };
        }
      });

      // Mock auth user creation fails (email already exists)
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: {
          user: null,
        },
        error: {
          message: 'User already been registered',
        },
      });

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignupData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Account error');
      expect(data.field).toBe('email');
      expect(data.code).toBe('ACCOUNT_EXISTS_OR_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle profile creation failure with cleanup', async () => {
      const mockUserId = 'user-123';

      // Mock slug check (not taken)
      const mockSlugCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockSlugCheck,
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          };
        }
      });

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
          },
        },
        error: null,
      });

      // Mock cleanup (delete user)
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({});

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignupData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Profile creation failed');
      // Verify cleanup was attempted
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle wedding creation failure with cleanup', async () => {
      const mockUserId = 'user-123';

      // Mock slug check (not taken)
      const mockSlugCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: mockSlugCheck,
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({
              data: { id: mockUserId },
              error: null,
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({}),
            }),
          };
        }
      });

      // Mock auth user creation
      mockAdminClient.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: 'test@example.com',
          },
        },
        error: null,
      });

      // Mock cleanup (delete user and profile)
      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({});

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignupData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Wedding creation failed');
      // Verify cleanup was attempted
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle JSON parse errors', async () => {
      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting', async () => {
      const { checkRateLimit, createRateLimitResponse } = await import('../../lib/rateLimit');
      
      vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, retryAfter: 3600 });
      vi.mocked(createRateLimitResponse).mockReturnValueOnce(
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignupData),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toBe('Rate limit exceeded');
    });
  });
});
