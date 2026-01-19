/**
 * API Endpoint: Generate Presigned URL for Upload
 *
 * POST /api/upload/presign
 *
 * Request body:
 * {
 *   weddingId: string,
 *   fileName: string,
 *   contentType: string,
 *   guestIdentifier?: string
 * }
 *
 * Response:
 * {
 *   uploadUrl: string,
 *   key: string,
 *   publicUrl: string,
 *   expiresAt: string
 * }
 */

import type { APIRoute } from 'astro';
import { generatePresignedUploadUrl, isR2Configured } from '../../../lib/r2';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Check if R2 is configured
  if (!isR2Configured()) {
    return new Response(
      JSON.stringify({
        error: 'Storage not configured',
        message: 'R2 storage is not configured. Please set environment variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    const { weddingId, fileName, contentType, guestIdentifier } = body;

    if (!weddingId || !fileName || !contentType) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'weddingId, fileName, and contentType are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
    ];

    if (!allowedTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid content type',
          message: `Content type ${contentType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate presigned URL
    const result = await generatePresignedUploadUrl({
      weddingId,
      fileName,
      contentType,
      guestIdentifier,
    });

    return new Response(
      JSON.stringify({
        uploadUrl: result.uploadUrl,
        key: result.key,
        publicUrl: result.publicUrl,
        expiresAt: result.expiresAt.toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API] Upload presign error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
