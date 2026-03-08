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
  abortSignal?: AbortSignal;
}

export interface UploadError {
  code: string;
  message: string;
}

// Custom error for trial mode
export class TrialModeError extends Error {
  code = 'TRIAL_MODE';
  subscriptionStatus: string;

  constructor(message: string, subscriptionStatus: string) {
    super(message);
    this.name = 'TrialModeError';
    this.subscriptionStatus = subscriptionStatus;
  }
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
  const { weddingId, file, caption, guestName, guestIdentifier, onProgress, abortSignal } = options;

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
    signal: abortSignal,
  });

  if (!presignResponse.ok) {
    const error = await presignResponse.json();
    // Check if this is a trial mode restriction
    if (error.code === 'TRIAL_MODE') {
      throw new TrialModeError(error.message, error.subscriptionStatus);
    }
    throw new Error(error.message || 'Failed to get upload URL');
  }

  const { uploadUrl, key, publicUrl } = await presignResponse.json();

  // Step 2: Upload file to R2
  await uploadFileWithProgress(uploadUrl, file, onProgress, abortSignal);

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
    signal: abortSignal,
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
  onProgress?: (progress: UploadProgress) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Wire up AbortSignal to XHR
    if (abortSignal) {
      if (abortSignal.aborted) {
        reject(new Error('Upload aborted'));
        return;
      }
      const onAbort = () => xhr.abort();
      abortSignal.addEventListener('abort', onAbort, { once: true });
      // Clean up listener when XHR completes
      xhr.addEventListener('loadend', () => {
        abortSignal.removeEventListener('abort', onAbort);
      });
    }

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

/** Default number of concurrent uploads */
export const UPLOAD_BATCH_SIZE = 3;

/**
 * Upload multiple files with batched parallelism and overall progress tracking
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
    abortSignal?: AbortSignal;
    batchSize?: number;
  }
): Promise<MediaItem[]> {
  const {
    weddingId, files, guestName, guestIdentifier,
    onFileProgress, onOverallProgress,
    abortSignal, batchSize = UPLOAD_BATCH_SIZE,
  } = options;

  const results: MediaItem[] = new Array(files.length);
  let completed = 0;

  // Process files in batches of `batchSize`
  for (let batchStart = 0; batchStart < files.length; batchStart += batchSize) {
    // Check abort before starting a new batch
    if (abortSignal?.aborted) {
      throw new Error('Upload aborted');
    }

    const batchEnd = Math.min(batchStart + batchSize, files.length);
    const batch = files.slice(batchStart, batchEnd);

    const batchPromises = batch.map((item, batchIndex) => {
      const fileIndex = batchStart + batchIndex;
      return uploadToR2({
        weddingId,
        file: item.file,
        caption: item.caption,
        guestName,
        guestIdentifier,
        onProgress: (progress) => {
          onFileProgress?.(fileIndex, progress);
        },
        abortSignal,
      }).then((mediaItem) => {
        results[fileIndex] = mediaItem;
        completed++;
        onOverallProgress?.(completed, files.length);
        return mediaItem;
      });
    });

    try {
      await Promise.all(batchPromises);
    } catch (error) {
      const fileName = batch.find((_, i) => !results[batchStart + i])?.file.name ?? 'unknown';
      console.error(`Failed to upload file ${fileName}:`, error);
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
