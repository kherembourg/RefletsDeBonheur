/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible, so we use the AWS SDK with custom endpoint
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { R2Config, PresignedUrlResult, MediaUploadOptions, UploadResult } from './types';

// ============================================
// Configuration
// ============================================

function getR2Config(): R2Config | null {
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

function getS3Client(): S3Client {
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
