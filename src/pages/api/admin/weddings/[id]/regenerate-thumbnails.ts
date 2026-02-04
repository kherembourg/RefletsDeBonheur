/**
 * API Endpoint: Batch Regenerate Thumbnails
 *
 * POST /api/admin/weddings/{id}/regenerate-thumbnails
 *
 * Regenerates thumbnails for multiple images in a wedding.
 * Requires admin access to the wedding.
 *
 * Query Parameters:
 * - missingOnly=true: Only regenerate for media without thumbnails (default: false)
 * - limit=N: Maximum number of images to process (default: 100, max: 100)
 *
 * Authorization:
 * - Supabase auth token (Bearer token) for wedding owner
 *
 * Response:
 * {
 *   processed: number,
 *   succeeded: number,
 *   failed: number,
 *   results: Array<{ mediaId: string, success: boolean, error?: string, thumbnailUrl?: string }>
 * }
 */

import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../../../lib/supabase/server';
import { supabase } from '../../../../../lib/supabase/client';
import { apiGuards, apiResponse } from '../../../../../lib/api/middleware';
import { generateThumbnail } from '../../../../../lib/imageProcessing';
import { fetchFile, uploadFile, generateThumbnailKey, extractKeyFromUrl } from '../../../../../lib/r2';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, url }) => {
  // Guards
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const r2Guard = apiGuards.requireR2();
  if (r2Guard) return r2Guard;

  const weddingId = params.id;
  if (!weddingId) {
    return apiResponse.error(
      'Missing parameter',
      'Wedding ID is required',
      400
    );
  }

  // Parse query parameters
  const missingOnly = url.searchParams.get('missingOnly') === 'true';
  const limitParam = url.searchParams.get('limit');
  let limit = 100;

  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return apiResponse.error(
        'Invalid parameter',
        'Limit must be a positive integer',
        400
      );
    }
    if (parsedLimit > 100) {
      return apiResponse.error(
        'Invalid parameter',
        'Limit cannot exceed 100',
        400
      );
    }
    limit = parsedLimit;
  }

  try {
    const adminClient = getSupabaseAdminClient();

    // Verify authorization
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
      .eq('id', weddingId)
      .single();

    if (weddingError || !wedding) {
      return apiResponse.error(
        'Wedding not found',
        'Wedding not found',
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

    // Query media items
    let query = adminClient
      .from('media')
      .select('id, type, original_url, thumbnail_url')
      .eq('wedding_id', weddingId)
      .eq('type', 'image');

    if (missingOnly) {
      query = query.is('thumbnail_url', null);
    }

    query = query.limit(limit);

    const { data: mediaItems, error } = await query;

    if (error) {
      console.error('[API] Failed to fetch media:', error);
      throw new Error('Failed to fetch media');
    }

    if (!mediaItems || mediaItems.length === 0) {
      return apiResponse.success({
        processed: 0,
        succeeded: 0,
        failed: 0,
        results: [],
        message: missingOnly
          ? 'No images without thumbnails found'
          : 'No images found',
      });
    }

    console.log(
      `[API] Processing ${mediaItems.length} images for wedding ${weddingId} (missingOnly: ${missingOnly})`
    );

    // Process each media item
    const results = await Promise.allSettled(
      mediaItems.map(async (item) => {
        try {
          const key = extractKeyFromUrl(item.original_url);
          if (!key) {
            throw new Error('Invalid URL: cannot extract storage key');
          }

          // Fetch original image
          const buffer = await fetchFile(key);

          // Generate thumbnail
          const thumbnail = await generateThumbnail(buffer, {
            width: 400,
            quality: 85,
            format: 'webp',
          });

          // Upload thumbnail
          const thumbnailKey = generateThumbnailKey(key, '400w');
          const uploadResult = await uploadFile(thumbnailKey, thumbnail.buffer, 'image/webp', {
            'wedding-id': weddingId,
            'media-id': item.id,
            'original-key': key,
            'thumbnail-size': '400w',
            'batch-regenerated-at': new Date().toISOString(),
          });

          // Update database
          const { error: updateError } = await adminClient
            .from('media')
            .update({ thumbnail_url: uploadResult.url })
            .eq('id', item.id);

          // Check if update failed (e.g., row deleted, permission issue)
          if (updateError) {
            throw new Error(`Failed to update media record: ${updateError.message}`);
          }

          return {
            mediaId: item.id,
            success: true,
            thumbnailUrl: uploadResult.url,
          };
        } catch (error) {
          console.error(`[API] Failed to regenerate thumbnail for ${item.id}:`, error);
          throw error;
        }
      })
    );

    // Count successes and failures
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Format results
    const formattedResults = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            mediaId: mediaItems[i].id,
            success: false,
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          }
    );

    console.log(
      `[API] Batch regeneration complete: ${succeeded} succeeded, ${failed} failed`
    );

    return apiResponse.success({
      processed: mediaItems.length,
      succeeded,
      failed,
      results: formattedResults,
      message: `Processed ${mediaItems.length} images: ${succeeded} succeeded, ${failed} failed`,
    });
  } catch (error) {
    console.error('[API] Batch regeneration failed:', error);

    return apiResponse.error(
      'Batch regeneration failed',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
};
