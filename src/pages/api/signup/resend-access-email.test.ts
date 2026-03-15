import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/api/middleware', () => ({
  apiGuards: {
    requireSupabase: vi.fn().mockReturnValue(null),
    requireServiceRole: vi.fn().mockReturnValue(null),
    requireStripe: vi.fn().mockReturnValue(null),
  },
}));

vi.mock('../../../lib/rateLimit', async () => {
  const { createRateLimitMock } = await import('../../../test/helpers/rateLimitMock');
  return createRateLimitMock();
});

vi.mock('../../../lib/email', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true, id: 'email-123' }),
}));

vi.mock('../../../lib/email/lang', () => ({
  detectLanguageFromRequest: vi.fn().mockReturnValue('fr'),
}));

function createMockAdminClient({
  wedding = {
    owner_id: 'user-123',
    slug: 'alice-bob',
    pin_code: 'ABC123',
    bride_name: 'Alice',
    groom_name: 'Bob',
  },
  profile = { email: 'alice@example.com' },
  generateLinkError = null as any,
}: {
  wedding?: any;
  profile?: any;
  generateLinkError?: any;
} = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'weddings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: wedding,
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
                data: profile,
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
        generateLink: vi.fn().mockResolvedValue(
          generateLinkError
            ? { data: null, error: generateLinkError }
            : {
                data: {
                  properties: {
                    action_link: 'https://example.com/magic-link',
                  },
                },
                error: null,
              }
        ),
      },
    },
  };
}

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:4321/api/signup/resend-access-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'fr-FR',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/signup/resend-access-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resends the access email for a valid signup', async () => {
    const mockClient = createMockAdminClient();
    const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
    const { sendWelcomeEmail } = await import('../../../lib/email');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

    const { POST } = await import('./resend-access-email');
    const response = await POST({
      request: createRequest({ email: 'alice@example.com', slug: 'alice-bob' }),
    } as any);

    expect(response.status).toBe(200);
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@example.com',
        slug: 'alice-bob',
        guestCode: 'ABC123',
        coupleNames: 'Alice & Bob',
        lang: 'fr',
      })
    );
  });

  it('returns 404 when email does not match the wedding owner', async () => {
    const mockClient = createMockAdminClient({
      profile: { email: 'someone-else@example.com' },
    });
    const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

    const { POST } = await import('./resend-access-email');
    const response = await POST({
      request: createRequest({ email: 'alice@example.com', slug: 'alice-bob' }),
    } as any);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Account not found');
  });

  it('returns 502 when a new access link cannot be generated', async () => {
    const mockClient = createMockAdminClient({
      generateLinkError: { message: 'supabase link error' },
    });
    const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockClient as any);

    const { POST } = await import('./resend-access-email');
    const response = await POST({
      request: createRequest({ email: 'alice@example.com', slug: 'alice-bob' }),
    } as any);

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toBe('Link generation failed');
  });
});
