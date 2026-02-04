/**
 * API Endpoint: Confirm Upload Complete
 *
 * Called after client-side upload to R2 completes.
 * Creates the media record in Supabase database.
 *
 * POST /api/upload/confirm
 *
 * Request body:
 * {
 *   weddingId: string,
 *   key: string,
 *   publicUrl: string,
 *   contentType: string,
 *   caption?: string,
 *   guestName?: string,
 *   guestIdentifier?: string
 * }
 *
 * Response:
 * {
 *   media: Media
 * }
 */

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { generateThumbnail } from '../../../lib/imageProcessing';
import { extractKeyFromUrl, fetchFile, uploadFile, generateThumbnailKey } from '../../../lib/r2';

export const prerender = false;

// Maximum image size for thumbnail generation (10MB)
// Larger images will skip thumbnail generation to prevent memory exhaustion
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * Validate upload authorization for confirm endpoint
 */
async function validateUploadAuthorization(
  request: Request,
  weddingId: string,
  guestIdentifier: string | undefined,
  adminClient: ReturnType<typeof getSupabaseAdminClient>
): Promise<{ authorized: boolean; ownerId?: string; error?: string }> {
  // First, get the wedding owner
  const { data: wedding, error: weddingError } = await adminClient
    .from('weddings')
    .select('owner_id')
    .eq('id', weddingId)
    .single();

  if (weddingError || !wedding) {
    return { authorized: false, error: 'Wedding not found' };
  }

  // Method 1: Check Supabase auth token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user && user.id === wedding.owner_id) {
        return { authorized: true, ownerId: wedding.owner_id };
      }
    } catch {
      // Token invalid, continue to other methods
    }
  }

  // Method 2: Check guest session token
  if (guestIdentifier) {
    const { data: guestSession, error } = await adminClient
      .from('guest_sessions')
      .select('id, wedding_id')
      .eq('session_token', guestIdentifier)
      .eq('wedding_id', weddingId)
      .maybeSingle();

    if (!error && guestSession) {
      return { authorized: true, ownerId: wedding.owner_id };
    }
  }

  return {
    authorized: false,
    error: 'Upload authorization required. Provide a valid session or guest identifier.',
  };
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit check - 20 requests per IP per minute
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.upload);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // Check if Supabase is configured
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  try {
    const body = await request.json();

    // Validate required fields
    const { weddingId, key, publicUrl, contentType, caption, guestName, guestIdentifier } = body;

    if (!weddingId || !key || !publicUrl || !contentType) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'weddingId, key, publicUrl, and contentType are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Determine media type from content type
    const type = contentType.startsWith('video') ? 'video' : 'image';

    const adminClient = getSupabaseAdminClient();

    // Authorization check - user must be owner or have valid guest session
    const authResult = await validateUploadAuthorization(
      request,
      weddingId,
      guestIdentifier,
      adminClient
    );

    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: authResult.error,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Idempotency check: Return existing media if already confirmed
    // This prevents duplicate uploads and race conditions
    const { data: existingMedia, error: existingError } = await adminClient
      .from('media')
      .select('id, type, original_url, optimized_url, thumbnail_url, caption, guest_name, guest_identifier, status, moderation_status, created_at')
      .eq('wedding_id', weddingId)
      .eq('original_url', publicUrl)
      .maybeSingle();

    if (existingMedia) {
      console.log('[API] Upload already confirmed (idempotent):', existingMedia.id);
      return new Response(
        JSON.stringify({
          media: existingMedia,
          message: 'Upload already confirmed (idempotent)',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (existingError) {
      console.error('[API] Error checking for existing media:', existingError);
      // Continue with upload - don't fail on idempotency check error
    }

    // Generate thumbnail for images (but not videos)
    let thumbnailUrl: string | null = null;

    if (type === 'image') {
      try {
        console.log('[API] Generating thumbnail for:', key);

        // Fetch original image from R2
        const originalImageBuffer = await fetchFile(key);
        console.log('[API] Fetched image buffer:', {
          key,
          size: originalImageBuffer.length,
          sizeKB: Math.round(originalImageBuffer.length / 1024),
        });

        // Check buffer size to prevent memory exhaustion DoS
        if (originalImageBuffer.length > MAX_IMAGE_SIZE) {
          console.warn(
            `[API] Image too large for thumbnail generation: ${originalImageBuffer.length} bytes (max: ${MAX_IMAGE_SIZE})`
          );
          // Continue without thumbnail - graceful degradation
          thumbnailUrl = null;
        } else {
          // Generate 400px WEBP thumbnail
          const thumbnail = await generateThumbnail(originalImageBuffer, {
            width: 400,
            quality: 85,
            format: 'webp',
          });

          console.log('[API] Thumbnail generated:', {
            originalSize: originalImageBuffer.length,
            thumbnailSize: thumbnail.size,
            compressionRatio: (thumbnail.size / originalImageBuffer.length * 100).toFixed(1) + '%',
            dimensions: `${thumbnail.width}x${thumbnail.height}`,
          });

          // Upload thumbnail to R2
          const thumbnailKey = generateThumbnailKey(key, '400w');
          const uploadResult = await uploadFile(
            thumbnailKey,
            thumbnail.buffer,
            'image/webp',
            {
              'wedding-id': weddingId,
              'original-key': key,
              'thumbnail-size': '400w',
            }
          );

          thumbnailUrl = uploadResult.url;

          console.log('[API] Thumbnail uploaded successfully:', thumbnailUrl);
        }
      } catch (thumbnailError) {
        // Enhanced error logging
        console.error('[API] Failed to generate thumbnail:', {
          key,
          error: thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError),
          stack: thumbnailError instanceof Error ? thumbnailError.stack : undefined,
        });
        // Continue without thumbnail - the upload should still succeed
      }
    }

    // Create media record in database
    const { data: media, error } = await adminClient
      .from('media')
      .insert({
        wedding_id: weddingId,
        type,
        original_url: publicUrl,
        optimized_url: null, // Could be set in future for additional optimization
        thumbnail_url: thumbnailUrl, // Generated above for images, null for videos
        caption: caption || null,
        guest_name: guestName || null,
        guest_identifier: guestIdentifier || null,
        status: 'ready',
        moderation_status: 'approved', // Auto-approve for now
      })
      .select()
      .single();

    if (error || !media) {
      console.error('[API] Upload confirm database error:', error);

      // Check if this is a trial limit error from the database trigger
      const errorMessage = error?.message || '';
      if (errorMessage.includes('TRIAL_PHOTO_LIMIT')) {
        return new Response(
          JSON.stringify({
            error: 'Trial limit reached',
            code: 'TRIAL_PHOTO_LIMIT',
            message: 'Your free trial allows up to 50 photos. Upgrade to upload unlimited photos.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (errorMessage.includes('TRIAL_VIDEO_LIMIT')) {
        return new Response(
          JSON.stringify({
            error: 'Trial limit reached',
            code: 'TRIAL_VIDEO_LIMIT',
            message: 'Your free trial allows up to 1 video. Upgrade to upload unlimited videos.',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error('Failed to create media record');
    }

    return new Response(
      JSON.stringify({
        media,
        message: 'Upload confirmed successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API] Upload confirm error:', error);

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
