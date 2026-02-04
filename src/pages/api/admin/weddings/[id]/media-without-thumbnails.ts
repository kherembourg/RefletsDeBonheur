/**
 * API Endpoint: List Media Without Thumbnails
 *
 * GET /api/admin/weddings/{id}/media-without-thumbnails
 *
 * Lists all images without thumbnails for a wedding.
 * Requires admin access to the wedding.
 *
 * Authorization:
 * - Supabase auth token (Bearer token) for wedding owner
 *
 * Response:
 * {
 *   count: number,
 *   media: Array<Media>
 * }
 */

import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../../../lib/supabase/server';
import { supabase } from '../../../../../lib/supabase/client';
import { apiGuards, apiResponse } from '../../../../../lib/api/middleware';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  // Guards
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const weddingId = params.id;
  if (!weddingId) {
    return apiResponse.error(
      'Missing parameter',
      'Wedding ID is required',
      400
    );
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

    // Query media without thumbnails
    const { data: media, error } = await adminClient
      .from('media')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('type', 'image')
      .is('thumbnail_url', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Failed to query media:', error);
      throw new Error('Failed to query media');
    }

    return apiResponse.success({
      count: media?.length || 0,
      media: media || [],
    });
  } catch (error) {
    console.error('[API] Query failed:', error);

    return apiResponse.error(
      'Query failed',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
};
