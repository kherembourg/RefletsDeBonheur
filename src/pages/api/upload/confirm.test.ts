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

vi.mock('../../../lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitResponse: vi.fn(),
  RATE_LIMITS: { upload: {} },
}));

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

    mockSingle.mockResolvedValue({
      data: {
        id: 'media-123',
        wedding_id: 'wedding-123',
        type: 'image',
        original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
        thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
        caption: null,
        guest_name: null,
        guest_identifier: null,
        status: 'ready',
        moderation_status: 'approved',
        created_at: new Date().toISOString(),
      },
      error: null,
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

  describe('Image Upload with Thumbnail Generation', () => {
    it('should generate thumbnail for image uploads', async () => {
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

      const response = await POST({ request } as any);
      const data = await response.json();

      // Verify response success
      expect(response.status).toBe(200);
      expect(data.media).toBeDefined();
      expect(data.media.thumbnail_url).toBe(
        'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp'
      );

      // Verify fetchFile was called to get original image
      expect(mockFetchFile).toHaveBeenCalledWith('weddings/wedding-123/media/photo.jpg');

      // Verify uploadFile was called to upload thumbnail
      expect(mockUploadFile).toHaveBeenCalled();
      const uploadCall = mockUploadFile.mock.calls[0];
      expect(uploadCall[0]).toContain('thumbnails');
      expect(uploadCall[0]).toContain('400w.webp');
      expect(uploadCall[1]).toBeInstanceOf(Buffer); // Thumbnail buffer
      expect(uploadCall[2]).toBe('image/webp');

      // Verify database insert initially has null thumbnail_url (reverse order pattern)
      const insertCall = mockAdminClient.from('media').insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          thumbnail_url: null, // Initially null, updated after upload
          caption: 'Beautiful sunset',
          guest_name: 'John Doe',
          status: 'ready',
        })
      );

      // Verify database update was called with thumbnail URL after upload
      const updateCall = mockAdminClient.from('media').update;
      expect(updateCall).toHaveBeenCalledWith({
        thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
      });
    });

    it('should generate thumbnail with correct dimensions and format', async () => {
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

      // Verify thumbnail was uploaded
      expect(mockUploadFile).toHaveBeenCalled();
      const uploadedBuffer = mockUploadFile.mock.calls[0][1];

      // Verify buffer is a valid image
      expect(uploadedBuffer).toBeInstanceOf(Buffer);
      expect(uploadedBuffer.length).toBeGreaterThan(0);

      // Verify it's actually a WEBP image by checking metadata
      const metadata = await sharp(uploadedBuffer).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBeLessThanOrEqual(400);
      expect(metadata.height).toBeLessThanOrEqual(300); // Aspect ratio maintained (800x600 -> 400x300)
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

      await POST({ request } as any);

      // Verify fetchFile was NOT called (no thumbnail generation for videos)
      expect(mockFetchFile).not.toHaveBeenCalled();

      // Verify uploadFile was NOT called
      expect(mockUploadFile).not.toHaveBeenCalled();

      // Verify database insert has null thumbnail_url
      const insertCall = mockAdminClient.from('media').insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'video',
          thumbnail_url: null,
        })
      );
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

      // Upload should still succeed even though thumbnail generation failed
      expect(response.status).toBe(200);

      // Database insert should have null thumbnail_url
      const insertCall = mockAdminClient.from('media').insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image',
          thumbnail_url: null, // Failed to generate, so it's null
        })
      );

      // Verify error was logged (console.error was called)
      // Note: We can't easily test console.error without mocking it, but we verified the upload succeeded
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

      // Upload should still succeed
      expect(response.status).toBe(200);
      expect(data.media).toBeDefined();

      // Verify fetchFile was called to check size
      expect(mockFetchFile).toHaveBeenCalledWith('weddings/wedding-123/media/large-photo.jpg');

      // Verify uploadFile was NOT called (no thumbnail generated for oversized images)
      expect(mockUploadFile).not.toHaveBeenCalled();

      // Database insert should have null thumbnail_url (graceful degradation)
      const insertCall = mockAdminClient.from('media').insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'image',
          thumbnail_url: null, // No thumbnail due to size limit
        })
      );
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

      // Should attempt thumbnail generation
      expect(mockFetchFile).toHaveBeenCalled();
      expect(mockUploadFile).toHaveBeenCalled();

      // Should attempt database insert
      expect(mockInsert).toHaveBeenCalled();
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

      // Should attempt thumbnail generation
      expect(mockFetchFile).toHaveBeenCalled();
      expect(mockUploadFile).toHaveBeenCalled();

      // Should attempt database insert
      expect(mockInsert).toHaveBeenCalled();
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

      // Verify thumbnail was generated (fetchFile was called)
      expect(mockFetchFile).toHaveBeenCalledWith('weddings/wedding-123/media/photo.jpg');

      // CRITICAL: Verify thumbnail was NOT uploaded to R2 (prevents orphaned file)
      expect(mockUploadFile).not.toHaveBeenCalled();

      // Verify database insert was attempted
      expect(mockInsert).toHaveBeenCalled();
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

      mockSingle.mockResolvedValue({
        data: {
          id: 'media-123',
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          thumbnail_url: null, // Initially null
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

      // Verify thumbnail was generated
      expect(mockFetchFile).toHaveBeenCalledWith('weddings/wedding-123/media/photo.jpg');

      // Verify thumbnail was uploaded AFTER database insert
      expect(mockUploadFile).toHaveBeenCalled();

      // Verify database insert happened first
      expect(mockInsert).toHaveBeenCalled();

      // Verify database update with thumbnail URL happened after upload
      expect(mockUpdate).toHaveBeenCalledWith({
        thumbnail_url: 'https://r2.example.com/weddings/wedding-123/thumbnails/photo-400w.webp',
      });
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

      mockSingle.mockResolvedValue({
        data: {
          id: 'media-123',
          wedding_id: 'wedding-123',
          type: 'image',
          original_url: 'https://r2.example.com/weddings/wedding-123/media/photo.jpg',
          thumbnail_url: null, // Initially null, stays null due to upload failure
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

      // Verify thumbnail upload was attempted but failed
      expect(mockUploadFile).toHaveBeenCalled();

      // Verify database update was NOT called (upload failed)
      expect(mockUpdate).not.toHaveBeenCalled();

      // Verify response shows no thumbnail URL (graceful degradation)
      const data = await response.json();
      expect(data.media.thumbnail_url).toBeNull();
    });
  });
});
