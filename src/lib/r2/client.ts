/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible, so we use the AWS SDK with custom endpoint
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { R2Config, PresignedUrlResult, MediaUploadOptions, UploadResult } from './types';

// ============================================
// Configuration
// ============================================

export function getR2Config(): R2Config | null {
  // Server-side only - check for environment variables
  const accountId = import.meta.env.R2_ACCOUNT_ID;
  const accessKeyId = import.meta.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.R2_SECRET_ACCESS_KEY;
  const bucketName = import.meta.env.R2_BUCKET_NAME;
  const publicUrl = import.meta.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl || `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

// ============================================
// S3 Client
// ============================================

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables.');
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return s3Client;
}

// ============================================
// Storage Operations
// ============================================

/**
 * Validate that a storage key follows expected pattern
 * Prevents SSRF attacks by ensuring keys only access wedding resources
 *
 * @param key - Storage key to validate
 * @throws Error if key is invalid or contains path traversal attempts
 */
function validateStorageKey(key: string): void {
  // Must start with weddings/ prefix
  if (!key.startsWith('weddings/')) {
    throw new Error('Invalid storage key: must start with weddings/');
  }

  // No path traversal attempts
  if (key.includes('..') || key.includes('//')) {
    throw new Error('Invalid storage key: path traversal detected');
  }

  // Must match expected pattern: weddings/{id}/(media|thumbnails)/{filename}
  const validPattern = /^weddings\/[a-zA-Z0-9-]+\/(media|thumbnails)\/[a-zA-Z0-9._-]+$/;
  if (!validPattern.test(key)) {
    throw new Error('Invalid storage key: does not match expected pattern');
  }

  // Additional safeguards
  if (key.length > 500) {
    throw new Error('Invalid storage key: too long');
  }
}

/**
 * Generate a unique storage key for a media file
 */
export function generateStorageKey(options: MediaUploadOptions): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = options.fileName.split('.').pop() || 'bin';
  const sanitizedName = options.fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars
    .substring(0, 50); // Limit length

  return `weddings/${options.weddingId}/media/${timestamp}-${random}-${sanitizedName}.${extension}`;
}

/**
 * Generate a presigned URL for client-side upload
 */
export async function generatePresignedUploadUrl(
  options: MediaUploadOptions
): Promise<PresignedUrlResult> {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  const client = getS3Client();
  const key = generateStorageKey(options);

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: options.contentType,
    Metadata: {
      'wedding-id': options.weddingId,
      'guest-identifier': options.guestIdentifier || 'anonymous',
      'original-filename': options.fileName,
    },
  });

  // URL expires in 15 minutes
  const expiresIn = 15 * 60;
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    key,
    publicUrl: `${config.publicUrl}/${key}`,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/**
 * Upload a file directly (server-side)
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  // Validate key before processing
  validateStorageKey(key);

  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  await client.send(command);

  // Get file size
  const headCommand = new HeadObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  const headResult = await client.send(headCommand);

  return {
    key,
    url: `${config.publicUrl}/${key}`,
    size: headResult.ContentLength || 0,
    contentType,
  };
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  // Validate key before processing
  validateStorageKey(key);

  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Get the public URL for a storage key
 */
export function getPublicUrl(key: string): string {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  return `${config.publicUrl}/${key}`;
}

/**
 * Extract the storage key from a public URL
 */
export function extractKeyFromUrl(url: string): string | null {
  const config = getR2Config();
  if (!config || !url.startsWith(config.publicUrl)) {
    return null;
  }

  return url.replace(`${config.publicUrl}/`, '');
}

/**
 * Generate a thumbnail storage key from an original media key
 *
 * @param originalKey - Original media storage key (e.g., "weddings/123/media/file.jpg")
 * @param suffix - Optional suffix to append (e.g., "400w" for 400px wide)
 * @returns Thumbnail storage key (e.g., "weddings/123/thumbnails/file-400w.webp")
 * @throws Error if originalKey is invalid or contains path traversal
 *
 * @example
 * ```ts
 * const originalKey = "weddings/abc/media/1234-photo.jpg";
 * const thumbnailKey = generateThumbnailKey(originalKey, "400w");
 * // Returns: "weddings/abc/thumbnails/1234-photo-400w.webp"
 * ```
 */
export function generateThumbnailKey(originalKey: string, suffix: string = '400w'): string {
  // Validate input first
  validateStorageKey(originalKey);

  // Validate suffix
  if (!/^[a-zA-Z0-9-]+$/.test(suffix)) {
    throw new Error('Invalid suffix: must contain only alphanumeric characters and hyphens');
  }

  if (suffix.length > 20) {
    throw new Error('Invalid suffix: exceeds maximum length of 20 characters');
  }

  // Extract wedding ID and filename from original key
  // Format: weddings/{weddingId}/media/{filename}
  const parts = originalKey.split('/');

  // After validation, we know the format is correct
  const weddingId = parts[1];
  const filename = parts[parts.length - 1];

  // Additional safety: validate extracted parts
  if (!/^[a-zA-Z0-9-]+$/.test(weddingId)) {
    throw new Error('Invalid wedding ID: must contain only alphanumeric characters and hyphens');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    throw new Error('Invalid filename: must contain only alphanumeric characters, dots, underscores, and hyphens');
  }

  // Remove extension and add suffix
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Return thumbnail key with .webp extension
  const thumbnailKey = `weddings/${weddingId}/thumbnails/${nameWithoutExt}-${suffix}.webp`;

  // Final safety check: validate output
  if (thumbnailKey.includes('..') || thumbnailKey.includes('//')) {
    throw new Error('Generated thumbnail key contains invalid sequences');
  }

  return thumbnailKey;
}

/**
 * Fetch a file from R2 storage as a buffer
 *
 * @param key - Storage key of the file to fetch
 * @returns File buffer
 */
export async function fetchFile(key: string): Promise<Buffer> {
  // Validate key before processing
  validateStorageKey(key);

  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  const client = getS3Client();

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      throw new Error('File not found or empty response');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    throw new Error(
      `Failed to fetch file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
