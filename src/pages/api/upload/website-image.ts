/**
 * API Endpoint: Generate Presigned URL for Website Editor Image Upload
 *
 * POST /api/upload/website-image
 *
 * This is a simplified upload endpoint for website customization images.
 * Unlike /api/upload/presign, it:
 * - Only accepts image types (no video)
 * - Uses a different R2 path (weddings/{id}/website/)
 * - Doesn't create media records (images are stored in customization JSON)
 * - Has a smaller file size limit (5MB vs 10MB)
 *
 * Request body:
 * {
 *   weddingId: string,
 *   fileName: string,
 *   contentType: string,
 *   imageKey: string (e.g., 'heroImage', 'couplePhoto')
 * }
 *
 * Response:
 * {
 *   uploadUrl: string,
 *   publicUrl: string,
 *   key: string,
 *   expiresAt: string
 * }
 */

import type { APIRoute } from 'astro';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';

export const prerender = false;

// R2 Configuration
function getR2Config() {
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

// S3 Client (singleton)
let s3Client: S3Client | null = null;

function getS3Client(config: NonNullable<ReturnType<typeof getR2Config>>): S3Client {
  if (s3Client) return s3Client;

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

// Allowed image types for website customization
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Valid image keys for customization
const VALID_IMAGE_KEYS = [
  'heroImage',
  'heroBackgroundImage',
  'couplePhoto',
  'galleryPlaceholder',
  'logoImage',
  'faviconUrl',
];

export const POST: APIRoute = async ({ request }) => {
  // Rate limit check
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.upload);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // Check if R2 is configured
  const r2Config = getR2Config();
  if (!r2Config) {
    return new Response(
      JSON.stringify({
        error: 'Storage not configured',
        message: 'R2 storage is not configured.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const { weddingId, fileName, contentType, imageKey } = body;

    // Validate required fields
    if (!weddingId || !fileName || !contentType || !imageKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'weddingId, fileName, contentType, and imageKey are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(contentType)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid content type',
          message: `Only ${ALLOWED_TYPES.join(', ')} are allowed for website images.`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate image key
    if (!VALID_IMAGE_KEYS.includes(imageKey)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid image key',
          message: `Invalid imageKey. Valid keys: ${VALID_IMAGE_KEYS.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if demo mode is explicitly enabled
    const isDemoMode = import.meta.env.DEMO_MODE === 'true';

    // Validate wedding ownership (skip in demo mode)
    if (isSupabaseConfigured() && isSupabaseServiceRoleConfigured()) {
      const adminClient = getSupabaseAdminClient();

      // Check if wedding exists
      const { data: wedding, error: weddingError } = await adminClient
        .from('weddings')
        .select('id, owner_id')
        .eq('id', weddingId)
        .single();

      if (weddingError || !wedding) {
        return new Response(
          JSON.stringify({
            error: 'Wedding not found',
            message: 'The specified wedding does not exist',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check authorization via Supabase auth token (required unless demo mode)
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (error || !user || user.id !== wedding.owner_id) {
            return new Response(
              JSON.stringify({
                error: 'Unauthorized',
                message: 'You must be the wedding owner to upload website images.',
              }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        } catch {
          // Token invalid
          return new Response(
            JSON.stringify({
              error: 'Unauthorized',
              message: 'Invalid authorization token.',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      } else if (!isDemoMode) {
        // No auth header and not in demo mode - reject
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Authorization required. Please provide a valid Bearer token.',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      // Demo mode: allow uploads without auth for testing
    }

    // Generate storage key for website images
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = fileName.split('.').pop() || 'jpg';
    const key = `weddings/${weddingId}/website/${imageKey}-${timestamp}-${random}.${extension}`;

    // Generate presigned URL
    const client = getS3Client(r2Config);
    const command = new PutObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      ContentType: contentType,
      Metadata: {
        'wedding-id': weddingId,
        'image-key': imageKey,
        'original-filename': fileName,
      },
    });

    const expiresIn = 15 * 60; // 15 minutes
    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    return new Response(
      JSON.stringify({
        uploadUrl,
        publicUrl: `${r2Config.publicUrl}/${key}`,
        key,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API] Website image upload error:', error);

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
