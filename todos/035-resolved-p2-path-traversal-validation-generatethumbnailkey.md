# ✅ Path Traversal Validation in generateThumbnailKey

**Status:** resolved
**Priority:** P2 (IMPORTANT)
**Category:** Security
**Created:** 2026-02-04
**Source:** Code review PR #37 - security-sentinel agent

## Problem

The `generateThumbnailKey()` function performs string manipulation without validating input, making it vulnerable to path traversal attacks. An attacker could craft malicious keys to write thumbnails to unintended locations.

**Attack Scenario:**
```typescript
// Attacker provides:
const maliciousKey = 'weddings/../../../etc/passwd/media/file.jpg';

// generateThumbnailKey splits on '/' and uses parts[1]
const parts = maliciousKey.split('/'); // ['weddings', '..', '..', '..', 'etc', 'passwd', 'media', 'file.jpg']
const weddingId = parts[1]; // '..'
const filename = parts[parts.length - 1]; // 'file.jpg'

// Result: 'weddings/../thumbnails/file-400w.webp'
// Actual path after normalization: 'thumbnails/file-400w.webp' (escapes weddings directory)
```

**Severity:** MEDIUM-HIGH - Could write to unintended storage locations

## Current Code

`src/lib/r2/client.ts:220-232`
```typescript
export function generateThumbnailKey(originalKey: string, suffix: string = '400w'): string {
  // ❌ No validation - trusts input format
  const parts = originalKey.split('/');
  const weddingId = parts[1];
  const filename = parts[parts.length - 1];

  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  return `weddings/${weddingId}/thumbnails/${nameWithoutExt}-${suffix}.webp`;
}
```

## Solution

Add comprehensive validation before processing:

```typescript
/**
 * Validate a storage key matches expected pattern
 * @throws Error if key is invalid or contains path traversal
 */
function validateStorageKey(key: string): void {
  // Must be non-empty
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid storage key: must be a non-empty string');
  }

  // No path traversal sequences
  if (key.includes('..') || key.includes('//')) {
    throw new Error('Invalid storage key: path traversal detected');
  }

  // Must start with weddings/
  if (!key.startsWith('weddings/')) {
    throw new Error('Invalid storage key: must start with weddings/');
  }

  // Must match expected pattern
  const validPattern = /^weddings\/[a-zA-Z0-9-]+\/(media|thumbnails)\/[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(key)) {
    throw new Error(
      'Invalid storage key: must match pattern weddings/{id}/(media|thumbnails)/{filename}'
    );
  }

  // Length check
  if (key.length > 500) {
    throw new Error('Invalid storage key: exceeds maximum length of 500 characters');
  }
}

/**
 * Generate a thumbnail storage key from an original media key
 *
 * @param originalKey - Original media storage key (e.g., "weddings/123/media/file.jpg")
 * @param suffix - Optional suffix to append (e.g., "400w" for 400px wide)
 * @returns Thumbnail storage key (e.g., "weddings/123/thumbnails/file-400w.webp")
 * @throws Error if originalKey is invalid or contains path traversal
 *
 * @example
 * ```ts
 * const originalKey = "weddings/abc/media/1234-photo.jpg";
 * const thumbnailKey = generateThumbnailKey(originalKey, "400w");
 * // Returns: "weddings/abc/thumbnails/1234-photo-400w.webp"
 * ```
 */
export function generateThumbnailKey(originalKey: string, suffix: string = '400w'): string {
  // ✅ Validate input first
  validateStorageKey(originalKey);

  // Validate suffix
  if (!/^[a-zA-Z0-9-]+$/.test(suffix)) {
    throw new Error('Invalid suffix: must contain only alphanumeric characters and hyphens');
  }

  if (suffix.length > 20) {
    throw new Error('Invalid suffix: exceeds maximum length of 20 characters');
  }

  // Extract wedding ID and filename from original key
  // Format: weddings/{weddingId}/media/{filename}
  const parts = originalKey.split('/');

  // After validation, we know the format is correct
  const weddingId = parts[1];
  const filename = parts[parts.length - 1];

  // Additional safety: validate extracted parts
  if (!/^[a-zA-Z0-9-]+$/.test(weddingId)) {
    throw new Error('Invalid wedding ID: must contain only alphanumeric characters and hyphens');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new Error('Invalid filename: must contain only alphanumeric characters, dots, underscores, and hyphens');
  }

  // Remove extension and add suffix
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Return thumbnail key with .webp extension
  const thumbnailKey = `weddings/${weddingId}/thumbnails/${nameWithoutExt}-${suffix}.webp`;

  // Final safety check: validate output
  if (thumbnailKey.includes('..') || thumbnailKey.includes('//')) {
    throw new Error('Generated thumbnail key contains invalid sequences');
  }

  return thumbnailKey;
}
```

## Apply Validation to All R2 Functions

Also apply `validateStorageKey()` to other R2 functions:

```typescript
// In fetchFile()
export async function fetchFile(key: string): Promise<Buffer> {
  validateStorageKey(key);
  // ... rest of function
}

// In uploadFile()
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  validateStorageKey(key);
  // ... rest of function
}

// In deleteFile()
export async function deleteFile(key: string): Promise<void> {
  validateStorageKey(key);
  // ... rest of function
}
```

## Testing

Add security validation tests:

```typescript
describe('generateThumbnailKey Security', () => {
  it('should reject path traversal attempts', () => {
    expect(() => generateThumbnailKey('weddings/../etc/media/file.jpg'))
      .toThrow('path traversal detected');

    expect(() => generateThumbnailKey('weddings/123/../456/media/file.jpg'))
      .toThrow('path traversal detected');

    expect(() => generateThumbnailKey('weddings//123/media/file.jpg'))
      .toThrow('path traversal detected');
  });

  it('should reject keys without weddings prefix', () => {
    expect(() => generateThumbnailKey('internal/123/media/file.jpg'))
      .toThrow('must start with weddings/');
  });

  it('should reject invalid patterns', () => {
    expect(() => generateThumbnailKey('weddings/123/invalid/file.jpg'))
      .toThrow('must match pattern');

    expect(() => generateThumbnailKey('weddings/abc@123/media/file.jpg'))
      .toThrow('must match pattern');
  });

  it('should reject oversized keys', () => {
    const longKey = 'weddings/123/media/' + 'a'.repeat(500) + '.jpg';
    expect(() => generateThumbnailKey(longKey))
      .toThrow('exceeds maximum length');
  });

  it('should reject malicious suffixes', () => {
    expect(() => generateThumbnailKey('weddings/123/media/file.jpg', '../evil'))
      .toThrow('Invalid suffix');

    expect(() => generateThumbnailKey('weddings/123/media/file.jpg', 'test@123'))
      .toThrow('Invalid suffix');
  });

  it('should accept valid keys', () => {
    expect(generateThumbnailKey('weddings/abc-123/media/photo.jpg', '400w'))
      .toBe('weddings/abc-123/thumbnails/photo-400w.webp');

    expect(generateThumbnailKey('weddings/wedding-id/media/1234-file_name.jpg'))
      .toBe('weddings/wedding-id/thumbnails/1234-file_name-400w.webp');
  });
});
```

## References

- OWASP: Path Traversal
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory
- Review finding: security-sentinel (MEDIUM severity)
- Related to TODO #027 (SSRF in fetchFile)

## Blockers

None

## Estimated Effort

2-3 hours (validation + tests + apply to all R2 functions)
