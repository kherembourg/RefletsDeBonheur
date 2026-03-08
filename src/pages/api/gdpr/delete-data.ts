/**
 * API Endpoint: GDPR Data Deletion (Right to Erasure)
 *
 * POST /api/gdpr/delete-data
 *
 * Allows an authenticated wedding owner to delete all data associated with
 * their wedding: media files (R2 + DB), guestbook messages, RSVPs, guest
 * sessions, and the wedding record itself.
 *
 * This is a destructive, irreversible operation.
 *
 * Request body:
 * {
 *   weddingId: string,
 *   confirmation: "DELETE_ALL_DATA"
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   deleted: { media: number, guestbookMessages: number, rsvps: number, guestSessions: number, wedding: boolean }
 * }
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { validateBody } from '../../../lib/api/validation';
import { getSupabaseAdminClient, verifyServerSession, verifyWeddingOwnership } from '../../../lib/supabase/server';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { deleteR2MediaFiles } from '../../../lib/r2/deleteMedia';

export const prerender = false;

const deleteSchema = z.object({
  weddingId: z.string().uuid('Invalid wedding ID'),
  confirmation: z.literal('DELETE_ALL_DATA', {
    errorMap: () => ({ message: 'You must pass confirmation: "DELETE_ALL_DATA" to proceed.' }),
  }),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  // Rate limit
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.general);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // Require Supabase
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  try {
    // Authenticate
    const session = await verifyServerSession(cookies);
    if (!session) {
      return apiResponse.error('Unauthorized', 'You must be logged in to delete data.', 401);
    }

    const body = await request.json();
    const validation = validateBody(deleteSchema, body);
    if ('error' in validation) return validation.error;

    const { weddingId } = validation.data;

    // Verify ownership
    const isOwner = await verifyWeddingOwnership(session.userId, weddingId);
    if (!isOwner) {
      return apiResponse.error('Forbidden', 'You are not the owner of this wedding.', 403);
    }

    const admin = getSupabaseAdminClient();

    // Delete in order: child records first, then the wedding itself.
    // Each step checks for errors and aborts early on critical failures.
    // R2 cleanup is best-effort — failures are logged but don't block DB deletion.

    // 1. Fetch media records (URLs needed for R2 cleanup) then delete them
    const { data: mediaRecords, error: mediaFetchError } = await admin
      .from('media')
      .select('id, original_url, thumbnail_url')
      .eq('wedding_id', weddingId);

    if (mediaFetchError) {
      console.error('[API] Error fetching media records:', mediaFetchError);
      return apiResponse.error(
        'Deletion failed',
        'Could not fetch media records. No data was deleted.',
        500
      );
    }

    // Best-effort R2 cleanup — fire all deletions in parallel, don't await before DB work
    const r2CleanupPromise = Promise.allSettled(
      (mediaRecords ?? []).map((record) =>
        deleteR2MediaFiles(record.original_url, record.thumbnail_url)
      )
    ).then((results) => {
      const r2Errors = results
        .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
        .flatMap((r) => r.value)
        .concat(
          results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r) => String(r.reason))
        );
      if (r2Errors.length > 0) {
        console.warn('[API] R2 cleanup errors (best-effort):', r2Errors);
      }
    });

    // Now delete media DB records
    const { data: deletedMedia, error: mediaDeleteError } = await admin
      .from('media')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

    if (mediaDeleteError) {
      console.error('[API] Error deleting media records:', mediaDeleteError);
      return apiResponse.error(
        'Deletion failed',
        'Could not delete media records. Some data may remain.',
        500
      );
    }

    // 2. Delete guestbook messages
    const { data: deletedMessages, error: messagesDeleteError } = await admin
      .from('guestbook_messages')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

    if (messagesDeleteError) {
      console.error('[API] Error deleting guestbook messages:', messagesDeleteError);
      return apiResponse.error(
        'Partial deletion',
        'Media was deleted but guestbook messages could not be removed. Contact support.',
        500
      );
    }

    // 3. Delete RSVPs
    const { data: deletedRsvps, error: rsvpsDeleteError } = await admin
      .from('rsvps')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

    if (rsvpsDeleteError) {
      console.error('[API] Error deleting RSVPs:', rsvpsDeleteError);
      return apiResponse.error(
        'Partial deletion',
        'Some child records were deleted but RSVPs could not be removed. Contact support.',
        500
      );
    }

    // 4. Delete guest sessions
    const { data: deletedSessions, error: sessionsDeleteError } = await admin
      .from('guest_sessions')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

    if (sessionsDeleteError) {
      console.error('[API] Error deleting guest sessions:', sessionsDeleteError);
      return apiResponse.error(
        'Partial deletion',
        'Some child records were deleted but guest sessions could not be removed. Contact support.',
        500
      );
    }

    // 5. Delete the wedding record
    const { error: weddingDeleteError } = await admin
      .from('weddings')
      .delete()
      .eq('id', weddingId);

    if (weddingDeleteError) {
      console.error('[API] Error deleting wedding record:', weddingDeleteError);
      return apiResponse.error(
        'Partial deletion',
        'Child records were deleted but the wedding record could not be removed. Contact support.',
        500
      );
    }

    // Wait for R2 cleanup to finish (best-effort, don't fail if it errors)
    await r2CleanupPromise;

    return apiResponse.success({
      success: true,
      deleted: {
        media: deletedMedia?.length ?? 0,
        guestbookMessages: deletedMessages?.length ?? 0,
        rsvps: deletedRsvps?.length ?? 0,
        guestSessions: deletedSessions?.length ?? 0,
        wedding: true,
      },
    });
  } catch (error) {
    console.error('[API] GDPR delete-data error:', error);
    return apiResponse.error('Internal server error', 'An unexpected error occurred.', 500);
  }
};
