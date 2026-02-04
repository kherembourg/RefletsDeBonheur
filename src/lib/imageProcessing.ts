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
  const {
    width = 400,
    quality = 85,
    format = 'webp',
  } = options;

  try {
    // Validate buffer
    if (!Buffer.isBuffer(imageBuffer)) {
      throw new Error('Invalid input: imageBuffer must be a Buffer');
    }

    if (imageBuffer.length === 0) {
      throw new Error('Invalid input: imageBuffer is empty');
    }

    // Validate buffer BEFORE processing to prevent malicious file uploads
    validateImageBuffer(imageBuffer);

    // Create Sharp instance with error handling and pixel limit
    const sharpInstance = sharp(imageBuffer, {
      failOnError: true,
      limitInputPixels: 268402689, // 16384 x 16384 max (default Sharp limit)
    })
      .resize({
        width,
        withoutEnlargement: true, // Don't upscale if image is smaller
      });

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
      default:
        throw new Error(`Unsupported format: ${format}. Supported: webp, jpeg, png`);
    }

    // Get processed buffer with metadata
    const { data, info } = await sharpInstance.toBuffer({ resolveWithObject: true });

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
      // Re-throw validation errors directly
      if (error.message.includes('Invalid input:') ||
          error.message.includes('Invalid image:') ||
          error.message.includes('Unsupported format:') ||
          error.message.includes('Image processing produced empty buffer')) {
        throw error;
      }

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

