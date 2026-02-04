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

