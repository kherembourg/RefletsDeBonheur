/**
 * Tests: Delete Media API Endpoint
 *
 * Tests the media deletion endpoint including R2 cleanup and authorization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './delete';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

const mockAdminClient = {
  from: vi.fn(),
};

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(() => mockAdminClient),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
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
    success: vi.fn((data) => new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })),
    error: vi.fn((error, message, status) => new Response(
      JSON.stringify({ error, message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )),
  },
}));

const mockDeleteR2MediaFiles = vi.fn();
vi.mock('../../../lib/r2/deleteMedia', () => ({
  deleteR2MediaFiles: (...args: any[]) => mockDeleteR2MediaFiles(...args),
}));

import { supabase } from '../../../lib/supabase/client';

// Helper to create a chainable query mock
function createQueryMock() {
  const mock: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  Object.keys(mock).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle') {
      mock[key].mockReturnValue(mock);
    }
  });

  return mock;
}

function createRequest(body: any, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/upload/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/upload/delete', () => {
  const mockMedia = {
    id: 'media-123',
    wedding_id: 'wedding-456',
    original_url: 'https://r2.example.com/weddings/wedding-456/media/photo.jpg',
    thumbnail_url: 'https://r2.example.com/weddings/wedding-456/thumbnails/photo-400w.webp',
    guest_identifier: null,
  };

  const mockWedding = {
    owner_id: 'user-789',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteR2MediaFiles.mockResolvedValue([]);
  });

  it('should delete media record and R2 objects successfully', async () => {
    // Mock media fetch
    const mediaQueryMock = createQueryMock();
    mediaQueryMock.single.mockResolvedValue({ data: mockMedia, error: null });

    // Mock wedding fetch
    const weddingQueryMock = createQueryMock();
    weddingQueryMock.single.mockResolvedValue({ data: mockWedding, error: null });

    // Mock delete
    const deleteQueryMock = createQueryMock();
    deleteQueryMock.eq.mockResolvedValue({ data: null, error: null });

    let fromCallCount = 0;
    mockAdminClient.from.mockImplementation((table: string) => {
      fromCallCount++;
      if (fromCallCount === 1) return mediaQueryMock;  // media select
      if (fromCallCount === 2) return weddingQueryMock; // weddings select
      return deleteQueryMock;                            // media delete
    });

    // Mock auth - owner is making the request
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-789' } },
      error: null,
    });

    const request = createRequest(
      { mediaId: 'media-123' },
      { Authorization: 'Bearer valid-token' }
    );

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteR2MediaFiles).toHaveBeenCalledWith(
      mockMedia.original_url,
      mockMedia.thumbnail_url
    );
  });

  it('should return 400 when mediaId is missing', async () => {
    const request = createRequest({});
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
  });

  it('should return 404 when media record not found', async () => {
    const queryMock = createQueryMock();
    queryMock.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    });
    mockAdminClient.from.mockReturnValue(queryMock);

    const request = createRequest({ mediaId: 'non-existent' });
    const response = await POST({ request } as any);

    expect(response.status).toBe(404);
  });

  it('should return 403 when user is not authorized', async () => {
    // Mock media fetch
    const mediaQueryMock = createQueryMock();
    mediaQueryMock.single.mockResolvedValue({ data: mockMedia, error: null });

    // Mock wedding fetch
    const weddingQueryMock = createQueryMock();
    weddingQueryMock.single.mockResolvedValue({ data: mockWedding, error: null });

    let fromCallCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return mediaQueryMock;
      return weddingQueryMock;
    });

    // Mock auth - different user
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'different-user' } },
      error: null,
    });

    const request = createRequest(
      { mediaId: 'media-123' },
      { Authorization: 'Bearer valid-token' }
    );

    const response = await POST({ request } as any);

    expect(response.status).toBe(403);
    expect(mockDeleteR2MediaFiles).not.toHaveBeenCalled();
  });

  it('should still delete DB record when R2 deletion has errors', async () => {
    // Mock media fetch
    const mediaQueryMock = createQueryMock();
    mediaQueryMock.single.mockResolvedValue({ data: mockMedia, error: null });

    // Mock wedding fetch
    const weddingQueryMock = createQueryMock();
    weddingQueryMock.single.mockResolvedValue({ data: mockWedding, error: null });

    // Mock delete
    const deleteQueryMock = createQueryMock();
    deleteQueryMock.eq.mockResolvedValue({ data: null, error: null });

    let fromCallCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return mediaQueryMock;
      if (fromCallCount === 2) return weddingQueryMock;
      return deleteQueryMock;
    });

    // Mock auth - owner
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-789' } },
      error: null,
    });

    // R2 deletion returns errors
    mockDeleteR2MediaFiles.mockResolvedValue([
      'Failed to delete original R2 object: Network error',
    ]);

    const request = createRequest(
      { mediaId: 'media-123' },
      { Authorization: 'Bearer valid-token' }
    );

    const response = await POST({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.r2Errors).toEqual([
      'Failed to delete original R2 object: Network error',
    ]);
    // DB delete should still have been called
    expect(mockAdminClient.from).toHaveBeenCalledTimes(3); // media select, wedding select, media delete
  });

  it('should return 500 when database deletion fails', async () => {
    // Mock media fetch
    const mediaQueryMock = createQueryMock();
    mediaQueryMock.single.mockResolvedValue({ data: mockMedia, error: null });

    // Mock wedding fetch
    const weddingQueryMock = createQueryMock();
    weddingQueryMock.single.mockResolvedValue({ data: mockWedding, error: null });

    // Mock delete - fails
    const deleteQueryMock = createQueryMock();
    deleteQueryMock.eq.mockResolvedValue({
      data: null,
      error: { code: 'DB_ERROR', message: 'Delete failed' },
    });

    let fromCallCount = 0;
    mockAdminClient.from.mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) return mediaQueryMock;
      if (fromCallCount === 2) return weddingQueryMock;
      return deleteQueryMock;
    });

    // Mock auth - owner
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-789' } },
      error: null,
    });

    const request = createRequest(
      { mediaId: 'media-123' },
      { Authorization: 'Bearer valid-token' }
    );

    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
  });
});
