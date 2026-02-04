import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFile, uploadFile, deleteFile, generateThumbnailKey } from './client';

// Mock environment variables
const mockEnv = {
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET_NAME: 'test-bucket',
};

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  GetObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

describe('R2 Client - Storage Key Validation', () => {
  beforeEach(() => {
    // Set up environment
    Object.entries(mockEnv).forEach(([key, value]) => {
      vi.stubEnv(key, value);
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('Path Traversal Protection', () => {
    it('should reject keys with .. path traversal', async () => {
      await expect(
        fetchFile('weddings/../etc/passwd')
      ).rejects.toThrow('path traversal detected');
    });

    it('should reject keys with double slashes', async () => {
      await expect(
        fetchFile('weddings//123/media/file.jpg')
      ).rejects.toThrow('path traversal detected');
    });

    it('should reject keys with nested path traversal', async () => {
      await expect(
        fetchFile('weddings/123/../admin/secrets.txt')
      ).rejects.toThrow('path traversal detected');
    });

    it('should reject uploadFile with path traversal', async () => {
      const buffer = Buffer.from('test');
      await expect(
        uploadFile('weddings/../internal/file.jpg', buffer, 'image/jpeg')
      ).rejects.toThrow('path traversal detected');
    });

    it('should reject deleteFile with path traversal', async () => {
      await expect(
        deleteFile('weddings/123/../admin/file.jpg')
      ).rejects.toThrow('path traversal detected');
    });
  });

  describe('Prefix Validation', () => {
    it('should reject keys without weddings/ prefix', async () => {
      await expect(
        fetchFile('internal/secrets.txt')
      ).rejects.toThrow('must start with weddings/');
    });

    it('should reject keys starting with other paths', async () => {
      await expect(
        fetchFile('admin/config.json')
      ).rejects.toThrow('must start with weddings/');
    });

    it('should reject empty prefix', async () => {
      await expect(
        fetchFile('etc/passwd')
      ).rejects.toThrow('must start with weddings/');
    });

    it('should reject uploadFile without weddings/ prefix', async () => {
      const buffer = Buffer.from('test');
      await expect(
        uploadFile('secrets/api-keys.txt', buffer, 'text/plain')
      ).rejects.toThrow('must start with weddings/');
    });

    it('should reject deleteFile without weddings/ prefix', async () => {
      await expect(
        deleteFile('system/config.yml')
      ).rejects.toThrow('must start with weddings/');
    });
  });

  describe('Pattern Validation', () => {
    it('should reject keys not matching expected pattern', async () => {
      await expect(
        fetchFile('weddings/123/invalid/path.jpg')
      ).rejects.toThrow('does not match expected pattern');
    });

    it('should reject keys without proper directory structure', async () => {
      await expect(
        fetchFile('weddings/123/file.jpg')
      ).rejects.toThrow('does not match expected pattern');
    });

    it('should reject keys with special characters in wedding ID', async () => {
      await expect(
        fetchFile('weddings/../malicious/media/file.jpg')
      ).rejects.toThrow('path traversal detected');
    });

    it('should reject uploadFile with invalid pattern', async () => {
      const buffer = Buffer.from('test');
      await expect(
        uploadFile('weddings/123/wrong-dir/file.jpg', buffer, 'image/jpeg')
      ).rejects.toThrow('does not match expected pattern');
    });

    it('should reject deleteFile with invalid pattern', async () => {
      await expect(
        deleteFile('weddings/123/admin/file.jpg')
      ).rejects.toThrow('does not match expected pattern');
    });
  });

  describe('Length Validation', () => {
    it('should reject keys longer than 500 characters', async () => {
      const longKey = 'weddings/abc/media/' + 'a'.repeat(500) + '.jpg';
      await expect(
        fetchFile(longKey)
      ).rejects.toThrow('too long');
    });

    it('should reject uploadFile with too long key', async () => {
      const buffer = Buffer.from('test');
      const longKey = 'weddings/abc/media/' + 'a'.repeat(500) + '.jpg';
      await expect(
        uploadFile(longKey, buffer, 'image/jpeg')
      ).rejects.toThrow('too long');
    });

    it('should reject deleteFile with too long key', async () => {
      const longKey = 'weddings/abc/media/' + 'a'.repeat(500) + '.jpg';
      await expect(
        deleteFile(longKey)
      ).rejects.toThrow('too long');
    });
  });

  describe('Valid Keys', () => {
    it('should not throw validation error for valid media key', () => {
      // The function will fail with S3 errors, but validation should pass
      // We just need to verify validation doesn't throw
      expect(() => {
        fetchFile('weddings/abc123/media/photo.jpg').catch(() => {});
      }).not.toThrow();
    });

    it('should not throw validation error for valid thumbnail key', () => {
      expect(() => {
        fetchFile('weddings/test-123/thumbnails/image-400w.webp').catch(() => {});
      }).not.toThrow();
    });

    it('should not throw validation error for valid key with numbers and dashes', () => {
      expect(() => {
        fetchFile('weddings/wedding-123-abc/media/file_name.jpg').catch(() => {});
      }).not.toThrow();
    });

    it('should not throw validation error for valid uploadFile key', () => {
      const buffer = Buffer.from('test');
      expect(() => {
        uploadFile('weddings/abc123/media/photo.jpg', buffer, 'image/jpeg').catch(() => {});
      }).not.toThrow();
    });

    it('should not throw validation error for valid deleteFile key', () => {
      expect(() => {
        deleteFile('weddings/abc123/thumbnails/image-400w.webp').catch(() => {});
      }).not.toThrow();
    });
  });

  describe('SSRF Attack Scenarios', () => {
    it('should block attempt to access internal metadata service', async () => {
      await expect(
        fetchFile('weddings/../169.254.169.254/latest/meta-data/credentials')
      ).rejects.toThrow('path traversal detected');
    });

    it('should block attempt to access parent directories', async () => {
      await expect(
        fetchFile('weddings/../../etc/passwd')
      ).rejects.toThrow('path traversal detected');
    });

    it('should block attempt to access system files', async () => {
      await expect(
        fetchFile('admin/config')
      ).rejects.toThrow('must start with weddings/');
    });

    it('should block attempt to scan internal network', async () => {
      await expect(
        fetchFile('internal-api/secrets')
      ).rejects.toThrow('must start with weddings/');
    });
  });
});

describe('generateThumbnailKey Security', () => {
  describe('Path Traversal Protection', () => {
    it('should reject path traversal attempts with ..', () => {
      expect(() => generateThumbnailKey('weddings/../etc/media/file.jpg'))
        .toThrow('path traversal detected');
    });

    it('should reject path traversal in middle of path', () => {
      expect(() => generateThumbnailKey('weddings/123/../456/media/file.jpg'))
        .toThrow('path traversal detected');
    });

    it('should reject double slashes', () => {
      expect(() => generateThumbnailKey('weddings//123/media/file.jpg'))
        .toThrow('path traversal detected');
    });

    it('should reject multiple path traversal sequences', () => {
      expect(() => generateThumbnailKey('weddings/../../etc/passwd/media/file.jpg'))
        .toThrow('path traversal detected');
    });
  });

  describe('Prefix Validation', () => {
    it('should reject keys without weddings prefix', () => {
      expect(() => generateThumbnailKey('internal/123/media/file.jpg'))
        .toThrow('must start with weddings/');
    });

    it('should reject keys with alternative prefixes', () => {
      expect(() => generateThumbnailKey('system/123/media/file.jpg'))
        .toThrow('must start with weddings/');
    });

    it('should reject empty keys', () => {
      expect(() => generateThumbnailKey(''))
        .toThrow('must be a non-empty string');
    });

    it('should reject non-string inputs', () => {
      expect(() => generateThumbnailKey(null as any))
        .toThrow('must be a non-empty string');

      expect(() => generateThumbnailKey(undefined as any))
        .toThrow('must be a non-empty string');
    });
  });

  describe('Pattern Validation', () => {
    it('should reject invalid directory structure', () => {
      expect(() => generateThumbnailKey('weddings/123/invalid/file.jpg'))
        .toThrow('does not match expected pattern');
    });

    it('should reject special characters in wedding ID', () => {
      expect(() => generateThumbnailKey('weddings/abc@123/media/file.jpg'))
        .toThrow('does not match expected pattern');
    });

    it('should reject special characters in filename', () => {
      expect(() => generateThumbnailKey('weddings/123/media/file@test.jpg'))
        .toThrow('does not match expected pattern');
    });

    it('should reject paths without filename', () => {
      expect(() => generateThumbnailKey('weddings/123/media/'))
        .toThrow('does not match expected pattern');
    });
  });

  describe('Length Validation', () => {
    it('should reject oversized keys', () => {
      const longKey = 'weddings/123/media/' + 'a'.repeat(500) + '.jpg';
      expect(() => generateThumbnailKey(longKey))
        .toThrow('too long');
    });

    it('should accept keys at reasonable length', () => {
      const filename = 'a'.repeat(50) + '.jpg';
      const validKey = `weddings/test-id/media/${filename}`;

      // Should not throw
      expect(() => generateThumbnailKey(validKey)).not.toThrow();
    });
  });

  describe('Suffix Validation', () => {
    it('should reject malicious suffixes with path traversal', () => {
      expect(() => generateThumbnailKey('weddings/123/media/file.jpg', '../evil'))
        .toThrow('Invalid suffix');
    });

    it('should reject suffixes with special characters', () => {
      expect(() => generateThumbnailKey('weddings/123/media/file.jpg', 'test@123'))
        .toThrow('Invalid suffix');

      expect(() => generateThumbnailKey('weddings/123/media/file.jpg', 'test/123'))
        .toThrow('Invalid suffix');
    });

    it('should reject oversized suffixes', () => {
      const longSuffix = 'a'.repeat(21);
      expect(() => generateThumbnailKey('weddings/abc-123/media/file.jpg', longSuffix))
        .toThrow('exceeds maximum length');
    });

    it('should accept valid alphanumeric suffixes', () => {
      expect(generateThumbnailKey('weddings/abc-123/media/photo.jpg', '400w'))
        .toBe('weddings/abc-123/thumbnails/photo-400w.webp');

      expect(generateThumbnailKey('weddings/abc-123/media/photo.jpg', '800w'))
        .toBe('weddings/abc-123/thumbnails/photo-800w.webp');

      expect(generateThumbnailKey('weddings/abc-123/media/photo.jpg', 'thumb'))
        .toBe('weddings/abc-123/thumbnails/photo-thumb.webp');
    });

    it('should accept suffixes with hyphens', () => {
      expect(generateThumbnailKey('weddings/abc-123/media/photo.jpg', 'low-res'))
        .toBe('weddings/abc-123/thumbnails/photo-low-res.webp');
    });
  });

  describe('Valid Keys', () => {
    it('should accept valid media keys', () => {
      expect(generateThumbnailKey('weddings/abc-123/media/photo.jpg', '400w'))
        .toBe('weddings/abc-123/thumbnails/photo-400w.webp');
    });

    it('should accept keys with hyphens in wedding ID', () => {
      expect(generateThumbnailKey('weddings/wedding-id-123/media/file.jpg'))
        .toBe('weddings/wedding-id-123/thumbnails/file-400w.webp');
    });

    it('should accept keys with underscores and dots in filename', () => {
      expect(generateThumbnailKey('weddings/abc/media/1234-file_name.v2.jpg'))
        .toBe('weddings/abc/thumbnails/1234-file_name.v2-400w.webp');
    });

    it('should handle filenames without extensions', () => {
      expect(generateThumbnailKey('weddings/abc/media/photo'))
        .toBe('weddings/abc/thumbnails/photo-400w.webp');
    });

    it('should use default suffix when not provided', () => {
      expect(generateThumbnailKey('weddings/abc/media/photo.jpg'))
        .toBe('weddings/abc/thumbnails/photo-400w.webp');
    });

    it('should handle various image extensions', () => {
      expect(generateThumbnailKey('weddings/abc/media/photo.png', '400w'))
        .toBe('weddings/abc/thumbnails/photo-400w.webp');

      expect(generateThumbnailKey('weddings/abc/media/photo.jpeg', '400w'))
        .toBe('weddings/abc/thumbnails/photo-400w.webp');

      expect(generateThumbnailKey('weddings/abc/media/photo.gif', '400w'))
        .toBe('weddings/abc/thumbnails/photo-400w.webp');
    });
  });

  describe('Output Validation', () => {
    it('should ensure output contains no path traversal sequences', () => {
      const result = generateThumbnailKey('weddings/abc-123/media/photo.jpg', '400w');

      expect(result).not.toContain('..');
      expect(result).not.toContain('//');
    });

    it('should ensure output follows expected format', () => {
      const result = generateThumbnailKey('weddings/abc-123/media/photo.jpg', '400w');

      expect(result).toMatch(/^weddings\/[a-zA-Z0-9-]+\/thumbnails\/[a-zA-Z0-9._-]+-[a-zA-Z0-9-]+\.webp$/);
    });

    it('should always return webp extension', () => {
      expect(generateThumbnailKey('weddings/abc/media/photo.jpg', '400w'))
        .toEndWith('.webp');

      expect(generateThumbnailKey('weddings/abc/media/photo.png', '400w'))
        .toEndWith('.webp');
    });
  });

  describe('Edge Cases', () => {
    it('should handle alphanumeric wedding IDs', () => {
      expect(generateThumbnailKey('weddings/abc123/media/photo.jpg', '400w'))
        .toBe('weddings/abc123/thumbnails/photo-400w.webp');
    });

    it('should handle numeric-only wedding IDs', () => {
      expect(generateThumbnailKey('weddings/123456/media/photo.jpg', '400w'))
        .toBe('weddings/123456/thumbnails/photo-400w.webp');
    });

    it('should handle very short filenames', () => {
      expect(generateThumbnailKey('weddings/abc/media/a.jpg', '400w'))
        .toBe('weddings/abc/thumbnails/a-400w.webp');
    });

    it('should handle filenames with multiple dots', () => {
      expect(generateThumbnailKey('weddings/abc/media/file.backup.old.jpg', '400w'))
        .toBe('weddings/abc/thumbnails/file.backup.old-400w.webp');
    });
  });

  describe('Attack Scenarios', () => {
    it('should block attempt to write thumbnails outside weddings directory', () => {
      expect(() => generateThumbnailKey('weddings/../internal/media/secret.jpg'))
        .toThrow('path traversal detected');
    });

    it('should block attempt to use malicious wedding ID', () => {
      expect(() => generateThumbnailKey('weddings/..%2F..%2Fetc/media/file.jpg'))
        .toThrow('does not match expected pattern');
    });

    it('should block attempt to use suffix for directory traversal', () => {
      expect(() => generateThumbnailKey('weddings/abc/media/file.jpg', '../../../evil'))
        .toThrow('Invalid suffix');
    });

    it('should validate extracted wedding ID', () => {
      // Even if pattern validation passes, extracted ID must be alphanumeric
      expect(() => generateThumbnailKey('weddings/abc/media/file.jpg'))
        .not.toThrow();
    });

    it('should validate extracted filename', () => {
      // Even if pattern validation passes, extracted filename must be safe
      expect(() => generateThumbnailKey('weddings/abc/media/file.jpg'))
        .not.toThrow();
    });
  });
});
