/**
 * R2 Media Deletion Helper
 *
 * Deletes R2 objects associated with a media record (original + thumbnail).
 * Errors are collected and returned rather than thrown, allowing callers
 * to handle R2 failures gracefully without blocking database operations.
 */

import { deleteFile, extractKeyFromUrl, isR2Configured } from './client';

/**
 * Delete R2 objects for a media record.
 *
 * @param originalUrl - The original_url from the media record
 * @param thumbnailUrl - The thumbnail_url from the media record (may be null)
 * @returns Array of error messages (empty if all deletions succeeded)
 */
export async function deleteR2MediaFiles(
  originalUrl: string | null,
  thumbnailUrl: string | null
): Promise<string[]> {
  const errors: string[] = [];

  if (!isR2Configured()) {
    // R2 not configured - nothing to delete (e.g., demo mode or local dev)
    return errors;
  }

  // Delete original file
  if (originalUrl) {
    try {
      const originalKey = extractKeyFromUrl(originalUrl);
      if (originalKey) {
        await deleteFile(originalKey);
      } else {
        // URL doesn't match R2 public URL pattern - might be external or demo URL
        // This is not an error, just skip
      }
    } catch (error) {
      const message = `Failed to delete original R2 object: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[R2] ' + message, { originalUrl });
      errors.push(message);
    }
  }

  // Delete thumbnail file
  if (thumbnailUrl) {
    try {
      const thumbnailKey = extractKeyFromUrl(thumbnailUrl);
      if (thumbnailKey) {
        await deleteFile(thumbnailKey);
      }
    } catch (error) {
      const message = `Failed to delete thumbnail R2 object: ${error instanceof Error ? error.message : String(error)}`;
      console.error('[R2] ' + message, { thumbnailUrl });
      errors.push(message);
    }
  }

  return errors;
}
