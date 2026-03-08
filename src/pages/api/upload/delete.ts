/**
 * API Endpoint: Delete Media (DB record + R2 objects)
 *
 * Deletes a media record from the database and its associated R2 objects
 * (original file + thumbnail if present). R2 deletion failures are logged
 * but do not prevent the database record from being deleted.
 *
 * POST /api/upload/delete
 *
 * Request body:
 * {
 *   mediaId: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   r2Errors?: string[]
 * }
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { validateBody } from '../../../lib/api/validation';
import { deleteR2MediaFiles } from '../../../lib/r2/deleteMedia';
import { supabase } from '../../../lib/supabase/client';

const deleteMediaSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
});

export const prerender = false;

/**
 * Validate that the requester is authorized to delete media from this wedding.
 * Must be the wedding owner (via Supabase auth) or have a valid guest session
 * that matches the media's guest_identifier.
 */
async function validateDeleteAuthorization(
  request: Request,
  weddingOwnerId: string,
  mediaGuestIdentifier: string | null,
  weddingId: string,
  adminClient: ReturnType<typeof getSupabaseAdminClient>
): Promise<{ authorized: boolean; error?: string }> {
  // Method 1: Check Supabase auth token (wedding owner)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user && user.id === weddingOwnerId) {
        return { authorized: true };
      }
    } catch {
      // Token invalid, continue to other methods
    }
  }

  // Method 2: Check guest session token from body
  // Guests can only delete their own uploads
  const guestIdentifier = request.headers.get('X-Guest-Identifier');
  if (guestIdentifier && mediaGuestIdentifier) {
    const { data: guestSession } = await adminClient
      .from('guest_sessions')
      .select('id')
      .eq('session_token', guestIdentifier)
      .eq('wedding_id', weddingId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (guestSession && guestIdentifier === mediaGuestIdentifier) {
      return { authorized: true };
    }
  }

  return {
    authorized: false,
    error: 'You are not authorized to delete this media.',
  };
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit check
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.general);
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
    const validation = validateBody(deleteMediaSchema, body);
    if ('error' in validation) return validation.error;
    const { mediaId } = validation.data;

    const adminClient = getSupabaseAdminClient();

    // Fetch the media record to get URLs before deletion
    const { data: media, error: fetchError } = await adminClient
      .from('media')
      .select('id, wedding_id, original_url, thumbnail_url, guest_identifier')
      .eq('id', mediaId)
      .single();

    if (fetchError || !media) {
      if (fetchError?.code === 'PGRST116') {
        return apiResponse.error(
          'Not found',
          'Media record not found',
          404
        );
      }
      console.error('[API] Error fetching media for deletion:', fetchError);
      return apiResponse.error(
        'Database error',
        'Failed to fetch media record',
        500
      );
    }

    // Get the wedding owner for authorization check
    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .select('owner_id')
      .eq('id', media.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return apiResponse.error(
        'Not found',
        'Wedding not found',
        404
      );
    }

    // Authorization check
    const authResult = await validateDeleteAuthorization(
      request,
      wedding.owner_id,
      media.guest_identifier,
      media.wedding_id,
      adminClient
    );

    if (!authResult.authorized) {
      return apiResponse.error(
        'Unauthorized',
        authResult.error || 'Not authorized',
        403
      );
    }

    // Step 1: Delete R2 objects (best-effort, don't fail if R2 cleanup fails)
    const r2Errors = await deleteR2MediaFiles(
      media.original_url,
      media.thumbnail_url
    );

    if (r2Errors.length > 0) {
      console.warn('[API] R2 deletion errors (non-blocking):', {
        mediaId,
        errors: r2Errors,
      });
    }

    // Step 2: Delete the database record (always do this, even if R2 failed)
    const { error: deleteError } = await adminClient
      .from('media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      console.error('[API] Error deleting media record:', deleteError);
      return apiResponse.error(
        'Database error',
        'Failed to delete media record',
        500
      );
    }

    return apiResponse.success({
      success: true,
      message: 'Media deleted successfully',
      ...(r2Errors.length > 0 && { r2Errors }),
    });
  } catch (error) {
    console.error('[API] Media delete error:', error);
    return apiResponse.error(
      'Internal server error',
      'An unexpected error occurred',
      500
    );
  }
};
