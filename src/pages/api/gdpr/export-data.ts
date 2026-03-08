/**
 * API Endpoint: GDPR Data Export (Right of Access)
 *
 * POST /api/gdpr/export-data
 *
 * Allows an authenticated wedding owner to export all data associated with
 * their wedding: wedding config, media records, guestbook messages, RSVPs,
 * and guest sessions (without secrets).
 *
 * Request body:
 * {
 *   weddingId: string
 * }
 *
 * Response: JSON object with all associated data.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { validateBody } from '../../../lib/api/validation';
import { getSupabaseAdminClient, verifyServerSession, verifyWeddingOwnership } from '../../../lib/supabase/server';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';

export const prerender = false;

const exportSchema = z.object({
  weddingId: z.string().uuid('Invalid wedding ID'),
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
      return apiResponse.error('Unauthorized', 'You must be logged in to export data.', 401);
    }

    const body = await request.json();
    const validation = validateBody(exportSchema, body);
    if ('error' in validation) return validation.error;

    const { weddingId } = validation.data;

    // Verify ownership
    const isOwner = await verifyWeddingOwnership(session.userId, weddingId);
    if (!isOwner) {
      return apiResponse.error('Forbidden', 'You are not the owner of this wedding.', 403);
    }

    const admin = getSupabaseAdminClient();

    // Fetch all related data in parallel
    const [weddingRes, mediaRes, guestbookRes, rsvpRes] = await Promise.all([
      admin.from('weddings').select('id, slug, name, date, config, created_at, updated_at').eq('id', weddingId).single(),
      admin.from('media').select('id, type, status, moderation_status, metadata, guest_identifier, created_at').eq('wedding_id', weddingId),
      admin.from('guestbook_messages').select('id, author_name, message, relation, created_at').eq('wedding_id', weddingId),
      admin.from('rsvps').select('id, name, email, attendance, plus_one, plus_one_name, dietary_restrictions, message, created_at').eq('wedding_id', weddingId),
    ]);

    return apiResponse.success({
      exportedAt: new Date().toISOString(),
      wedding: weddingRes.data ?? null,
      media: mediaRes.data ?? [],
      guestbookMessages: guestbookRes.data ?? [],
      rsvps: rsvpRes.data ?? [],
    });
  } catch (error) {
    console.error('[API] GDPR export-data error:', error);
    return apiResponse.error('Internal server error', 'An unexpected error occurred.', 500);
  }
};
