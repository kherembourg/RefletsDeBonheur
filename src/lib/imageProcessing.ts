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

/**
 * Validate if a buffer contains a valid image
 *
 * @param buffer - Buffer to validate
 * @returns True if buffer contains a valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!(metadata.width && metadata.height);
  } catch {
    return false;
  }
}

/**
 * Get image metadata without processing
 *
 * @param buffer - Image buffer
 * @returns Image metadata
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    return await sharp(buffer).metadata();
  } catch (error) {
    throw new Error(
      `Failed to read image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate multiple thumbnail sizes from a single image
 *
 * @param imageBuffer - Original image buffer
 * @param sizes - Array of thumbnail widths to generate
 * @param options - Shared options for all thumbnails
 * @returns Map of size to processed image
 *
 * @example
 * ```ts
 * const thumbnails = await generateMultipleThumbnails(imageBuffer, [150, 400, 1200]);
 * const small = thumbnails.get(150);
 * const medium = thumbnails.get(400);
 * const large = thumbnails.get(1200);
 * ```
 */
export async function generateMultipleThumbnails(
  imageBuffer: Buffer,
  sizes: number[],
  options: Omit<ThumbnailOptions, 'width'> = {}
): Promise<Map<number, ProcessedImage>> {
  const results = new Map<number, ProcessedImage>();

  // Process all sizes in parallel for better performance
  const promises = sizes.map(async (size) => {
    const thumbnail = await generateThumbnail(imageBuffer, {
      ...options,
      width: size,
    });
    return { size, thumbnail };
  });

  const processed = await Promise.all(promises);

  // Build map from results
  for (const { size, thumbnail } of processed) {
    results.set(size, thumbnail);
  }

  return results;
}
