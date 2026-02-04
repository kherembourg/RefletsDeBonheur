/**
 * Image Processing Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import sharp from 'sharp';
import {
  generateThumbnail,
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

});
