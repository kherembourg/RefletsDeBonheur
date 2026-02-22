import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the modules
vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/rateLimit', async () => {
  const { createRateLimitMock } = await import('../../../test/helpers/rateLimitMock');
  return createRateLimitMock();
});

vi.mock('../../../lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../../lib/email/lang', () => ({
  detectLanguageFromRequest: vi.fn().mockReturnValue('en'),
}));

function createMockAdminClient({
  slugExists = false,
  authError = null as any,
  rpcResult = null as any,
  rpcError = null as any,
}: {
  slugExists?: boolean;
  authError?: any;
  rpcResult?: any;
  rpcError?: any;
} = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'weddings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: slugExists ? { slug: 'taken-slug' } : null,
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    }),
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(
          authError
            ? { error: authError, data: {} }
            : {
                error: null,
                data: {
                  user: { id: 'test-user-id-123' },
                },
              }
        ),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    rpc: vi.fn().mockResolvedValue({
      data: rpcResult ?? {
        user_id: 'test-user-id-123',
        wedding_id: 'test-wedding-id-456',
        email: 'alice@example.com',
        slug: 'alice-bob',
        couple_names: 'Alice & Bob',
        guest_code: 'ABC123',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: rpcError,
    }),
  };
}

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:4321/api/signup/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: 'alice@example.com',
  password: 'SecurePass123!',
  partner1_name: 'Alice',
  partner2_name: 'Bob',
  slug: 'alice-bob',
  theme_id: 'classic',
};

describe('POST /api/signup/create-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation', () => {
    it('should reject missing required fields', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest({ email: 'test@example.com' }),
      } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should reject invalid email format', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest({ ...validBody, email: 'not-an-email' }),
      } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid email');
      expect(data.field).toBe('email');
    });

    it('should reject weak password', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest({ ...validBody, password: 'weak' }),
      } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Weak password');
      expect(data.field).toBe('password');
    });

    it('should reject invalid slug format', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest({ ...validBody, slug: 'ab' }),
      } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid slug format');
      expect(data.field).toBe('slug');
    });

    it('should reject already-taken slug', async () => {
      const mockClient = createMockAdminClient({ slugExists: true });
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest(validBody),
      } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Slug taken');
      expect(data.field).toBe('slug');
    });
  });

  describe('Account Creation', () => {
    it('should create account successfully and return slug', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest(validBody),
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.slug).toBe('alice-bob');
      expect(data.email).toBe('alice@example.com');
    });

    it('should create auth user with actual password (not temporary)', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      await POST({
        request: createRequest(validBody),
      } as any);

      expect(mockClient.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@example.com',
          password: 'SecurePass123!',
          email_confirm: true,
        })
      );
    });

    it('should call create_trial_account RPC with correct params', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      await POST({
        request: createRequest(validBody),
      } as any);

      expect(mockClient.rpc).toHaveBeenCalledWith('create_trial_account', {
        p_user_id: 'test-user-id-123',
        p_email: 'alice@example.com',
        p_partner1_name: 'Alice',
        p_partner2_name: 'Bob',
        p_wedding_date: null,
        p_slug: 'alice-bob',
        p_theme_id: 'classic',
      });
    });

    it('should send welcome email with hasPassword flag', async () => {
      const mockClient = createMockAdminClient();
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { sendWelcomeEmail } = await import('../../../lib/email');

      const { POST } = await import('./create-account');
      await POST({
        request: createRequest(validBody),
      } as any);

      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@example.com',
          slug: 'alice-bob',
          hasPassword: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate email gracefully', async () => {
      const mockClient = createMockAdminClient({
        authError: { message: 'User already been registered' },
      });
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest(validBody),
      } as any);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Account exists');
    });

    it('should clean up auth user if RPC fails', async () => {
      const mockClient = createMockAdminClient({
        rpcError: { message: 'Slug already taken' },
        rpcResult: null,
      });
      const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
      (getSupabaseAdminClient as any).mockReturnValue(mockClient);

      const { POST } = await import('./create-account');
      const response = await POST({
        request: createRequest(validBody),
      } as any);

      expect(response.status).toBe(500);
      // Verify cleanup was attempted
      expect(mockClient.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-id-123');
    });
  });
});
