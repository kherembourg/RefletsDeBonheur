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

const mockDeleteR2MediaFiles = vi.fn().mockResolvedValue([]);

vi.mock('../../../lib/r2/deleteMedia', () => ({
  deleteR2MediaFiles: (...args: any[]) => mockDeleteR2MediaFiles(...args),
}));

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

// Media records with URLs for R2 cleanup testing
const MEDIA_RECORDS = [
  { id: 'm1', original_url: 'https://r2.example.com/weddings/abc/media/photo1.jpg', thumbnail_url: 'https://r2.example.com/weddings/abc/thumbnails/photo1-400w.webp' },
  { id: 'm2', original_url: 'https://r2.example.com/weddings/abc/media/photo2.jpg', thumbnail_url: null },
];

/**
 * Build mock for the `media` table which is called twice:
 *   1st call: .select('id, original_url, thumbnail_url').eq('wedding_id', id) → fetch
 *   2nd call: .delete().eq('wedding_id', id).select('id') → delete
 */
function createMediaTableMock(
  fetchData: any[] = MEDIA_RECORDS,
  fetchError: any = null,
  deleteData: any[] | null = null,
  deleteError: any = null,
) {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount === 1) {
      // SELECT chain: .select(...).eq(...)
      const chain: any = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockResolvedValue({ data: fetchData, error: fetchError });
      return chain;
    }
    // DELETE chain: .delete().eq(...).select('id')
    const chain: any = {};
    chain.delete = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockResolvedValue({
      data: deleteData ?? fetchData.map((r) => ({ id: r.id })),
      error: deleteError,
    });
    return chain;
  };
}

/** Standard delete chain for non-media tables: .delete().eq(...).select('id') */
function createDeleteMock(data: any[], error: any = null) {
  const chain: any = {};
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

/** Wedding delete chain: .delete().eq(...) — no .select() */
function createWeddingDeleteMock(error: any = null) {
  const chain: any = {};
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockResolvedValue({ error });
  return chain;
}

/**
 * Set up mockAdminClient.from to return the right mock for each table.
 * mediaFactory is a function so it can track call counts.
 */
function setupDefaultMocks(overrides: {
  mediaFactory?: () => any;
  guestbookMessages?: any;
  rsvps?: any;
  guestSessions?: any;
  weddings?: any;
} = {}) {
  const mediaFactory = overrides.mediaFactory ?? createMediaTableMock();
  const guestbookMessages = overrides.guestbookMessages ?? createDeleteMock([{ id: 'g1' }]);
  const rsvps = overrides.rsvps ?? createDeleteMock([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]);
  const guestSessions = overrides.guestSessions ?? createDeleteMock([{ id: 's1' }]);
  const weddings = overrides.weddings ?? createWeddingDeleteMock();

  mockAdminClient.from.mockImplementation((table: string) => {
    switch (table) {
      case 'media': return mediaFactory();
      case 'guestbook_messages': return guestbookMessages;
      case 'rsvps': return rsvps;
      case 'guest_sessions': return guestSessions;
      case 'weddings': return weddings;
      default: return createDeleteMock([]);
    }
  });
}

describe('GDPR Delete Data Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyServerSession.mockResolvedValue({ userId: 'user-1', userType: 'client' });
    mockVerifyWeddingOwnership.mockResolvedValue(true);
    mockDeleteR2MediaFiles.mockResolvedValue([]);
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
    setupDefaultMocks();

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

  it('should call deleteR2MediaFiles for each media record', async () => {
    setupDefaultMocks();

    await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(mockDeleteR2MediaFiles).toHaveBeenCalledTimes(2);
    expect(mockDeleteR2MediaFiles).toHaveBeenCalledWith(
      MEDIA_RECORDS[0].original_url,
      MEDIA_RECORDS[0].thumbnail_url,
    );
    expect(mockDeleteR2MediaFiles).toHaveBeenCalledWith(
      MEDIA_RECORDS[1].original_url,
      MEDIA_RECORDS[1].thumbnail_url,
    );
  });

  it('should succeed even if R2 cleanup fails', async () => {
    mockDeleteR2MediaFiles.mockRejectedValue(new Error('R2 unavailable'));
    setupDefaultMocks();

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should return 500 if media fetch fails', async () => {
    setupDefaultMocks({
      mediaFactory: createMediaTableMock([], { message: 'DB error' }),
    });

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Deletion failed');
  });

  it('should return 500 if media delete fails', async () => {
    setupDefaultMocks({
      mediaFactory: createMediaTableMock(MEDIA_RECORDS, null, null, { message: 'DB error' }),
    });

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(500);
  });

  it('should return 500 if wedding delete fails', async () => {
    setupDefaultMocks({
      weddings: createWeddingDeleteMock({ message: 'FK constraint' }),
    });

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Partial deletion');
  });

  it('should not call R2 cleanup when there are no media records', async () => {
    setupDefaultMocks({
      mediaFactory: createMediaTableMock([]),
    });

    const response = await POST({
      request: createRequest({ weddingId: VALID_UUID, confirmation: 'DELETE_ALL_DATA' }),
      cookies: mockCookies,
    } as any);

    expect(response.status).toBe(200);
    expect(mockDeleteR2MediaFiles).not.toHaveBeenCalled();
  });
});
