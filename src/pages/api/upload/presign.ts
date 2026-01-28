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
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';

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

    // Check subscription status - only allow cloud uploads for active subscriptions
    if (isSupabaseConfigured() && isSupabaseServiceRoleConfigured()) {
      const adminClient = getSupabaseAdminClient();

      // OPTIMIZED: Single query to get wedding with owner's profile (JOIN)
      // This reduces 2 sequential queries to 1
      const { data: weddingData, error: weddingError } = await adminClient
        .from('weddings')
        .select(`
          owner_id,
          profiles!weddings_owner_id_fkey (
            subscription_status
          )
        `)
        .eq('id', weddingId)
        .single();

      if (weddingError || !weddingData) {
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

      // Type assertion for the joined profile data
      const profile = weddingData.profiles as { subscription_status: string } | null;

      if (!profile) {
        return new Response(
          JSON.stringify({
            error: 'Profile not found',
            message: 'The wedding owner profile does not exist',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check subscription status and enforce trial limits
      if (profile.subscription_status === 'trial') {
        // Trial limits: 50 photos, 1 video
        const TRIAL_PHOTO_LIMIT = 50;
        const TRIAL_VIDEO_LIMIT = 1;

        const isVideo = contentType.startsWith('video/');
        const isPhoto = contentType.startsWith('image/');

        // Only query the count we actually need (not both)
        if (isPhoto) {
          const { count: photoCount, error: countError } = await adminClient
            .from('media')
            .select('*', { count: 'exact', head: true })
            .eq('wedding_id', weddingId)
            .eq('type', 'photo');

          // Fail-safe: if we can't verify limits, don't allow uploads
          if (countError) {
            console.error('[API] Error counting photos:', countError);
            return new Response(
              JSON.stringify({
                error: 'Database error',
                message: 'Unable to verify upload limits. Please try again.',
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          if ((photoCount ?? 0) >= TRIAL_PHOTO_LIMIT) {
            return new Response(
              JSON.stringify({
                error: 'Trial limit reached',
                code: 'TRIAL_PHOTO_LIMIT',
                message: `Your free trial allows up to ${TRIAL_PHOTO_LIMIT} photos. Upgrade to upload unlimited photos.`,
                limit: TRIAL_PHOTO_LIMIT,
                current: photoCount,
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        } else if (isVideo) {
          const { count: videoCount, error: countError } = await adminClient
            .from('media')
            .select('*', { count: 'exact', head: true })
            .eq('wedding_id', weddingId)
            .eq('type', 'video');

          // Fail-safe: if we can't verify limits, don't allow uploads
          if (countError) {
            console.error('[API] Error counting videos:', countError);
            return new Response(
              JSON.stringify({
                error: 'Database error',
                message: 'Unable to verify upload limits. Please try again.',
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          if ((videoCount ?? 0) >= TRIAL_VIDEO_LIMIT) {
            return new Response(
              JSON.stringify({
                error: 'Trial limit reached',
                code: 'TRIAL_VIDEO_LIMIT',
                message: `Your free trial allows up to ${TRIAL_VIDEO_LIMIT} video. Upgrade to upload unlimited videos.`,
                limit: TRIAL_VIDEO_LIMIT,
                current: videoCount,
              }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        }
      } else if (profile.subscription_status !== 'active') {
        // Expired or cancelled subscription - no uploads allowed
        return new Response(
          JSON.stringify({
            error: 'Subscription required',
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Your subscription has expired. Please renew to continue uploading.',
            subscriptionStatus: profile.subscription_status,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
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
