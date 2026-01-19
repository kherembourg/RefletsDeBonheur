/**
 * Cloudflare R2 Storage Types
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: Date;
}

export interface MediaUploadOptions {
  weddingId: string;
  fileName: string;
  contentType: string;
  guestIdentifier?: string;
}

export interface ProcessedMedia {
  originalUrl: string;
  thumbnailUrl?: string;
  optimizedUrl?: string;
  width?: number;
  height?: number;
  fileSize: number;
}
