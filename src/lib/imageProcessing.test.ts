/**
 * Image Processing Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import {
  generateThumbnail,
  isValidImage,
  getImageMetadata,
  generateMultipleThumbnails,
} from './imageProcessing';

describe('imageProcessing', () => {
  let testImageBuffer: Buffer;
  let smallImageBuffer: Buffer;
  let invalidBuffer: Buffer;

  beforeAll(async () => {
    // Generate a test image (800x600 JPEG)
    testImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    // Generate a small test image (200x150 PNG)
    smallImageBuffer = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 4,
        background: { r: 255, g: 128, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Invalid buffer (not an image)
    invalidBuffer = Buffer.from('This is not an image');
  });

  describe('generateThumbnail', () => {
    it('should generate a 400px wide WEBP thumbnail from JPEG', async () => {
      const result = await generateThumbnail(testImageBuffer, {
        width: 400,
        format: 'webp',
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.format).toBe('webp');
      expect(result.width).toBe(400);
      expect(result.height).toBe(300); // Maintains aspect ratio (800x600 -> 400x300)
      expect(result.size).toBeGreaterThan(0);
    });

    it('should use default options when none provided', async () => {
      const result = await generateThumbnail(testImageBuffer);

      expect(result.width).toBe(400); // Default width
      expect(result.format).toBe('webp'); // Default format
    });

    it('should maintain aspect ratio', async () => {
      const result = await generateThumbnail(testImageBuffer, {
        width: 200,
      });

      // Original is 800x600 (4:3 ratio), scaled to 200px wide should be 200x150
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
    });

    it('should not upscale images smaller than target width', async () => {
      const result = await generateThumbnail(smallImageBuffer, {
        width: 400,
      });

      // Original is 200x150, should not upscale to 400
      expect(result.width).toBeLessThanOrEqual(200);
    });

    it('should generate JPEG format when specified', async () => {
      const result = await generateThumbnail(testImageBuffer, {
        width: 400,
        format: 'jpeg',
      });

      expect(result.format).toBe('jpeg');
    });

    it('should generate PNG format when specified', async () => {
      const result = await generateThumbnail(testImageBuffer, {
        width: 400,
        format: 'png',
      });

      expect(result.format).toBe('png');
    });

    it('should apply quality setting', async () => {
      const lowQuality = await generateThumbnail(testImageBuffer, {
        width: 400,
        quality: 50,
      });

      const highQuality = await generateThumbnail(testImageBuffer, {
        width: 400,
        quality: 95,
      });

      // Low quality should produce smaller file
      expect(lowQuality.size).toBeLessThan(highQuality.size);
    });

    it('should throw error for invalid image buffer', async () => {
      await expect(
        generateThumbnail(invalidBuffer)
      ).rejects.toThrow('Failed to generate thumbnail');
    });

    it('should handle empty buffer', async () => {
      await expect(
        generateThumbnail(Buffer.alloc(0))
      ).rejects.toThrow('Failed to generate thumbnail');
    });
  });

  describe('isValidImage', () => {
    it('should return true for valid JPEG image', async () => {
      const result = await isValidImage(testImageBuffer);
      expect(result).toBe(true);
    });

    it('should return true for valid PNG image', async () => {
      const result = await isValidImage(smallImageBuffer);
      expect(result).toBe(true);
    });

    it('should return false for invalid buffer', async () => {
      const result = await isValidImage(invalidBuffer);
      expect(result).toBe(false);
    });

    it('should return false for empty buffer', async () => {
      const result = await isValidImage(Buffer.alloc(0));
      expect(result).toBe(false);
    });
  });

  describe('getImageMetadata', () => {
    it('should return metadata for valid image', async () => {
      const metadata = await getImageMetadata(testImageBuffer);

      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
      expect(metadata.format).toBe('jpeg');
      expect(metadata.channels).toBe(3);
    });

    it('should return PNG metadata', async () => {
      const metadata = await getImageMetadata(smallImageBuffer);

      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150);
      expect(metadata.format).toBe('png');
      expect(metadata.channels).toBe(4); // PNG with alpha
    });

    it('should throw error for invalid image', async () => {
      await expect(
        getImageMetadata(invalidBuffer)
      ).rejects.toThrow('Failed to read image metadata');
    });
  });

  describe('generateMultipleThumbnails', () => {
    it('should generate multiple thumbnail sizes', async () => {
      const sizes = [150, 400, 800];
      const results = await generateMultipleThumbnails(testImageBuffer, sizes);

      expect(results.size).toBe(3);

      const small = results.get(150);
      expect(small?.width).toBe(150);

      const medium = results.get(400);
      expect(medium?.width).toBe(400);

      const large = results.get(800);
      expect(large?.width).toBe(800);
    });

    it('should apply shared options to all thumbnails', async () => {
      const sizes = [200, 400];
      const results = await generateMultipleThumbnails(testImageBuffer, sizes, {
        format: 'jpeg',
        quality: 80,
      });

      for (const thumbnail of results.values()) {
        expect(thumbnail.format).toBe('jpeg');
      }
    });

    it('should handle single size', async () => {
      const results = await generateMultipleThumbnails(testImageBuffer, [400]);

      expect(results.size).toBe(1);
      expect(results.get(400)?.width).toBe(400);
    });

    it('should process sizes in parallel', async () => {
      const sizes = [150, 300, 600, 800];
      const startTime = Date.now();

      await generateMultipleThumbnails(testImageBuffer, sizes);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parallel processing should be faster than sequential
      // This is a rough check - parallel should complete in reasonable time
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
