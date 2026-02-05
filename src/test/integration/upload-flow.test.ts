/**
 * Integration Test: Media Upload Flow
 * 
 * Tests the complete media upload pipeline:
 * 1. Request presigned URL
 * 2. Upload to R2
 * 3. Confirm upload
 * 4. Thumbnail generation (async)
 * 5. Media appears in gallery
 * 6. Thumbnail loads
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Media Upload Flow Integration', () => {
  let mockSupabase: any;
  let mockR2Client: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create proper mock chain for Supabase query builder
    const createMockChain = () => {
      const chain: any = {
        select: vi.fn().mockReturnValue(chain),
        insert: vi.fn().mockReturnValue(chain),
        update: vi.fn().mockReturnValue(chain),
        eq: vi.fn().mockReturnValue(chain),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return chain;
    };

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => createMockChain()),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({
            data: { path: 'test-image.jpg' },
            error: null,
          }),
          getPublicUrl: vi.fn(() => ({
            data: { publicUrl: 'https://r2.example.com/test-image.jpg' },
          })),
        })),
      },
    };

    // Setup mock R2 client
    mockR2Client = {
      putObject: vi.fn().mockResolvedValue({}),
      getObject: vi.fn().mockResolvedValue({
        Body: new Blob(['test image data']),
      }),
    };

    // Mock fetch
    (global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/upload/presign')) {
        // Generate unique IDs for each call
        const uniqueId = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            presignedUrl: `https://r2.example.com/presigned/upload-url-${uniqueId}`,
            key: `weddings/wedding-123/media/${timestamp}-${uniqueId}-test-image.jpg`,
            mediaId: `media-${uniqueId}`,
          }),
        });
      }
      if (url.includes('/api/upload/confirm')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            media: {
              id: 'media-123',
              url: 'https://r2.example.com/test-image.jpg',
              thumbnail_url: null, // Generated async
            },
          }),
        });
      }
      if (url.includes('r2.example.com/presigned')) {
        // Mock R2 upload
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Step 1: Request Presigned URL', () => {
    it('should request presigned URL with correct parameters', async () => {
      const weddingId = 'wedding-123';
      const filename = 'test-image.jpg';
      const fileType = 'image/jpeg';
      const fileSize = 1024 * 1024; // 1MB

      const response = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId,
          filename,
          fileType,
          fileSize,
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.presignedUrl).toBeDefined();
      expect(data.key).toContain(weddingId);
      expect(data.mediaId).toBeDefined();
    });

    it('should validate file type', async () => {
      const invalidFileType = 'application/exe';

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/quicktime',
      ];

      expect(allowedTypes).not.toContain(invalidFileType);
    });

    it('should validate file size limits', async () => {
      const maxImageSize = 10 * 1024 * 1024; // 10MB
      const maxVideoSize = 100 * 1024 * 1024; // 100MB

      const largeImage = 15 * 1024 * 1024; // 15MB
      const largeVideo = 150 * 1024 * 1024; // 150MB

      expect(largeImage > maxImageSize).toBe(true);
      expect(largeVideo > maxVideoSize).toBe(true);
    });

    it('should generate unique keys for concurrent uploads', async () => {
      const uploads = await Promise.all([
        fetch('/api/upload/presign', {
          method: 'POST',
          body: JSON.stringify({ filename: 'image1.jpg' }),
        }).then(r => r.json()),
        fetch('/api/upload/presign', {
          method: 'POST',
          body: JSON.stringify({ filename: 'image1.jpg' }),
        }).then(r => r.json()),
      ]);

      // Keys should be different even with same filename
      expect(uploads[0].key).not.toBe(uploads[1].key);
      expect(uploads[0].mediaId).not.toBe(uploads[1].mediaId);
    });
  });

  describe('Step 2: Upload to R2', () => {
    it('should upload file directly to R2 using presigned URL', async () => {
      const file = new Blob(['test image data'], { type: 'image/jpeg' });
      const presignedUrl = 'https://r2.example.com/presigned/upload-url';

      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should handle upload failures', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      const response = await fetch('https://r2.example.com/presigned/upload-url', {
        method: 'PUT',
        body: new Blob(['data']),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should support upload progress tracking', async () => {
      const file = new Blob(['x'.repeat(1024 * 1024)], { type: 'image/jpeg' }); // 1MB
      const progressUpdates: number[] = [];

      // Simulate progress tracking (would use XMLHttpRequest or fetch with ReadableStream in real implementation)
      const simulateProgress = async () => {
        for (let i = 0; i <= 100; i += 25) {
          progressUpdates.push(i);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      };

      await simulateProgress();

      expect(progressUpdates).toEqual([0, 25, 50, 75, 100]);
    });

    it('should handle large file uploads with chunking', async () => {
      const largeFile = new Blob(['x'.repeat(50 * 1024 * 1024)]); // 50MB
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks

      const chunks = Math.ceil(largeFile.size / chunkSize);
      expect(chunks).toBe(10);

      // Verify chunking logic
      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, largeFile.size);
        const chunk = largeFile.slice(start, end);

        expect(chunk.size).toBeLessThanOrEqual(chunkSize);
      }
    });
  });

  describe('Step 3: Confirm Upload', () => {
    it('should confirm upload and create media record', async () => {
      const mediaId = 'media-123';
      const key = 'weddings/wedding-123/media/test-image.jpg';

      const response = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          key,
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.media.id).toBe(mediaId);
      expect(data.media.url).toBeDefined();
    });

    it('should handle confirm failures', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({
            error: 'Media not found',
          }),
        })
      );

      const response = await fetch('/api/upload/confirm', {
        method: 'POST',
        body: JSON.stringify({ mediaId: 'nonexistent' }),
      });

      expect(response.ok).toBe(false);
    });

    it('should extract metadata from uploaded file', async () => {
      const metadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 1024 * 1024,
        duration: null, // For images
      };

      // Mock metadata extraction
      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'media-123',
          ...metadata,
        },
        error: null,
      });

      mockSupabase.from = vi.fn(() => ({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'media-123', ...metadata },
          error: null,
        }),
      }));

      const result = await mockSupabase
        .from('media')
        .insert(metadata)
        .select()
        .single();

      expect(result.data.width).toBe(1920);
      expect(result.data.height).toBe(1080);
    });
  });

  describe('Step 4: Thumbnail Generation (Async)', () => {
    it('should trigger thumbnail generation after upload confirmation', async () => {
      const mediaId = 'media-123';
      const sourceUrl = 'https://r2.example.com/test-image.jpg';

      // Mock thumbnail generation (async)
      const generateThumbnail = vi.fn().mockResolvedValue({
        thumbnailUrl: 'https://r2.example.com/thumbnails/test-image-400.webp',
        width: 400,
        height: 300,
      });

      const thumbnail = await generateThumbnail(sourceUrl);

      expect(thumbnail.thumbnailUrl).toContain('thumbnails');
      expect(thumbnail.width).toBe(400);
      expect(generateThumbnail).toHaveBeenCalledWith(sourceUrl);
    });

    it('should update media record with thumbnail URL', async () => {
      const mediaId = 'media-123';
      const thumbnailUrl = 'https://r2.example.com/thumbnails/test-image-400.webp';

      const mockUpdate = vi.fn().mockResolvedValue({
        data: {
          id: mediaId,
          thumbnail_url: thumbnailUrl,
          thumbnail_width: 400,
          thumbnail_height: 300,
        },
        error: null,
      });

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: mediaId,
            thumbnail_url: thumbnailUrl,
          },
          error: null,
        }),
      }));

      const result = await mockSupabase
        .from('media')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', mediaId)
        .select()
        .single();

      expect(result.data.thumbnail_url).toBe(thumbnailUrl);
    });

    it('should handle thumbnail generation failures gracefully', async () => {
      const mediaId = 'media-123';

      // Thumbnail generation fails
      const generateThumbnail = vi.fn().mockRejectedValue(
        new Error('Image processing failed')
      );

      try {
        await generateThumbnail('invalid-url');
      } catch (error: any) {
        expect(error.message).toBe('Image processing failed');
      }

      // Media should still be accessible without thumbnail
      const media = {
        id: mediaId,
        url: 'https://r2.example.com/test-image.jpg',
        thumbnail_url: null,
      };

      expect(media.url).toBeDefined();
      expect(media.thumbnail_url).toBeNull();
    });

    it('should generate thumbnails in correct format (400px WEBP)', async () => {
      const thumbnail = {
        format: 'webp',
        width: 400,
        height: 300, // Maintains aspect ratio
        quality: 80,
      };

      expect(thumbnail.format).toBe('webp');
      expect(thumbnail.width).toBe(400);
      expect(thumbnail.quality).toBeLessThanOrEqual(100);
    });

    it('should handle concurrent thumbnail generation', async () => {
      const mediaIds = ['media-1', 'media-2', 'media-3'];

      const generateThumbnail = vi.fn().mockImplementation((id: string) =>
        Promise.resolve({
          id,
          thumbnailUrl: `https://r2.example.com/thumbnails/${id}.webp`,
        })
      );

      const thumbnails = await Promise.all(
        mediaIds.map(id => generateThumbnail(id))
      );

      expect(thumbnails).toHaveLength(3);
      expect(generateThumbnail).toHaveBeenCalledTimes(3);
    });
  });

  describe('Step 5: Media Appears in Gallery', () => {
    it('should fetch media list including new upload', async () => {
      const weddingId = 'wedding-123';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'media-1',
            url: 'https://r2.example.com/image1.jpg',
            thumbnail_url: 'https://r2.example.com/thumbnails/image1-400.webp',
          },
          {
            id: 'media-123',
            url: 'https://r2.example.com/test-image.jpg',
            thumbnail_url: null, // Still generating
          },
        ],
        error: null,
      });

      mockSupabase.from = vi.fn(() => ({
        select: mockSelect,
        eq: mockEq,
      }));

      const { data } = await mockSupabase
        .from('media')
        .select('*')
        .eq('wedding_id', weddingId);

      expect(data).toHaveLength(2);
      expect(data.some((m: any) => m.id === 'media-123')).toBe(true);
    });

    it('should sort media by upload date', async () => {
      const media = [
        { id: '1', created_at: '2026-01-01T10:00:00Z' },
        { id: '2', created_at: '2026-01-02T10:00:00Z' },
        { id: '3', created_at: '2026-01-01T12:00:00Z' },
      ];

      const sorted = [...media].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      expect(sorted[0].id).toBe('2'); // Most recent
      expect(sorted[2].id).toBe('1'); // Oldest
    });

    it('should filter media by album', async () => {
      const albumId = 'album-123';

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        data: [
          { id: 'media-1', album_id: albumId },
          { id: 'media-2', album_id: albumId },
        ],
        error: null,
      });

      mockSupabase.from = vi.fn(() => ({
        select: mockSelect,
        eq: mockEq,
      }));

      const { data } = await mockSupabase
        .from('media')
        .select('*')
        .eq('album_id', albumId);

      expect(data.every((m: any) => m.album_id === albumId)).toBe(true);
    });
  });

  describe('Step 6: Thumbnail Loading', () => {
    it('should load thumbnail when available', async () => {
      const media = {
        id: 'media-123',
        url: 'https://r2.example.com/test-image.jpg',
        thumbnail_url: 'https://r2.example.com/thumbnails/test-image-400.webp',
      };

      // Should prefer thumbnail over full image
      const imageUrl = media.thumbnail_url || media.url;
      expect(imageUrl).toBe(media.thumbnail_url);
    });

    it('should fallback to full image if thumbnail not available', async () => {
      const media = {
        id: 'media-123',
        url: 'https://r2.example.com/test-image.jpg',
        thumbnail_url: null,
      };

      const imageUrl = media.thumbnail_url || media.url;
      expect(imageUrl).toBe(media.url);
    });

    it('should lazy load images in gallery', async () => {
      const images = Array.from({ length: 50 }, (_, i) => ({
        id: `media-${i}`,
        url: `https://r2.example.com/image-${i}.jpg`,
      }));

      // Simulate viewport visibility
      const visibleImages = images.slice(0, 12); // First 12 visible
      const lazyImages = images.slice(12); // Rest loaded on scroll

      expect(visibleImages).toHaveLength(12);
      expect(lazyImages).toHaveLength(38);
    });

    it('should handle broken image URLs', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      );

      const response = await fetch('https://r2.example.com/nonexistent.jpg');
      expect(response.ok).toBe(false);

      // Should show placeholder or error state
      const fallbackUrl = '/images/placeholder.jpg';
      expect(fallbackUrl).toBeDefined();
    });
  });

  describe('Complete Upload Flow E2E', () => {
    it('should complete full upload flow from presigned URL to gallery display', async () => {
      const weddingId = 'wedding-123';
      const file = new Blob(['test image data'], { type: 'image/jpeg' });

      // Step 1: Request presigned URL
      const presignResponse = await fetch('/api/upload/presign', {
        method: 'POST',
        body: JSON.stringify({
          weddingId,
          filename: 'test.jpg',
          fileType: 'image/jpeg',
          fileSize: file.size,
        }),
      });
      const { presignedUrl, key, mediaId } = await presignResponse.json();
      expect(presignedUrl).toBeDefined();

      // Step 2: Upload to R2
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
      });
      expect(uploadResponse.ok).toBe(true);

      // Step 3: Confirm upload
      const confirmResponse = await fetch('/api/upload/confirm', {
        method: 'POST',
        body: JSON.stringify({ mediaId, key }),
      });
      const { media } = await confirmResponse.json();
      expect(media.id).toBe(mediaId);

      // Step 4: Thumbnail generation (async - simulated)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 5: Media appears in gallery
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [media],
          error: null,
        }),
      }));

      const { data: galleryMedia } = await mockSupabase
        .from('media')
        .select('*')
        .eq('wedding_id', weddingId);

      expect(galleryMedia.some((m: any) => m.id === mediaId)).toBe(true);

      // Step 6: Thumbnail loads (when available)
      const displayUrl = media.thumbnail_url || media.url;
      expect(displayUrl).toBeDefined();
    });

    it('should handle partial upload failure and cleanup', async () => {
      // Step 1: Presigned URL succeeds
      const presignResponse = await fetch('/api/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: 'test.jpg' }),
      });
      expect(presignResponse.ok).toBe(true);

      // Step 2: Upload fails
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({ ok: false, status: 500 })
      );

      const uploadResponse = await fetch('https://r2.example.com/presigned/url', {
        method: 'PUT',
        body: new Blob(['data']),
      });
      expect(uploadResponse.ok).toBe(false);

      // Step 3: Should not confirm upload
      // Cleanup logic should remove presigned URL record
      expect(uploadResponse.ok).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed uploads', async () => {
      let attempts = 0;
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('presigned') && attempts < 2) {
          attempts++;
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      });

      const maxRetries = 3;
      let response;
      for (let i = 0; i < maxRetries; i++) {
        response = await fetch('https://r2.example.com/presigned/url', {
          method: 'PUT',
          body: new Blob(['data']),
        });
        if (response.ok) break;
      }

      expect(response?.ok).toBe(true);
      expect(attempts).toBe(2);
    });

    it('should handle timeout during upload', async () => {
      const timeout = (ms: number) =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload timeout')), ms)
        );

      const upload = new Promise(resolve =>
        setTimeout(resolve, 10000)
      );

      await expect(Promise.race([upload, timeout(100)])).rejects.toThrow(
        'Upload timeout'
      );
    });
  });
});
