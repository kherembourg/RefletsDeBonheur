/**
 * Tests: List Media Without Thumbnails API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './media-without-thumbnails';

// Mock dependencies
vi.mock('../../../../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../../../lib/api/middleware', () => ({
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

describe('GET /api/admin/weddings/[id]/media-without-thumbnails', () => {
  let mockAdminClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock Supabase admin client
    mockAdminClient = {
      from: vi.fn(),
    };

    const { getSupabaseAdminClient } = await import('../../../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);

    const { supabase } = await import('../../../../../lib/supabase/client');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    } as any);
  });

  it('should list media without thumbnails', async () => {
    // Mock wedding query
    const mockSingle = vi.fn().mockResolvedValue({
      data: { owner_id: 'user-123' },
      error: null,
    });

    // Mock media query
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'media-1',
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/photo1.jpg',
          thumbnail_url: null,
        },
        {
          id: 'media-2',
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/photo2.jpg',
          thumbnail_url: null,
        },
      ],
      error: null,
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'weddings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockSingle,
        };
      }
      if (table === 'media') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: mockOrder,
        };
      }
    });

    const request = new Request('http://localhost/api/admin/weddings/wedding-123/media-without-thumbnails', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET({
      params: { id: 'wedding-123' },
      request,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.count).toBe(2);
    expect(data.media).toHaveLength(2);
    expect(data.media[0].thumbnail_url).toBeNull();
  });

  it('should return empty array when no media without thumbnails', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { owner_id: 'user-123' },
      error: null,
    });

    const mockOrder = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === 'weddings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockSingle,
        };
      }
      if (table === 'media') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: mockOrder,
        };
      }
    });

    const request = new Request('http://localhost/api/admin/weddings/wedding-123/media-without-thumbnails', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET({
      params: { id: 'wedding-123' },
      request,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.count).toBe(0);
    expect(data.media).toEqual([]);
  });

  it('should return 401 if no authorization header', async () => {
    const request = new Request('http://localhost/api/admin/weddings/wedding-123/media-without-thumbnails', {
      method: 'GET',
    });

    const response = await GET({
      params: { id: 'wedding-123' },
      request,
    } as any);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if wedding not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/admin/weddings/nonexistent/media-without-thumbnails', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET({
      params: { id: 'nonexistent' },
      request,
    } as any);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Wedding not found');
  });

  it('should return 403 if user does not own wedding', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { owner_id: 'other-user' },
      error: null,
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/admin/weddings/wedding-123/media-without-thumbnails', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET({
      params: { id: 'wedding-123' },
      request,
    } as any);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should return 400 if missing wedding ID', async () => {
    const request = new Request('http://localhost/api/admin/weddings//media-without-thumbnails', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET({
      params: { id: undefined },
      request,
    } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing parameter');
  });
});
