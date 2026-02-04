/**
 * Image Processing Utilities
 *
 * Handles image optimization and thumbnail generation using Sharp.
 */

import sharp from 'sharp';

export interface ThumbnailOptions {
  width?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export interface ProcessedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Validate image buffer using magic numbers
 *
 * Checks file signatures (magic numbers) to ensure the buffer contains
 * a valid image file. This prevents malicious files from being processed
 * as images.
 *
 * Supported formats: JPEG, PNG, GIF, WEBP
 *
 * @param buffer - Image buffer to validate
 * @throws Error if buffer is too small or not a valid image format
 */
function validateImageBuffer(buffer: Buffer): void {
  if (buffer.length < 12) {
    throw new Error('Invalid image: buffer too small (minimum 12 bytes required)');
  }

  // Check magic numbers for supported image formats
  const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  const isWEBP = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                 buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  if (!isJPEG && !isPNG && !isGIF && !isWEBP) {
    throw new Error('Invalid image: unrecognized format (magic number check failed). Supported formats: JPEG, PNG, GIF, WEBP');
  }
}

/**
 * Generate a thumbnail from an image buffer
 *
 * @param imageBuffer - Original image buffer
 * @param options - Thumbnail generation options
 * @returns Processed image data with buffer and metadata
 *
 * @example
 * ```ts
 * const thumbnail = await generateThumbnail(imageBuffer, {
 *   width: 400,
 *   quality: 85,
 *   format: 'webp'
 * });
 * ```
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<ProcessedImage> {
  // Validate buffer BEFORE processing to prevent malicious file uploads
  validateImageBuffer(imageBuffer);

  const {
    width = 400,
    quality = 85,
    format = 'webp',
  } = options;

  try {
    // Process image with Sharp
    const sharpInstance = sharp(imageBuffer)
      .resize({ width, withoutEnlargement: true }); // Don't upscale if image is smaller

    // Apply format-specific options
    switch (format) {
      case 'webp':
        sharpInstance.webp({ quality, effort: 4 });
        break;
      case 'jpeg':
        sharpInstance.jpeg({ quality, mozjpeg: true });
        break;
      case 'png':
        sharpInstance.png({ quality, compressionLevel: 9 });
        break;
    }

    // Get processed buffer with metadata
    const { data, info } = await sharpInstance.toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      format: info.format,
      width: info.width,
      height: info.height,
      size: info.size,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

