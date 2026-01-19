/**
 * Client-side Upload Service
 *
 * Handles uploading files to R2 via presigned URLs
 */

import type { MediaItem } from '../services/dataService';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  weddingId: string;
  file: File;
  caption?: string;
  guestName?: string;
  guestIdentifier?: string;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadError {
  code: string;
  message: string;
}

/**
 * Upload a file to R2 storage
 *
 * Process:
 * 1. Request presigned URL from server
 * 2. Upload file directly to R2
 * 3. Confirm upload and create database record
 */
export async function uploadToR2(options: UploadOptions): Promise<MediaItem> {
  const { weddingId, file, caption, guestName, guestIdentifier, onProgress } = options;

  // Step 1: Get presigned URL
  const presignResponse = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weddingId,
      fileName: file.name,
      contentType: file.type,
      guestIdentifier,
    }),
  });

  if (!presignResponse.ok) {
    const error = await presignResponse.json();
    throw new Error(error.message || 'Failed to get upload URL');
  }

  const { uploadUrl, key, publicUrl } = await presignResponse.json();

  // Step 2: Upload file to R2
  await uploadFileWithProgress(uploadUrl, file, onProgress);

  // Step 3: Confirm upload and create database record
  const confirmResponse = await fetch('/api/upload/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weddingId,
      key,
      publicUrl,
      contentType: file.type,
      caption,
      guestName,
      guestIdentifier,
    }),
  });

  if (!confirmResponse.ok) {
    const error = await confirmResponse.json();
    throw new Error(error.message || 'Failed to confirm upload');
  }

  const { media } = await confirmResponse.json();

  // Convert to MediaItem format
  return {
    id: media.id,
    url: media.original_url,
    thumbnailUrl: media.thumbnail_url || undefined,
    type: media.type,
    caption: media.caption || undefined,
    author: media.guest_name || undefined,
    createdAt: new Date(media.created_at),
    reactions: {},
    albumIds: [],
  };
}

/**
 * Upload file with progress tracking using XMLHttpRequest
 */
function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Upload multiple files with overall progress tracking
 */
export async function uploadMultipleToR2(
  options: {
    weddingId: string;
    files: Array<{
      file: File;
      caption?: string;
    }>;
    guestName?: string;
    guestIdentifier?: string;
    onFileProgress?: (fileIndex: number, progress: UploadProgress) => void;
    onOverallProgress?: (completed: number, total: number) => void;
  }
): Promise<MediaItem[]> {
  const { weddingId, files, guestName, guestIdentifier, onFileProgress, onOverallProgress } = options;

  const results: MediaItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const { file, caption } = files[i];

    try {
      const mediaItem = await uploadToR2({
        weddingId,
        file,
        caption,
        guestName,
        guestIdentifier,
        onProgress: (progress) => {
          onFileProgress?.(i, progress);
        },
      });

      results.push(mediaItem);
      onOverallProgress?.(i + 1, files.length);
    } catch (error) {
      // Log error but continue with other files
      console.error(`Failed to upload file ${file.name}:`, error);
      // Re-throw to let caller handle
      throw error;
    }
  }

  return results;
}

/**
 * Check if R2 upload is available (by checking if API endpoint responds)
 */
export async function isR2UploadAvailable(): Promise<boolean> {
  try {
    // Just check if we can reach the API
    const response = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId: 'test',
        fileName: 'test.jpg',
        contentType: 'image/jpeg',
      }),
    });

    // 503 means R2 not configured, 400 or 200 means API is working
    return response.status !== 503;
  } catch {
    return false;
  }
}
