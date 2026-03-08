/**
 * Tests: GDPR Data Deletion API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './delete-data';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {},
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

const mockAdminClient = {
  from: vi.fn(),
};

const mockVerifyServerSession = vi.fn();
const mockVerifyWeddingOwnership = vi.fn();

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(() => mockAdminClient),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
  verifyServerSession: (...args: any[]) => mockVerifyServerSession(...args),
  verifyWeddingOwnership: (...args: any[]) => mockVerifyWeddingOwnership(...args),
}));

vi.mock('../../../lib/rateLimit', async () => {
  const { createRateLimitMock } = await import('../../../test/helpers/rateLimitMock');
  return createRateLimitMock();
});

vi.mock('../../../lib/api/middleware', () => ({
  apiGuards: {
    requireSupabase: vi.fn().mockReturnValue(null),
    requireServiceRole: vi.fn().mockReturnValue(null),
  },
  apiResponse: {
    success: vi.fn((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })),
    error: vi.fn((error, message, status) => new Response(
      JSON.stringify({ error, message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )),
  },
}));

function createChainMock(resolvedValue: any = { data: [], error: null }) {
  const mock: any = {
    select: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  Object.keys(mock).forEach((key) => {
    if (key === 'single') {
      mock[key].mockResolvedValue(resolvedValue);
    } else {
      mock[key].mockReturnValue(mock);
    }
  });
  // For delete chains that don't call single(), the final eq() should resolve
  mock.eq.mockImplementation(() => {
    const next = { ...mock };
    // If select is called after eq, return a promise
    next.select = vi.fn().mockResolvedValue(resolvedValue);
    next.eq = vi.fn().mockReturnValue(next);
    return next;
  });
  return mock;
}

function createRequest(body: any): Request {
  return new Request('http://localhost:4321/api/gdpr/delete-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockCookies = {
  get: vi.fn().mockReturnValue({ value: 'test-session-token' }),
};

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('GDPR Delete Data Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerSession.mockResolvedValue({ userId: 'user-1', userType: 'client' });
    mockVerifyWeddingOwnership.mockResolvedValue(true);
  });

  it('should return 401 if not authenticated', async () => {
    mockVerifyServerSession.mockResolvedValue(null);

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not own the wedding', async () => {
    mockVerifyWeddingOwnership.mockResolvedValue(false);

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(403);
  });

  it('should return 400 for missing confirmation', async () => {
    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(400);
  });

  it('should return 400 for wrong confirmation string', async () => {
    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'YES' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(400);
  });

  it('should return 400 for invalid weddingId', async () => {
    const response = await POST({
      request: createRequest({ weddingId: 'not-a-uuid', confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(400);
  });

  it('should delete all data and return counts on success', async () => {
    // Supabase chain: .from(table).delete().eq(col, val).select('id')
    // The chain returns a builder at each step; final call is awaited.
    const deleteMock = (data: any[]) => {
      const chain: any = {};
      chain.delete = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.select = vi.fn().mockResolvedValue({ data, error: null });
      // Make chain itself thenable in case it's awaited without .select()
      chain.then = undefined;
      return chain;
    };

    // Wedding delete chain: .from('weddings').delete().eq('id', weddingId) - awaited directly
    const weddingDeleteChain: any = {};
    weddingDeleteChain.delete = vi.fn().mockReturnValue(weddingDeleteChain);
    weddingDeleteChain.eq = vi.fn().mockResolvedValue({ error: null });

    mockAdminClient.from.mockImplementation((table: string) => {
      switch (table) {
        case 'media': return deleteMock([{ id: 'm1' }, { id: 'm2' }]);
        case 'guestbook_messages': return deleteMock([{ id: 'g1' }]);
        case 'rsvps': return deleteMock([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]);
        case 'guest_sessions': return deleteMock([{ id: 's1' }]);
        case 'weddings': return weddingDeleteChain;
        default: return deleteMock([]);
      }
    });

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deleted).toEqual({
      media: 2,
      guestbookMessages: 1,
      rsvps: 3,
      guestSessions: 1,
      wedding: true,
    });
  });
});
