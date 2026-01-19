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
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database not configured',
        message: 'Supabase is not configured. Please set environment variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database admin not configured',
        message: 'SUPABASE_SERVICE_ROLE_KEY is required for uploads. Configure it on the server.',
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

    // Create media record in database
    const { data: media, error } = await adminClient
      .from('media')
      .insert({
        wedding_id: weddingId,
        type,
        original_url: publicUrl,
        optimized_url: null, // Will be set by background processing
        thumbnail_url: null, // Will be set by background processing
        caption: caption || null,
        guest_name: guestName || null,
        guest_identifier: guestIdentifier || null,
        status: 'ready', // For now, mark as ready immediately
        moderation_status: 'approved', // Auto-approve for now
      })
      .select()
      .single();

    if (error || !media) {
      console.error('[API] Upload confirm database error:', error);
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
