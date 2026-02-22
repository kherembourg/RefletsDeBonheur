/**
 * Integration Tests: Upload Confirm with Thumbnail Generation
 *
 * Tests the full upload flow including automatic thumbnail generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './confirm';
import sharp from 'sharp';

// Mock dependencies
vi.mock('../../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../lib/supabase/server', () => ({
  getSupabaseAdminClient: vi.fn(),
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
  },
}));

// Mock R2 functions at module level
let mockFetchFile: any;
let mockUploadFile: any;

vi.mock('../../../lib/r2', async () => {
  return {
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
  };
});

describe('Upload Confirm API - Thumbnail Generation Integration', () => {
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
    const mockInsert = vi.fn();
    const mockSelect = vi.fn();
    const mockSingle = vi.fn();
    const mockEq = vi.fn();
    const mockMaybeSingle = vi.fn();

    // Mock insert to return the data that was inserted (with dynamic status)
    mockSingle.mockImplementation(() => {
      const insertedData = mockInsert.mock.calls[mockInsert.mock.calls.length - 1]?.[0];
      return Promise.resolve({
        data: {
          id: 'media-123',
          ...insertedData,
          created_at: new Date().toISOString(),
        },
        error: null,
      });
    });

    mockSelect.mockReturnValue({
      single: mockSingle,
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
    });

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    mockInsert.mockReturnValue({
      select: mockSelect,
    });

    // Mock update method for thumbnail URL updates
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { owner_id: 'owner-123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'guest_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockEq,
            }),
          };
        }
        if (table === 'media') {
          // Support both idempotency check (select) and insert operations
          const selectForIdempotency = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null, // No existing media by default
                  error: null,
                }),
              }),
            }),
          });

          return {
            select: selectForIdempotency,
            insert: mockInsert,
            update: mockUpdate,
          };
        }
        return {};
      }),
    };

    const { getSupabaseAdminClient } = await import('../../../lib/supabase/server');
    vi.mocked(getSupabaseAdminClient).mockReturnValue(mockAdminClient);

    // Mock supabase auth
    const { supabase } = await import('../../../lib/supabase/client');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: { id: 'owner-123', email: 'test@example.com' } as any,
      },
      error: null,
    });

    // Initialize R2 mock functions for this test
    mockFetchFile = vi.fn().mockResolvedValue(testImageBuffer);
    mockUploadFile = vi.fn().mockResolvedValue({
      key: 'weddings/wedding-123/thumbnails/photo-400w.webp',
      url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
      size: 50000,
      contentType: 'image/webp',
    });
  });

  describe('Image Upload with Async Thumbnail Generation', () => {
    it('should return immediately with processing status (async behavior)', async () => {
      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
          caption: 'Beautiful sunset',
          guestName: 'John Doe',
        }),
      });

      const start = Date.now();
      const response = await POST({ request } as any);
      const duration = Date.now() - start;
      const data = await response.json();

      // Verify response returns quickly (should be fast without waiting for thumbnail)
      expect(duration).toBeLessThan(500); // Should be much faster than 500-1800ms

      // Verify response success
      expect(response.status).toBe(200);
      expect(data.media).toBeDefined();

      // Verify media record has processing status and null thumbnail initially
      expect(data.media.status).toBe('processing');
      expect(data.media.thumbnail_url).toBeNull();

      // Verify database insert has correct initial state
      const insertCall = mockAdminClient.from('media').insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          thumbnail_url: null, // Initially null
          caption: 'Beautiful sunset',
          guest_name: 'John Doe',
          status: 'processing', // Initially processing
        })
      );

      // Background processing should NOT have been awaited
      // (fetchFile and uploadFile will be called asynchronously after response)
    });

    it('should eventually generate thumbnail in background', async () => {
      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Initial response should be processing
      expect(data.media.status).toBe('processing');
      expect(data.media.thumbnail_url).toBeNull();

      // Wait for background processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify background processing was triggered
      expect(mockFetchFile).toHaveBeenCalledWith('weddings/wedding-123/media/photo.jpg');
      expect(mockUploadFile).toHaveBeenCalled();

      // Verify thumbnail was uploaded with correct format
      const uploadedBuffer = mockUploadFile.mock.calls[0][1];
      expect(uploadedBuffer).toBeInstanceOf(Buffer);
      expect(uploadedBuffer.length).toBeGreaterThan(0);

      // Verify it's actually a WEBP image by checking metadata
      const metadata = await sharp(uploadedBuffer).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBeLessThanOrEqual(400);
      expect(metadata.height).toBeLessThanOrEqual(300); // Aspect ratio maintained (800x600 -> 400x300)

      // Verify database update was called with thumbnail URL and ready status
      const updateCall = mockAdminClient.from('media').update;
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
          status: 'ready',
        })
      );
    });

    it('should not generate thumbnail for video uploads', async () => {
      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/video.mp4',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/video.mp4',
          contentType: 'video/mp4',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify fetchFile was NOT called (no thumbnail generation for videos)
      expect(mockFetchFile).not.toHaveBeenCalled();

      // Verify uploadFile was NOT called
      expect(mockUploadFile).not.toHaveBeenCalled();

      // Verify database insert has null thumbnail_url and ready status (videos don't need processing)
      const insertCall = mockAdminClient.from('media').insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'video',
          thumbnail_url: null,
          status: 'ready', // Videos are immediately ready
        })
      );

      // Verify response has ready status for videos
      expect(data.media.status).toBe('ready');
    });

    it('should handle thumbnail generation errors gracefully', async () => {
      // Mock fetchFile to throw an error
      mockFetchFile.mockRejectedValueOnce(new Error('R2 fetch failed'));

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Upload should still succeed even though thumbnail will fail
      expect(response.status).toBe(200);

      // Response should have processing status (background job will handle the error)
      expect(data.media.status).toBe('processing');
      expect(data.media.thumbnail_url).toBeNull();

      // Database insert should have processing status and null thumbnail_url
      const insertCall = mockAdminClient.from('media').insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image',
          thumbnail_url: null,
          status: 'processing',
        })
      );

      // Wait for background processing to fail gracefully
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify database update was called to set status to ready even after error
      const updateCall = mockAdminClient.from('media').update;
      expect(updateCall).toHaveBeenCalledWith({ status: 'ready' });
    });

    it('should use correct storage path for thumbnails', async () => {
      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/1234567890-abc123-my-photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/1234567890-abc123-my-photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      await POST({ request } as any);

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify thumbnail key follows the correct pattern
      expect(mockUploadFile).toHaveBeenCalledWith(
        'weddings/wedding-123/thumbnails/1234567890-abc123-my-photo-400w.webp',
        expect.any(Buffer),
        'image/webp',
        expect.objectContaining({
          'wedding-id': 'wedding-123',
          'original-key': 'weddings/wedding-123/media/1234567890-abc123-my-photo.jpg',
          'thumbnail-size': '400w',
        })
      );
    });

    it('should skip thumbnail generation for oversized images to prevent memory exhaustion', async () => {
      // Mock a 15MB buffer (exceeds 10MB limit)
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024);
      mockFetchFile.mockResolvedValueOnce(largeBuffer);

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/large-photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/large-photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Upload should still succeed with processing status
      expect(response.status).toBe(200);
      expect(data.media).toBeDefined();
      expect(data.media.status).toBe('processing');

      // Wait for background processing to detect size and update status
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify fetchFile was called to check size
      expect(mockFetchFile).toHaveBeenCalledWith('weddings/wedding-123/media/large-photo.jpg');

      // Verify uploadFile was NOT called (no thumbnail generated for oversized images)
      expect(mockUploadFile).not.toHaveBeenCalled();

      // Verify database update was called to set status to ready (without thumbnail)
      const updateCall = mockAdminClient.from('media').update;
      expect(updateCall).toHaveBeenCalledWith({ status: 'ready' });
    });
  });

  describe('Authorization', () => {
    it('should require valid authorization', async () => {
      // Mock auth to fail
      const { supabase } = await import('../../../lib/supabase/client');
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' } as any,
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);

      expect(response.status).toBe(401);

      // Should not attempt thumbnail generation
      expect(mockFetchFile).not.toHaveBeenCalled();
      expect(mockUploadFile).not.toHaveBeenCalled();
    });

    it('should reject cross-tenant upload attempts (key from different wedding)', async () => {
      // User authorized for wedding-123 tries to upload with key from wedding-456
      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-456/media/photo.jpg', // ❌ Wrong wedding!
          publicUrl: 'https://r2.example.com/weddings/wedding-456/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Should reject with 403 Forbidden
      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid key');
      expect(data.message).toContain('wedding-123');

      // Should not attempt thumbnail generation
      expect(mockFetchFile).not.toHaveBeenCalled();
      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency (Transaction Boundary Protection)', () => {
    it('should be idempotent - duplicate confirms return existing record', async () => {
      // Setup existing media record
      const existingMediaRecord = {
        id: 'media-existing-123',
        wedding_id: 'wedding-123',
        type: 'image',
        original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
        thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
        caption: 'Already uploaded',
        guest_name: 'Jane Doe',
        guest_identifier: null,
        status: 'ready',
        moderation_status: 'approved',
        created_at: new Date().toISOString(),
      };

      // Mock the idempotency check to return existing media
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: existingMediaRecord,
        error: null,
      });

      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { owner_id: 'owner-123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Should not be called' },
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
          caption: 'Duplicate attempt',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Should return 200 OK with existing media
      expect(response.status).toBe(200);
      expect(data.media.id).toBe('media-existing-123');
      expect(data.message).toContain('idempotent');

      // Should NOT attempt thumbnail generation (already exists)
      expect(mockFetchFile).not.toHaveBeenCalled();
      expect(mockUploadFile).not.toHaveBeenCalled();

      // Should NOT attempt database insert
      expect(mockMaybeSingle).toHaveBeenCalled();
    });

    it('should proceed with upload if idempotency check finds no existing media', async () => {
      // Mock the idempotency check to return no existing media
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockInsert = vi.fn();
      const mockSelect = vi.fn();
      const mockSingle = vi.fn();

      mockSingle.mockResolvedValue({
        data: {
          id: 'media-new-123',
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
          caption: 'New upload',
          status: 'ready',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { owner_id: 'owner-123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            }),
            insert: mockInsert,
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
          caption: 'New upload',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Should return 200 OK with new media
      expect(response.status).toBe(200);
      expect(data.media.id).toBe('media-new-123');

      // Should attempt database insert
      expect(mockInsert).toHaveBeenCalled();

      // Wait for background thumbnail generation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should attempt thumbnail generation in background
      expect(mockFetchFile).toHaveBeenCalled();
      expect(mockUploadFile).toHaveBeenCalled();
    });

    it('should continue upload if idempotency check encounters an error', async () => {
      // Mock the idempotency check to return an error (network issue, etc.)
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const mockInsert = vi.fn();
      const mockSelect = vi.fn();
      const mockSingle = vi.fn();

      mockSingle.mockResolvedValue({
        data: {
          id: 'media-123',
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
          caption: null,
          status: 'ready',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { owner_id: 'owner-123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: mockMaybeSingle,
                }),
              }),
            }),
            insert: mockInsert,
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);

      // Should still succeed despite idempotency check error
      expect(response.status).toBe(200);

      // Should attempt database insert
      expect(mockInsert).toHaveBeenCalled();

      // Wait for background thumbnail generation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should attempt thumbnail generation in background
      expect(mockFetchFile).toHaveBeenCalled();
      expect(mockUploadFile).toHaveBeenCalled();
    });
  });

  describe('Data Integrity - Orphaned Thumbnails Prevention', () => {
    it('should not leave orphaned thumbnails if database insert fails', async () => {
      // Mock database insert to fail (e.g., trial limit reached, validation error)
      const mockInsert = vi.fn();
      const mockSelect = vi.fn();
      const mockSingle = vi.fn();

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'TRIAL_PHOTO_LIMIT: Trial limit reached' },
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { owner_id: 'owner-123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: mockInsert,
          };
        }
        return {};
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);

      // Should fail with trial limit error
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('TRIAL_PHOTO_LIMIT');

      // Verify database insert was attempted
      expect(mockInsert).toHaveBeenCalled();

      // Wait to ensure background processing doesn't start
      await new Promise(resolve => setTimeout(resolve, 100));

      // CRITICAL: Verify thumbnail was NOT generated because DB insert failed
      // With async processing, thumbnails are only generated AFTER successful DB insert
      expect(mockFetchFile).not.toHaveBeenCalled();
      expect(mockUploadFile).not.toHaveBeenCalled();
    });

    it('should upload thumbnail after successful database insert', async () => {
      // Mock successful database insert followed by update
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockInsert = vi.fn();
      const mockSelect = vi.fn();
      const mockSingle = vi.fn();

      mockSingle.mockImplementation(() => {
        const insertedData = mockInsert.mock.calls[mockInsert.mock.calls.length - 1]?.[0];
        return Promise.resolve({
          data: {
            id: 'media-123',
            ...insertedData,
            created_at: new Date().toISOString(),
          },
          error: null,
        });
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { owner_id: 'owner-123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: mockInsert,
            update: mockUpdate,
          };
        }
        return {};
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);

      // Should succeed
      expect(response.status).toBe(200);

      // Verify database insert happened first
      expect(mockInsert).toHaveBeenCalled();

      // Wait for background thumbnail generation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify thumbnail was generated in background
      expect(mockFetchFile).toHaveBeenCalledWith('weddings/wedding-123/media/photo.jpg');

      // Verify thumbnail was uploaded AFTER database insert
      expect(mockUploadFile).toHaveBeenCalled();

      // Verify database update with thumbnail URL happened after upload
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
          status: 'ready',
        })
      );
    });

    it('should handle thumbnail upload failure gracefully after successful database insert', async () => {
      // Mock uploadFile to fail
      mockUploadFile.mockRejectedValueOnce(new Error('R2 upload failed'));

      // Mock successful database insert
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const mockInsert = vi.fn();
      const mockSelect = vi.fn();
      const mockSingle = vi.fn();

      mockSingle.mockImplementation(() => {
        const insertedData = mockInsert.mock.calls[mockInsert.mock.calls.length - 1]?.[0];
        return Promise.resolve({
          data: {
            id: 'media-123',
            ...insertedData,
            created_at: new Date().toISOString(),
          },
          error: null,
        });
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockAdminClient.from = vi.fn((table: string) => {
        if (table === 'weddings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { owner_id: 'owner-123' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'media') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: mockInsert,
            update: mockUpdate,
          };
        }
        return {};
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);

      // Should still succeed (graceful degradation)
      expect(response.status).toBe(200);

      // Verify database insert succeeded
      expect(mockInsert).toHaveBeenCalled();

      // Wait for background thumbnail generation to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify thumbnail upload was attempted but failed
      expect(mockUploadFile).toHaveBeenCalled();

      // Verify database update WAS called to set status to 'ready' despite upload failure
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'ready' });

      // Verify response shows processing status and no thumbnail URL initially
      const data = await response.json();
      expect(data.media.thumbnail_url).toBeNull();
      expect(data.media.status).toBe('processing');
    });
  });

  describe('Rate Limiting - Per-Wedding Protection', () => {
    it('should enforce per-wedding rate limit', async () => {
      // Mock checkWeddingRateLimit to return rate limited
      const { checkWeddingRateLimit } = await import('../../../lib/rateLimit');
      vi.mocked(checkWeddingRateLimit).mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
        retryAfterSeconds: 60,
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      // Should return 429 Too Many Requests
      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit exceeded');
      expect(data.retryAfter).toBe(60);

      // Should not attempt upload or thumbnail generation
      expect(mockFetchFile).not.toHaveBeenCalled();
      expect(mockUploadFile).not.toHaveBeenCalled();

      // Should include rate limit headers
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(response.headers.get('X-RateLimit-Limit')).toBe('50');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should allow uploads when within per-wedding rate limit', async () => {
      // Mock checkWeddingRateLimit to allow request
      const { checkWeddingRateLimit } = await import('../../../lib/rateLimit');
      vi.mocked(checkWeddingRateLimit).mockReturnValueOnce({
        allowed: true,
        remaining: 25,
        resetAt: new Date(Date.now() + 60000),
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);

      // Should succeed
      expect(response.status).toBe(200);
      expect(checkWeddingRateLimit).toHaveBeenCalledWith('wedding-123', expect.objectContaining({
        limit: 50,
        windowSeconds: 60,
      }));
    });

    it('should check per-wedding rate limit AFTER IP rate limit', async () => {
      const { checkRateLimit, checkWeddingRateLimit } = await import('../../../lib/rateLimit');

      // Reset mocks to track call order
      vi.mocked(checkRateLimit).mockClear();
      vi.mocked(checkWeddingRateLimit).mockClear();

      vi.mocked(checkRateLimit).mockReturnValueOnce({
        allowed: true,
        remaining: 10,
        resetAt: new Date(Date.now() + 60000),
      });

      vi.mocked(checkWeddingRateLimit).mockReturnValueOnce({
        allowed: true,
        remaining: 30,
        resetAt: new Date(Date.now() + 60000),
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      await POST({ request } as any);

      // Both rate limits should be checked
      expect(checkRateLimit).toHaveBeenCalledWith('127.0.0.1', expect.any(Object));
      expect(checkWeddingRateLimit).toHaveBeenCalledWith('wedding-123', expect.any(Object));

      // IP check should happen before wedding check (call order matters)
      const checkRateLimitCallOrder = vi.mocked(checkRateLimit).mock.invocationCallOrder[0];
      const checkWeddingRateLimitCallOrder = vi.mocked(checkWeddingRateLimit).mock.invocationCallOrder[0];
      expect(checkRateLimitCallOrder).toBeLessThan(checkWeddingRateLimitCallOrder);
    });

    it('should not affect other weddings when one wedding is rate limited', async () => {
      const { checkWeddingRateLimit } = await import('../../../lib/rateLimit');

      // First request to wedding-123: rate limited
      vi.mocked(checkWeddingRateLimit).mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
        retryAfterSeconds: 60,
      });

      const request1 = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response1 = await POST({ request: request1 } as any);
      expect(response1.status).toBe(429);

      // Second request to wedding-456: should succeed
      vi.mocked(checkWeddingRateLimit).mockReturnValueOnce({
        allowed: true,
        remaining: 49,
        resetAt: new Date(Date.now() + 60000),
      });

      const request2 = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-456',
          key: 'weddings/wedding-456/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-456/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response2 = await POST({ request: request2 } as any);
      expect(response2.status).toBe(200);

      // Verify both weddings were checked independently
      expect(checkWeddingRateLimit).toHaveBeenCalledWith('wedding-123', expect.any(Object));
      expect(checkWeddingRateLimit).toHaveBeenCalledWith('wedding-456', expect.any(Object));
    });

    it('should include detailed error message when wedding rate limit is exceeded', async () => {
      const { checkWeddingRateLimit } = await import('../../../lib/rateLimit');
      vi.mocked(checkWeddingRateLimit).mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 45000),
        retryAfterSeconds: 45,
      });

      const request = new Request('http://localhost:4321/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({
          weddingId: 'wedding-123',
          key: 'weddings/wedding-123/media/photo.jpg',
          publicUrl: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          contentType: 'image/jpeg',
        }),
      });

      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded for this wedding');
      expect(data.message).toContain('Maximum 50 uploads per minute per wedding');
      expect(data.message).toContain('45 seconds');
      expect(data.retryAfter).toBe(45);
    });
  });
});
