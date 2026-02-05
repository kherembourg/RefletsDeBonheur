import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';

// Mock AWS SDK with proper class constructors
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn(function (this: any, config: any) {
      this.config = config;
      return {
        send: vi.fn(),
        config: this.config,
      };
    }),
    GetObjectCommand: vi.fn().mockImplementation(function (this: any, params: any) {
      this.params = params;
    }),
    PutObjectCommand: vi.fn().mockImplementation(function (this: any, params: any) {
      this.params = params;
    }),
    DeleteObjectCommand: vi.fn().mockImplementation(function (this: any, params: any) {
      this.params = params;
    }),
    HeadObjectCommand: vi.fn().mockImplementation(function (this: any, params: any) {
      this.params = params;
    }),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

import {
  getR2Config,
  isR2Configured,
  getS3Client,
  generateStorageKey,
  generatePresignedUploadUrl,
  uploadFile,
  fetchFile,
  getPublicUrl,
  extractKeyFromUrl,
  generateThumbnailKey,
} from './client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

describe('R2 Client - Configuration & Client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('getR2Config', () => {
    it('should return config when all env vars are set', () => {
      vi.stubEnv('R2_ACCOUNT_ID', 'test-account-123');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'test-access-key');
      vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret-key');
      vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');

      const config = getR2Config();

      expect(config).toEqual({
        accountId: 'test-account-123',
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        bucketName: 'test-bucket',
        publicUrl: 'https://test-bucket.test-account-123.r2.cloudflarestorage.com',
      });
    });

    it('should return null when env vars are missing', () => {
      // No env vars set
      expect(getR2Config()).toBeNull();
    });

    it('should return null when only some env vars are set', () => {
      vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
      expect(getR2Config()).toBeNull();
      vi.unstubAllEnvs();

      vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
      expect(getR2Config()).toBeNull();
      vi.unstubAllEnvs();

      vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
      vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
      expect(getR2Config()).toBeNull();
    });
  });

  describe('isR2Configured', () => {
    it('should return true when all env vars are set', () => {
      vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'test-access-key');
      vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret-key');
      vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');

      expect(isR2Configured()).toBe(true);
    });

    it('should return false when env vars are missing', () => {
      expect(isR2Configured()).toBe(false);
    });
  });

  describe('getS3Client', () => {
    it('should create S3Client with correct configuration (region: auto, endpoint, credentials)', () => {
      vi.stubEnv('R2_ACCOUNT_ID', 'my-account-123');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'my-access-key');
      vi.stubEnv('R2_SECRET_ACCESS_KEY', 'my-secret-key');
      vi.stubEnv('R2_BUCKET_NAME', 'my-bucket');

      const client = getS3Client();

      expect(client).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://my-account-123.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'my-access-key',
          secretAccessKey: 'my-secret-key',
        },
      });
    });

    it('should throw error when R2 not configured', () => {
      // Clear all mocks and env vars to test actual error
      vi.clearAllMocks();
      vi.unstubAllEnvs();

      // Test with no env vars - should throw before creating client
      let didThrow = false;
      try {
        getS3Client();
      } catch (error: any) {
        didThrow = true;
        expect(error.message).toContain('R2 is not configured');
      }
      expect(didThrow).toBe(true);
    });
  });
});

describe('R2 Client - Storage Key Operations', () => {
  beforeEach(() => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-access-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret-key');
    vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('generateStorageKey', () => {
    it('should create valid key with timestamp, random, and sanitized filename', () => {
      const key = generateStorageKey({
        weddingId: 'test-wedding-123',
        fileName: 'my_photo.jpg',
        contentType: 'image/jpeg',
      });

      // Underscores are preserved in filename, not converted to dashes
      expect(key).toMatch(/^weddings\/test-wedding-123\/media\/\d+-[a-z0-9]+-my_photo\.jpg$/);
    });

    it('should follow pattern: weddings/{id}/media/{timestamp}-{random}-{name}.{ext}', () => {
      const key = generateStorageKey({
        weddingId: 'abc-123',
        fileName: 'image.png',
        contentType: 'image/png',
      });

      // Check structure
      expect(key).toMatch(/^weddings\/abc-123\/media\/.+$/);
      
      // Extract filename part
      const parts = key.split('/');
      expect(parts[0]).toBe('weddings');
      expect(parts[1]).toBe('abc-123');
      expect(parts[2]).toBe('media');
      
      // Filename should have timestamp-random-originalname pattern
      const filename = parts[3];
      expect(filename).toMatch(/^\d+-[a-z0-9]+-image\.png$/);
    });

    it('should sanitize filenames with special characters', () => {
      const key = generateStorageKey({
        weddingId: 'wedding-1',
        fileName: 'photo with spaces & special!@#.jpg',
        contentType: 'image/jpeg',
      });

      // Special chars and spaces are replaced with dashes
      expect(key).toMatch(/^weddings\/wedding-1\/media\/\d+-[a-z0-9]+-photo-with-spaces---special---\.jpg$/);
    });

    it('should include timestamp in key', () => {
      const beforeTimestamp = Date.now();
      
      const key = generateStorageKey({
        weddingId: 'wedding-1',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      const afterTimestamp = Date.now();
      
      // Extract timestamp from key (first part of filename)
      const filename = key.split('/')[3];
      const timestamp = parseInt(filename.split('-')[0], 10);
      
      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should include random string for uniqueness', () => {
      const key1 = generateStorageKey({
        weddingId: 'wedding-1',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      const key2 = generateStorageKey({
        weddingId: 'wedding-1',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      // Keys should be different due to random component
      expect(key1).not.toBe(key2);
    });

    it('should preserve file extension', () => {
      const extensions = ['jpg', 'png', 'gif', 'webp', 'mp4', 'mov'];

      extensions.forEach(ext => {
        const key = generateStorageKey({
          weddingId: 'wedding-1',
          fileName: `file.${ext}`,
          contentType: `image/${ext}`,
        });

        expect(key).toMatch(new RegExp(`\\.${ext}$`));
      });
    });
  });

  describe('validateStorageKey via function calls', () => {
    it('should accept valid keys', () => {
      expect(() => {
        generateStorageKey({
          weddingId: 'test-123',
          fileName: 'photo.jpg',
          contentType: 'image/jpeg',
        });
      }).not.toThrow();
    });

    it('should reject keys with path traversal', async () => {
      await expect(
        uploadFile('weddings/../etc/passwd', Buffer.from('test'), 'text/plain')
      ).rejects.toThrow('path traversal detected');
    });

    it('should reject keys without weddings/ prefix', async () => {
      await expect(
        uploadFile('admin/file.jpg', Buffer.from('test'), 'image/jpeg')
      ).rejects.toThrow('must start with weddings/');
    });

    it('should reject keys not matching expected pattern', async () => {
      await expect(
        uploadFile('weddings/123/invalid/file.jpg', Buffer.from('test'), 'image/jpeg')
      ).rejects.toThrow('does not match expected pattern');
    });

    it('should reject keys that are too long (>500 chars)', async () => {
      const longKey = 'weddings/abc/media/' + 'a'.repeat(500) + '.jpg';
      await expect(
        uploadFile(longKey, Buffer.from('test'), 'image/jpeg')
      ).rejects.toThrow('too long');
    });
  });
});

describe('R2 Client - Thumbnail Key Generation', () => {
  describe('generateThumbnailKey', () => {
    it('should convert media key to thumbnail key with 400w suffix', () => {
      const mediaKey = 'weddings/test-123/media/photo.jpg';
      const thumbnailKey = generateThumbnailKey(mediaKey);

      expect(thumbnailKey).toBe('weddings/test-123/thumbnails/photo-400w.webp');
    });

    it('should use .webp extension', () => {
      const keys = [
        'weddings/abc/media/photo.jpg',
        'weddings/abc/media/image.png',
        'weddings/abc/media/file.gif',
      ];

      keys.forEach(key => {
        const result = generateThumbnailKey(key);
        expect(result.endsWith('.webp')).toBe(true);
      });
    });

    it('should follow pattern: weddings/{id}/thumbnails/{name}-{suffix}.webp', () => {
      const result = generateThumbnailKey('weddings/wedding-456/media/my-photo.jpg', '800w');

      expect(result).toMatch(/^weddings\/wedding-456\/thumbnails\/my-photo-800w\.webp$/);
    });

    it('should validate input key', () => {
      expect(() => generateThumbnailKey('invalid/path')).toThrow();
    });

    it('should reject invalid suffixes (non-alphanumeric, too long)', () => {
      expect(() => 
        generateThumbnailKey('weddings/test/media/photo.jpg', '../evil')
      ).toThrow('Invalid suffix');

      expect(() => 
        generateThumbnailKey('weddings/test/media/photo.jpg', 'a'.repeat(30))
      ).toThrow('exceeds maximum length');
    });
  });
});

describe('R2 Client - File Operations', () => {
  beforeEach(() => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-access-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret-key');
    vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('generatePresignedUploadUrl', () => {
    it('should create valid presigned URL', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue('https://r2.example.com/presigned-url?signature=abc123');

      const result = await generatePresignedUploadUrl({
        weddingId: 'test-wedding',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result.uploadUrl).toBe('https://r2.example.com/presigned-url?signature=abc123');
      expect(result.key).toMatch(/^weddings\/test-wedding\/media\/.+\.jpg$/);
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should set 15-minute expiration (900 seconds)', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue('https://r2.example.com/upload');

      await generatePresignedUploadUrl({
        weddingId: 'test',
        fileName: 'file.jpg',
        contentType: 'image/jpeg',
      });

      // Check that getSignedUrl was called with expiresIn: 900 seconds (15 minutes)
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 900 }
      );
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      vi.stubEnv('R2_ACCOUNT_ID', 'test-account-123');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'test-access-key');
      vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret-key');
      vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');
    });

    it('should validate key before uploading', async () => {
      const buffer = Buffer.from('test data');

      await expect(
        uploadFile('invalid/path/file.jpg', buffer, 'image/jpeg')
      ).rejects.toThrow();
    });

    it('should send PutObjectCommand with correct params', async () => {
      const mockSend = vi.fn()
        .mockResolvedValueOnce({ ETag: '"abc123"' }) // PutObjectCommand
        .mockResolvedValueOnce({ ContentLength: 1024 }); // HeadObjectCommand
      vi.mocked(S3Client).mockImplementation(() => ({
        send: mockSend,
      } as any));

      const buffer = Buffer.from('test image data');

      await uploadFile(
        'weddings/test-123/media/photo.jpg',
        buffer,
        'image/jpeg',
        {
          'wedding-id': 'test-123',
          'guest-identifier': 'guest-456',
        }
      );

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'weddings/test-123/media/photo.jpg',
        Body: buffer,
        ContentType: 'image/jpeg',
        Metadata: {
          'wedding-id': 'test-123',
          'guest-identifier': 'guest-456',
        },
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle upload success', async () => {
      const mockSend = vi.fn()
        .mockResolvedValueOnce({ ETag: '"abc123"' }) // PutObjectCommand
        .mockResolvedValueOnce({ ContentLength: 1024 }); // HeadObjectCommand
      vi.mocked(S3Client).mockImplementation(() => ({
        send: mockSend,
      } as any));

      const buffer = Buffer.from('test');

      await expect(
        uploadFile('weddings/test/media/file.jpg', buffer, 'image/jpeg')
      ).resolves.not.toThrow();
    });

    it('should handle S3 errors', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('S3 upload failed'));
      vi.mocked(S3Client).mockImplementation(() => ({
        send: mockSend,
      } as any));
      
      const buffer = Buffer.from('test');

      await expect(
        uploadFile('weddings/test/media/file.jpg', buffer, 'image/jpeg')
      ).rejects.toThrow('S3 upload failed');
    });
  });

  describe('fetchFile', () => {
    beforeEach(() => {
      vi.stubEnv('R2_ACCOUNT_ID', 'test-account-123');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'test-access-key');
      vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret-key');
      vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');
    });

    it('should validate key before fetching', async () => {
      await expect(
        fetchFile('invalid/path/file.jpg')
      ).rejects.toThrow();
    });

    it('should convert stream to Buffer', async () => {
      const mockStream = Readable.from([Buffer.from('test'), Buffer.from('data')]);
      const mockSend = vi.fn().mockResolvedValue({ Body: mockStream });
      vi.mocked(S3Client).mockImplementation(() => ({
        send: mockSend,
      } as any));

      const result = await fetchFile('weddings/test/media/photo.jpg');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('testdata');
    });

    it('should send GetObjectCommand with correct params', async () => {
      const mockStream = Readable.from([Buffer.from('data')]);
      const mockSend = vi.fn().mockResolvedValue({ Body: mockStream });
      vi.mocked(S3Client).mockImplementation(() => ({
        send: mockSend,
      } as any));

      await fetchFile('weddings/test-123/thumbnails/photo-400w.webp');
      
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'weddings/test-123/thumbnails/photo-400w.webp',
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle S3 errors', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('File not found'));
      vi.mocked(S3Client).mockImplementation(() => ({
        send: mockSend,
      } as any));

      await expect(
        fetchFile('weddings/test/media/missing.jpg')
      ).rejects.toThrow('File not found');
    });

    it('should handle missing Body in response', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      vi.mocked(S3Client).mockImplementation(() => ({
        send: mockSend,
      } as any));

      await expect(
        fetchFile('weddings/test/media/file.jpg')
      ).rejects.toThrow();
    });
  });
});

describe('R2 Client - URL Helpers', () => {
  beforeEach(() => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test-account');
    vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key');
    vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret');
    vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getPublicUrl', () => {
    it('should construct correct public URL from key', () => {
      const key = 'weddings/test-123/media/photo.jpg';
      const url = getPublicUrl(key);

      expect(url).toBe('https://test-bucket.test-account.r2.cloudflarestorage.com/weddings/test-123/media/photo.jpg');
    });

    it('should handle thumbnail keys', () => {
      const key = 'weddings/abc/thumbnails/image-400w.webp';
      const url = getPublicUrl(key);

      expect(url).toContain('/thumbnails/image-400w.webp');
      expect(url).toBe('https://test-bucket.test-account.r2.cloudflarestorage.com/weddings/abc/thumbnails/image-400w.webp');
    });
  });

  describe('extractKeyFromUrl', () => {
    it('should extract key from public URL', () => {
      const url = 'https://test-bucket.test-account.r2.cloudflarestorage.com/weddings/test-123/media/photo.jpg';
      const key = extractKeyFromUrl(url);

      expect(key).toBe('weddings/test-123/media/photo.jpg');
    });

    it('should handle thumbnail URLs', () => {
      const url = 'https://test-bucket.test-account.r2.cloudflarestorage.com/weddings/abc/thumbnails/img-400w.webp';
      const key = extractKeyFromUrl(url);

      expect(key).toBe('weddings/abc/thumbnails/img-400w.webp');
    });

    it('should return null for invalid URLs', () => {
      expect(extractKeyFromUrl('not-a-url')).toBeNull();
      expect(extractKeyFromUrl('https://example.com/file.jpg')).toBeNull();
      expect(extractKeyFromUrl('')).toBeNull();
    });

    it('should preserve query parameters in extracted key', () => {
      // Note: Current implementation doesn't strip query params
      const url = 'https://test-bucket.test-account.r2.cloudflarestorage.com/weddings/test/media/photo.jpg?v=123';
      const key = extractKeyFromUrl(url);

      // Current behavior - includes query string
      expect(key).toBe('weddings/test/media/photo.jpg?v=123');
    });
  });
});
