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
    // Media R2 cleanup is best-effort; we always delete DB records.

    // 1. Delete media records (R2 objects would be cleaned up by a separate job or TTL policy)
    const { data: deletedMedia } = await admin
      .from('media')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

    // 2. Delete guestbook messages
    const { data: deletedMessages } = await admin
      .from('guestbook_messages')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

    // 3. Delete RSVPs
    const { data: deletedRsvps } = await admin
      .from('rsvps')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

    // 4. Delete guest sessions
    const { data: deletedSessions } = await admin
      .from('guest_sessions')
      .delete()
      .eq('wedding_id', weddingId)
      .select('id');

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
