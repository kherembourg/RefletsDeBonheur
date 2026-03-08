/**
 * Tests: GDPR Data Export API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './export-data';

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

function createQueryMock() {
  const mock: any = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  Object.keys(mock).forEach((key) => {
    if (key !== 'single') {
      mock[key].mockReturnValue(mock);
    }
  });
  return mock;
}

function createRequest(body: any): Request {
  return new Request('http://localhost:4321/api/gdpr/export-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockCookies = {
  get: vi.fn().mockReturnValue({ value: 'test-session-token' }),
};

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('GDPR Export Data Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerSession.mockResolvedValue({ userId: 'user-1', userType: 'client' });
    mockVerifyWeddingOwnership.mockResolvedValue(true);
  });

  it('should return 401 if not authenticated', async () => {
    mockVerifyServerSession.mockResolvedValue(null);

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not own the wedding', async () => {
    mockVerifyWeddingOwnership.mockResolvedValue(false);

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(403);
  });

  it('should return 400 for invalid weddingId', async () => {
    const response = await POST({
      request: createRequest({ weddingId: 'not-a-uuid' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(400);
  });

  it('should return exported data on success', async () => {
    const weddingData = { id: VALID_UUID, slug: 'test', name: 'Test Wedding' };
    const mediaData = [{ id: 'm1', type: 'image' }];
    const guestbookData = [{ id: 'g1', author_name: 'Sophie' }];
    const rsvpData = [{ id: 'r1', name: 'Sophie' }];

    // Each from() call returns a separate query chain
    const weddingQuery = createQueryMock();
    weddingQuery.single.mockResolvedValue({ data: weddingData, error: null });

    const mediaQuery = createQueryMock();
    // media doesn't call .single()
    mediaQuery.eq.mockResolvedValue({ data: mediaData, error: null });

    const guestbookQuery = createQueryMock();
    guestbookQuery.eq.mockResolvedValue({ data: guestbookData, error: null });

    const rsvpQuery = createQueryMock();
    rsvpQuery.eq.mockResolvedValue({ data: rsvpData, error: null });

    let callIndex = 0;
    mockAdminClient.from.mockImplementation((table: string) => {
      switch (table) {
        case 'weddings': return weddingQuery;
        case 'media': return mediaQuery;
        case 'guestbook_messages': return guestbookQuery;
        case 'rsvps': return rsvpQuery;
        default: return createQueryMock();
      }
    });

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('exportedAt');
    expect(data).toHaveProperty('wedding');
    expect(data).toHaveProperty('media');
    expect(data).toHaveProperty('guestbookMessages');
    expect(data).toHaveProperty('rsvps');
  });
});
