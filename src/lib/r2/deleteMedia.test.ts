/**
 * Tests for R2 Media Deletion Helper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the R2 client module
const mockDeleteFile = vi.fn();
const mockExtractKeyFromUrl = vi.fn();
const mockIsR2Configured = vi.fn();

vi.mock('./client', () => ({
  deleteFile: (...args: any[]) => mockDeleteFile(...args),
  extractKeyFromUrl: (...args: any[]) => mockExtractKeyFromUrl(...args),
  isR2Configured: () => mockIsR2Configured(),
}));

import { deleteR2MediaFiles } from './deleteMedia';

describe('deleteR2MediaFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsR2Configured.mockReturnValue(true);
  });

  it('should delete both original and thumbnail R2 objects', async () => {
    mockExtractKeyFromUrl
      .mockReturnValueOnce('weddings/w1/media/photo.jpg')
      .mockReturnValueOnce('weddings/w1/thumbnails/photo-400w.webp');
    mockDeleteFile.mockResolvedValue(undefined);

    const errors = await deleteR2MediaFiles(
      'https://r2.example.com/weddings/w1/media/photo.jpg',
      'https://r2.example.com/weddings/w1/thumbnails/photo-400w.webp'
    );

    expect(errors).toEqual([]);
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
    expect(mockDeleteFile).toHaveBeenCalledWith('weddings/w1/media/photo.jpg');
    expect(mockDeleteFile).toHaveBeenCalledWith('weddings/w1/thumbnails/photo-400w.webp');
  });

  it('should delete only original when no thumbnail exists', async () => {
    mockExtractKeyFromUrl.mockReturnValueOnce('weddings/w1/media/photo.jpg');
    mockDeleteFile.mockResolvedValue(undefined);

    const errors = await deleteR2MediaFiles(
      'https://r2.example.com/weddings/w1/media/photo.jpg',
      null
    );

    expect(errors).toEqual([]);
    expect(mockDeleteFile).toHaveBeenCalledTimes(1);
    expect(mockDeleteFile).toHaveBeenCalledWith('weddings/w1/media/photo.jpg');
  });

  it('should return empty array when both URLs are null', async () => {
    const errors = await deleteR2MediaFiles(null, null);

    expect(errors).toEqual([]);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it('should return empty array when R2 is not configured', async () => {
    mockIsR2Configured.mockReturnValue(false);

    const errors = await deleteR2MediaFiles(
      'https://r2.example.com/weddings/w1/media/photo.jpg',
      'https://r2.example.com/weddings/w1/thumbnails/photo-400w.webp'
    );

    expect(errors).toEqual([]);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it('should skip URLs that do not match R2 public URL pattern', async () => {
    mockExtractKeyFromUrl.mockReturnValue(null);

    const errors = await deleteR2MediaFiles(
      'https://other-host.com/some-image.jpg',
      null
    );

    expect(errors).toEqual([]);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it('should collect errors but not throw when original deletion fails', async () => {
    mockExtractKeyFromUrl
      .mockReturnValueOnce('weddings/w1/media/photo.jpg')
      .mockReturnValueOnce('weddings/w1/thumbnails/photo-400w.webp');
    mockDeleteFile
      .mockRejectedValueOnce(new Error('R2 network error'))
      .mockResolvedValueOnce(undefined);

    const errors = await deleteR2MediaFiles(
      'https://r2.example.com/weddings/w1/media/photo.jpg',
      'https://r2.example.com/weddings/w1/thumbnails/photo-400w.webp'
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Failed to delete original R2 object');
    expect(errors[0]).toContain('R2 network error');
    // Thumbnail should still be deleted
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);
  });

  it('should collect errors but not throw when thumbnail deletion fails', async () => {
    mockExtractKeyFromUrl
      .mockReturnValueOnce('weddings/w1/media/photo.jpg')
      .mockReturnValueOnce('weddings/w1/thumbnails/photo-400w.webp');
    mockDeleteFile
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Thumbnail delete failed'));

    const errors = await deleteR2MediaFiles(
      'https://r2.example.com/weddings/w1/media/photo.jpg',
      'https://r2.example.com/weddings/w1/thumbnails/photo-400w.webp'
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Failed to delete thumbnail R2 object');
  });

  it('should collect both errors when both deletions fail', async () => {
    mockExtractKeyFromUrl
      .mockReturnValueOnce('weddings/w1/media/photo.jpg')
      .mockReturnValueOnce('weddings/w1/thumbnails/photo-400w.webp');
    mockDeleteFile
      .mockRejectedValueOnce(new Error('Original failed'))
      .mockRejectedValueOnce(new Error('Thumbnail failed'));

    const errors = await deleteR2MediaFiles(
      'https://r2.example.com/weddings/w1/media/photo.jpg',
      'https://r2.example.com/weddings/w1/thumbnails/photo-400w.webp'
    );

    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('original');
    expect(errors[1]).toContain('thumbnail');
  });
});
