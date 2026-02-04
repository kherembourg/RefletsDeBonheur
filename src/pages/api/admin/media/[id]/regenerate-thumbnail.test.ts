/**
 * Tests: Regenerate Single Thumbnail API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './regenerate-thumbnail';
import sharp from 'sharp';

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
    requireR2: vi.fn().mockReturnValue(null),
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

// Mock R2 functions
let mockFetchFile: any;
let mockUploadFile: any;

vi.mock('../../../../../lib/r2', () => ({
  extractKeyFromUrl: vi.fn().mockReturnValue('weddings/wedding-123/media/photo.jpg'),
  fetchFile: (key: string) => mockFetchFile(key),
  uploadFile: (...args: any[]) => mockUploadFile(...args),
  generateThumbnailKey: vi.fn((key: string) => {
    const parts = key.split('/');
    const filename = parts[parts.length - 1];
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const weddingId = parts[1];
    return `weddings/${weddingId}/thumbnails/${nameWithoutExt}-400w.webp`;
  }),
}));

describe('POST /api/admin/media/[id]/regenerate-thumbnail', () => {
  let mockAdminClient: any;
  let testImageBuffer: Buffer;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Generate a test image buffer (800x600 JPEG)
    testImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    // Mock Supabase admin client
    mockAdminClient = {
      from: vi.fn(),
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn();
    const mockUpdate = vi.fn().mockReturnThis();

    mockAdminClient.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      update: mockUpdate,
    });

    // Mock R2 functions
    mockFetchFile = vi.fn().mockResolvedValue(testImageBuffer);
    mockUploadFile = vi.fn().mockResolvedValue({
      key: 'weddings/wedding-123/thumbnails/photo-400w.webp',
      url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
      size: 5000,
      contentType: 'image/webp',
    });

    const { getSupabaseAdminClient } = await import('../../../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);

    const { supabase } = await import('../../../../../lib/supabase/client');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    } as any);
  });

  it('should regenerate thumbnail for valid media', async () => {
    // Mock media query
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'media-123',
        wedding_id: 'wedding-123',
        type: 'image',
        original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
        thumbnail_url: null,
      },
      error: null,
    });

    // Mock wedding query
    mockSingle.mockResolvedValueOnce({
      data: { owner_id: 'user-123' },
      error: null,
    });

    // Mock update query
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'media-123',
        thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
      },
      error: null,
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
      update: vi.fn().mockReturnThis(),
    });

    const request = new Request('http://localhost/api/admin/media/media-123/regenerate-thumbnail', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'media-123' },
      request,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.media).toBeDefined();
    expect(data.thumbnail).toBeDefined();
    expect(data.thumbnail.url).toContain('thumbnails');
    expect(data.message).toBe('Thumbnail regenerated successfully');
  });

  it('should return 404 if media not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/admin/media/nonexistent/regenerate-thumbnail', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'nonexistent' },
      request,
    } as any);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Media not found');
  });

  it('should return 401 if no authorization header', async () => {
    // Mock media query (will be called first)
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'media-123',
        wedding_id: 'wedding-123',
        type: 'image',
        original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
      },
      error: null,
    });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/admin/media/media-123/regenerate-thumbnail', {
      method: 'POST',
    });

    const response = await POST({
      params: { id: 'media-123' },
      request,
    } as any);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user does not own wedding', async () => {
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({
        data: {
          id: 'media-123',
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { owner_id: 'other-user' },
        error: null,
      });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/admin/media/media-123/regenerate-thumbnail', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'media-123' },
      request,
    } as any);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should return 400 for non-image media', async () => {
    const mockSingle = vi.fn()
      .mockResolvedValueOnce({
        data: {
          id: 'media-123',
          wedding_id: 'wedding-123',
          type: 'video',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/video.mp4',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { owner_id: 'user-123' },
        error: null,
      });

    mockAdminClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    const request = new Request('http://localhost/api/admin/media/media-123/regenerate-thumbnail', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'media-123' },
      request,
    } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid media type');
  });

  it('should return 400 if missing media ID', async () => {
    const request = new Request('http://localhost/api/admin/media//regenerate-thumbnail', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: undefined },
      request,
    } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing parameter');
  });
});
