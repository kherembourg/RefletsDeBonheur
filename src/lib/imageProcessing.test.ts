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
  let pngBuffer: Buffer;
  let gifBuffer: Buffer;
  let webpBuffer: Buffer;

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

    // Generate PNG buffer
    pngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    // Generate GIF buffer
    gifBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .gif()
      .toBuffer();

    // Generate WEBP buffer
    webpBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 255, b: 0 },
      },
    })
      .webp()
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
      ).rejects.toThrow('Invalid image: unrecognized format');
    });

    it('should handle empty buffer', async () => {
      await expect(
        generateThumbnail(Buffer.alloc(0))
      ).rejects.toThrow('Invalid image: buffer too small');
    });
  });

  describe('Image Validation', () => {
    it('should reject non-image buffers', async () => {
      const maliciousBuffer = Buffer.from('#!/bin/bash\nrm -rf /');
      await expect(generateThumbnail(maliciousBuffer)).rejects.toThrow('unrecognized format');
    });

    it('should reject buffers with wrong magic numbers', async () => {
      const fakeBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      await expect(generateThumbnail(fakeBuffer)).rejects.toThrow('unrecognized format');
    });

    it('should reject buffers that are too small', async () => {
      const tinyBuffer = Buffer.from([0xFF, 0xD8]); // Only 2 bytes
      await expect(generateThumbnail(tinyBuffer)).rejects.toThrow('buffer too small');
    });

    it('should reject executable files masquerading as images', async () => {
      // Windows PE executable header
      const exeBuffer = Buffer.from([
        0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00,
        0x04, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00
      ]);
      await expect(generateThumbnail(exeBuffer)).rejects.toThrow('unrecognized format');
    });

    it('should reject PDF files', async () => {
      const pdfBuffer = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
        0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      await expect(generateThumbnail(pdfBuffer)).rejects.toThrow('unrecognized format');
    });

    it('should reject ZIP files', async () => {
      const zipBuffer = Buffer.from([
        0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, // ZIP header
        0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      await expect(generateThumbnail(zipBuffer)).rejects.toThrow('unrecognized format');
    });

    it('should accept valid JPEG with proper magic numbers', async () => {
      const result = await generateThumbnail(testImageBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should accept valid PNG with proper magic numbers', async () => {
      const result = await generateThumbnail(pngBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should accept valid GIF with proper magic numbers', async () => {
      const result = await generateThumbnail(gifBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should accept valid WEBP with proper magic numbers', async () => {
      const result = await generateThumbnail(webpBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should provide detailed error message for invalid format', async () => {
      const invalidBuffer = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB, 0xCD, 0xEF, 0x00, 0x00, 0x00, 0x00]);
      await expect(generateThumbnail(invalidBuffer)).rejects.toThrow('Supported formats: JPEG, PNG, GIF, WEBP');
    });
  });

});
