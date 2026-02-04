# ✅ Add Sharp Processing Error Details

**Status:** completed
**Priority:** P2 (IMPORTANT)
**Category:** Security / Error Handling
**Created:** 2026-02-04
**Completed:** 2026-02-04
**Source:** Code review PR #37 - security-sentinel agent

## Problem

The `generateThumbnail()` function catches Sharp processing errors but doesn't provide detailed error information. This makes debugging difficult and could mask security issues (malformed images, exploits).

**Current Behavior:**
- Sharp errors are caught silently
- Generic error messages returned
- No information about what went wrong
- Difficult to diagnose issues

## Current Code

`src/lib/imageProcessing.ts:34-75`
```typescript
export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ProcessedImage> {
  const { width = 400, quality = 85, format = 'webp' } = options;

  // ❌ No explicit error handling or logging
  const sharpInstance = sharp(imageBuffer)
    .resize({ width, withoutEnlargement: true });

  let processedImage: sharp.Sharp;

  if (format === 'webp') {
    processedImage = sharpInstance.webp({ quality });
  } else if (format === 'jpeg') {
    processedImage = sharpInstance.jpeg({ quality });
  } else if (format === 'png') {
    processedImage = sharpInstance.png({ quality });
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  // ❌ If Sharp throws here, we get generic error
  const { data, info } = await processedImage.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    format: info.format,
    width: info.width,
    height: info.height,
    size: info.size,
  };
}
```

## Solution

Add comprehensive error handling with detailed messages:

```typescript
export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ProcessedImage> {
  const { width = 400, quality = 85, format = 'webp' } = options;

  try {
    // Validate buffer
    if (!Buffer.isBuffer(imageBuffer)) {
      throw new Error('Invalid input: imageBuffer must be a Buffer');
    }

    if (imageBuffer.length === 0) {
      throw new Error('Invalid input: imageBuffer is empty');
    }

    // Create Sharp instance with error context
    const sharpInstance = sharp(imageBuffer, {
      failOnError: true,
      limitInputPixels: 268402689, // 16384 x 16384 max (default Sharp limit)
    })
      .resize({
        width,
        withoutEnlargement: true,
      });

    // Apply format-specific processing
    let processedImage: sharp.Sharp;

    if (format === 'webp') {
      processedImage = sharpInstance.webp({ quality });
    } else if (format === 'jpeg') {
      processedImage = sharpInstance.jpeg({ quality, mozjpeg: true });
    } else if (format === 'png') {
      processedImage = sharpInstance.png({
        quality,
        compressionLevel: 9,
      });
    } else {
      throw new Error(`Unsupported format: ${format}. Supported: webp, jpeg, png`);
    }

    // Process with detailed error context
    const { data, info } = await processedImage.toBuffer({
      resolveWithObject: true,
    });

    // Validate output
    if (!data || data.length === 0) {
      throw new Error('Image processing produced empty buffer');
    }

    return {
      buffer: data,
      format: info.format,
      width: info.width,
      height: info.height,
      size: info.size,
    };
  } catch (error) {
    // Enhance error with context
    if (error instanceof Error) {
      // Check for specific Sharp errors
      if (error.message.includes('Input buffer contains unsupported image format')) {
        throw new Error(
          `Unsupported image format. Buffer size: ${imageBuffer.length} bytes. ` +
          `Ensure the image is a valid JPEG, PNG, GIF, or WEBP file. Original error: ${error.message}`
        );
      }

      if (error.message.includes('Input file is missing')) {
        throw new Error('Invalid image data: buffer is empty or corrupted');
      }

      if (error.message.includes('Input file exceeds pixel limit')) {
        throw new Error(
          `Image too large: exceeds maximum pixel limit. ` +
          `Buffer size: ${imageBuffer.length} bytes. ` +
          `Original error: ${error.message}`
        );
      }

      if (error.message.includes('VipsJpeg') || error.message.includes('VipsPng')) {
        throw new Error(
          `Image decoding failed. The image may be corrupted or malformed. ` +
          `Buffer size: ${imageBuffer.length} bytes. ` +
          `Original error: ${error.message}`
        );
      }

      // Generic Sharp error with context
      throw new Error(
        `Image processing failed: ${error.message}. ` +
        `Buffer size: ${imageBuffer.length} bytes, Target format: ${format}, Width: ${width}`
      );
    }

    // Unknown error type
    throw new Error(
      `Unknown error during image processing. Buffer size: ${imageBuffer.length} bytes. ` +
      `Error: ${String(error)}`
    );
  }
}
```

## Logging Enhancement

Add structured logging in the API endpoint:

```typescript
// In confirm.ts
if (type === 'image') {
  try {
    console.log('[API] Generating thumbnail for:', key);

    const originalImageBuffer = await fetchFile(key);
    console.log('[API] Fetched image buffer:', {
      key,
      size: originalImageBuffer.length,
      sizeKB: Math.round(originalImageBuffer.length / 1024),
    });

    const thumbnail = await generateThumbnail(originalImageBuffer, {
      width: 400,
      quality: 85,
      format: 'webp',
    });

    console.log('[API] Thumbnail generated:', {
      originalSize: originalImageBuffer.length,
      thumbnailSize: thumbnail.size,
      compressionRatio: (thumbnail.size / originalImageBuffer.length * 100).toFixed(1) + '%',
      dimensions: `${thumbnail.width}x${thumbnail.height}`,
    });

    // ... rest of upload logic
  } catch (thumbnailError) {
    // Enhanced error logging
    console.error('[API] Failed to generate thumbnail:', {
      key,
      error: thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError),
      stack: thumbnailError instanceof Error ? thumbnailError.stack : undefined,
    });
    // Continue without thumbnail
  }
}
```

## Testing

Add error scenario tests:

```typescript
describe('Sharp Error Handling', () => {
  it('should provide detailed error for invalid buffer', async () => {
    const invalidBuffer = Buffer.from('not an image');

    await expect(generateThumbnail(invalidBuffer)).rejects.toThrow(
      /Unsupported image format.*Buffer size: \d+ bytes/
    );
  });

  it('should provide detailed error for corrupted image', async () => {
    const corruptedBuffer = Buffer.alloc(1000); // Zeros

    await expect(generateThumbnail(corruptedBuffer)).rejects.toThrow(
      /Image decoding failed.*corrupted or malformed/
    );
  });

  it('should provide detailed error for oversized image', async () => {
    // Create image exceeding pixel limit
    const hugeImage = await sharp({
      create: {
        width: 20000,
        height: 20000,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    }).png().toBuffer();

    await expect(generateThumbnail(hugeImage)).rejects.toThrow(
      /exceeds maximum pixel limit/
    );
  });
});
```

## Benefits

- **Better debugging:** Know exactly what went wrong
- **Security monitoring:** Detect malicious image uploads
- **User feedback:** Provide specific error messages
- **Metrics:** Track processing failures by type

## References

- Sharp error handling documentation
- Review finding: security-sentinel (MEDIUM severity)

## Blockers

None

## Estimated Effort

2-3 hours (error handling + logging + tests)
