/**
 * Tests: Batch Regenerate Thumbnails API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './regenerate-thumbnails';
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
  extractKeyFromUrl: vi.fn((url: string) => {
    const match = url.match(/weddings\/[^/]+\/media\/[^/]+/);
    return match ? match[0] : null;
  }),
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

describe('POST /api/admin/weddings/[id]/regenerate-thumbnails', () => {
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

    // Mock R2 functions
    mockFetchFile = vi.fn().mockResolvedValue(testImageBuffer);
    mockUploadFile = vi.fn().mockImplementation((key) => Promise.resolve({
      key,
      url: `https://r2.example.com/${key}`,
      size: 5000,
      contentType: 'image/webp',
    }));

    const { getSupabaseAdminClient } = await import('../../../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);

    const { supabase } = await import('../../../../../lib/supabase/client');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    } as any);
  });

  it('should batch regenerate thumbnails for missing only', async () => {
    // Mock wedding query
    const mockSingle = vi.fn().mockResolvedValue({
      data: { owner_id: 'user-123' },
      error: null,
    });

    // Mock media query
    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'media-1',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo1.jpg',
          thumbnail_url: null,
        },
        {
          id: 'media-2',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo2.jpg',
          thumbnail_url: null,
        },
      ],
      error: null,
    });

    // Mock update query
    const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null });

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
          limit: mockLimit,
          update: vi.fn().mockReturnThis(),
        };
      }
    });

    // Mock update specifically
    mockAdminClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mockSingle,
    });

    mockAdminClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      limit: mockLimit,
    });

    // For each update call
    mockAdminClient.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: mockEq,
    });

    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails?missingOnly=true');
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.processed).toBe(2);
    expect(data.succeeded).toBe(2);
    expect(data.failed).toBe(0);
    expect(data.results).toHaveLength(2);
  });

  it('should respect limit parameter', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { owner_id: 'user-123' },
      error: null,
    });

    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'media-1',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo1.jpg',
          thumbnail_url: null,
        },
      ],
      error: null,
    });

    const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null });

    let callCount = 0;
    mockAdminClient.from.mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === 'weddings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockSingle,
        };
      }
      if (callCount === 2 && table === 'media') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: mockLimit,
        };
      }
      // For update calls
      return {
        update: vi.fn().mockReturnThis(),
        eq: mockEq,
      };
    });

    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails?limit=1');
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.processed).toBe(1);
  });

  it('should return 400 for invalid limit', async () => {
    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails?limit=invalid');
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid parameter');
  });

  it('should return 400 for limit exceeding 100', async () => {
    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails?limit=101');
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid parameter');
    expect(data.message).toContain('exceed 100');
  });

  it('should return success with 0 processed when no media found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { owner_id: 'user-123' },
      error: null,
    });

    const mockLimit = vi.fn().mockResolvedValue({
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
          limit: mockLimit,
        };
      }
    });

    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails');
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.processed).toBe(0);
    expect(data.succeeded).toBe(0);
    expect(data.failed).toBe(0);
  });

  it('should return 401 if no authorization header', async () => {
    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails');
    const request = new Request(url, {
      method: 'POST',
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
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

    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails');
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should handle partial failures gracefully', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { owner_id: 'user-123' },
      error: null,
    });

    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'media-1',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo1.jpg',
          thumbnail_url: null,
        },
        {
          id: 'media-2',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo2.jpg',
          thumbnail_url: null,
        },
      ],
      error: null,
    });

    // Make second fetch fail
    mockFetchFile = vi.fn()
      .mockResolvedValueOnce(testImageBuffer)
      .mockRejectedValueOnce(new Error('Fetch failed'));

    const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null });

    let callCount = 0;
    mockAdminClient.from.mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === 'weddings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: mockSingle,
        };
      }
      if (callCount === 2 && table === 'media') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: mockLimit,
        };
      }
      // For update calls
      return {
        update: vi.fn().mockReturnThis(),
        eq: mockEq,
      };
    });

    const url = new URL('http://localhost/api/admin/weddings/wedding-123/regenerate-thumbnails');
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await POST({
      params: { id: 'wedding-123' },
      request,
      url,
    } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.processed).toBe(2);
    expect(data.succeeded).toBe(1);
    expect(data.failed).toBe(1);
    expect(data.results[1].success).toBe(false);
    expect(data.results[1].error).toBeDefined();
  });
});
