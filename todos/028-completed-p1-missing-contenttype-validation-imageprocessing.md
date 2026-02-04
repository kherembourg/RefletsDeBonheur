# 🔴 CRITICAL: Missing Content-Type Validation in Image Processing

**Status:** pending
**Priority:** P1 (CRITICAL - Blocks merge)
**Category:** Security
**Created:** 2026-02-04
**Source:** Code review PR #37 - security-sentinel agent

## Problem

The `generateThumbnail()` function processes image buffers without validating the actual content type. It relies solely on client-provided `contentType` parameter, allowing:

1. **Malicious file upload**: Upload `.exe` with `contentType: 'image/jpeg'`
2. **Sharp library exploits**: Trigger Sharp vulnerabilities with crafted files
3. **Content confusion attacks**: Store malicious files as images

**Severity:** CRITICAL - Security bypass

## Current Code

`src/lib/imageProcessing.ts:34-67`
```typescript
export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ProcessedImage> {
  const { width = 400, quality = 85, format = 'webp' } = options;

  // ❌ No content-type validation - just trusts the input!
  const sharpInstance = sharp(imageBuffer)
    .resize({ width, withoutEnlargement: true });

  // ... format processing
}
```

## Solution

Add magic number validation before processing:

```typescript
/**
 * Validate image buffer using magic numbers
 * @throws Error if buffer is not a valid image
 */
function validateImageBuffer(buffer: Buffer): void {
  if (buffer.length < 12) {
    throw new Error('Invalid image: buffer too small');
  }

  // Check magic numbers for common image formats
  const magicNumbers = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47],
    webp: [0x52, 0x49, 0x46, 0x46], // RIFF header (check WEBP at offset 8)
    gif: [0x47, 0x49, 0x46],
  };

  const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  const isWEBP = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                 buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  if (!isJPEG && !isPNG && !isGIF && !isWEBP) {
    throw new Error('Invalid image: unrecognized format (magic number check failed)');
  }
}

export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ProcessedImage> {
  // Validate buffer BEFORE processing
  validateImageBuffer(imageBuffer);

  const { width = 400, quality = 85, format = 'webp' } = options;

  // Wrap Sharp processing in try-catch for additional safety
  try {
    const sharpInstance = sharp(imageBuffer)
      .resize({ width, withoutEnlargement: true });

    // ... rest of function
  } catch (error) {
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

## Testing

Add validation test cases:

```typescript
describe('Image Validation', () => {
  it('should reject non-image buffers', async () => {
    const maliciousBuffer = Buffer.from('#!/bin/bash\nrm -rf /');
    await expect(generateThumbnail(maliciousBuffer)).rejects.toThrow('unrecognized format');
  });

  it('should reject buffers with wrong magic numbers', async () => {
    const fakeBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    await expect(generateThumbnail(fakeBuffer)).rejects.toThrow('unrecognized format');
  });

  it('should accept valid JPEG', async () => {
    const jpegBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).jpeg().toBuffer();

    await expect(generateThumbnail(jpegBuffer)).resolves.toBeDefined();
  });

  it('should accept valid PNG', async () => {
    const pngBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 255, b: 0 } }
    }).png().toBuffer();

    await expect(generateThumbnail(pngBuffer)).resolves.toBeDefined();
  });
});
```

## Additional Hardening

Consider using Sharp's own validation:

```typescript
// Let Sharp validate the buffer
const metadata = await sharp(imageBuffer).metadata();
if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
  throw new Error(`Unsupported image format: ${metadata.format}`);
}
```

## References

- OWASP: File Upload Vulnerabilities
- CWE-434: Unrestricted Upload of File with Dangerous Type
- Magic numbers reference: https://en.wikipedia.org/wiki/List_of_file_signatures
- Review finding: security-sentinel

## Blockers

None

## Estimated Effort

2-3 hours (validation + tests)
