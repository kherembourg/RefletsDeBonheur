/**
 * API Endpoint: Regenerate Thumbnail for Media Item
 *
 * POST /api/admin/media/{id}/regenerate-thumbnail
 *
 * Regenerates thumbnail for a single media item.
 * Requires admin access to the wedding.
 *
 * Authorization:
 * - Supabase auth token (Bearer token) for wedding owner
 *
 * Response:
 * {
 *   media: Media,
 *   thumbnail: {
 *     url: string,
 *     size: number,
 *     width: number,
 *     height: number
 *   },
 *   message: string
 * }
 */

import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../../../lib/supabase/server';
import { supabase } from '../../../../../lib/supabase/client';
import { apiGuards, apiResponse } from '../../../../../lib/api/middleware';
import { generateThumbnail } from '../../../../../lib/imageProcessing';
import { fetchFile, uploadFile, generateThumbnailKey, extractKeyFromUrl } from '../../../../../lib/r2';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  // Guards
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const r2Guard = apiGuards.requireR2();
  if (r2Guard) return r2Guard;

  const mediaId = params.id;
  if (!mediaId) {
    return apiResponse.error(
      'Missing parameter',
      'Media ID is required',
      400
    );
  }

  try {
    const adminClient = getSupabaseAdminClient();

    // Get media record
    const { data: media, error: mediaError } = await adminClient
      .from('media')
      .select('id, wedding_id, type, original_url, thumbnail_url')
      .eq('id', mediaId)
      .single();

    if (mediaError || !media) {
      return apiResponse.error(
        'Media not found',
        `No media found with ID: ${mediaId}`,
        404
      );
    }

    // Verify user has access to this wedding
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiResponse.error(
        'Unauthorized',
        'Authorization token required',
        401
      );
    }

    const token = authHeader.slice(7);
    const userResponse = await supabase.auth.getUser(token);
    const user = userResponse?.data?.user;
    const userError = userResponse?.error;

    if (userError || !user) {
      return apiResponse.error(
        'Unauthorized',
        'Invalid authorization token',
        401
      );
    }

    // Check wedding ownership
    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .select('owner_id')
      .eq('id', media.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return apiResponse.error(
        'Wedding not found',
        'Associated wedding not found',
        404
      );
    }

    if (wedding.owner_id !== user.id) {
      return apiResponse.error(
        'Forbidden',
        'You do not have access to this wedding',
        403
      );
    }

    // Only regenerate for images
    if (media.type !== 'image') {
      return apiResponse.error(
        'Invalid media type',
        'Thumbnails can only be generated for images, not videos',
        400
      );
    }

    // Extract key from original URL
    const key = extractKeyFromUrl(media.original_url);
    if (!key) {
      return apiResponse.error(
        'Invalid URL',
        'Cannot extract storage key from original URL',
        400
      );
    }

    console.log('[API] Regenerating thumbnail for media:', mediaId);

    // Fetch original image
    const originalImageBuffer = await fetchFile(key);

    // Generate thumbnail
    const thumbnail = await generateThumbnail(originalImageBuffer, {
      width: 400,
      quality: 85,
      format: 'webp',
    });

    // Upload thumbnail
    const thumbnailKey = generateThumbnailKey(key, '400w');
    const uploadResult = await uploadFile(
      thumbnailKey,
      thumbnail.buffer,
      'image/webp',
      {
        'wedding-id': media.wedding_id,
        'media-id': mediaId,
        'original-key': key,
        'thumbnail-size': '400w',
        'regenerated-at': new Date().toISOString(),
      }
    );

    // Update database
    const { data: updatedMedia, error: updateError } = await adminClient
      .from('media')
      .update({ thumbnail_url: uploadResult.url })
      .eq('id', mediaId)
      .select()
      .single();

    if (updateError || !updatedMedia) {
      console.error('[API] Failed to update media record:', updateError);
      throw new Error('Failed to update media record');
    }

    console.log('[API] Thumbnail regenerated successfully:', uploadResult.url);

    return apiResponse.success({
      media: updatedMedia,
      thumbnail: {
        url: uploadResult.url,
        size: thumbnail.size,
        width: thumbnail.width,
        height: thumbnail.height,
      },
      message: 'Thumbnail regenerated successfully',
    });
  } catch (error) {
    console.error('[API] Thumbnail regeneration failed:', error);

    return apiResponse.error(
      'Regeneration failed',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
};
