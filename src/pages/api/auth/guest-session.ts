import type { APIRoute } from 'astro';
import {
  GUEST_SESSION_COOKIE,
  clearSessionCookie,
  getCookieValueFromRequest,
  getSupabaseAdminClient,
  verifyGuestSessionToken,
} from '../../../lib/supabase/server';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const token = getCookieValueFromRequest(request, GUEST_SESSION_COOKIE);
  if (!token) {
    return apiResponse.error('Unauthorized', 'No active guest session.', 401);
  }

  const session = await verifyGuestSessionToken(token);
  if (!session) {
    const response = apiResponse.error('Unauthorized', 'Invalid or expired guest session.', 401);
    response.headers.append('Set-Cookie', clearSessionCookie(request, GUEST_SESSION_COOKIE));
    return response;
  }

  try {
    const adminClient = getSupabaseAdminClient();
    const { data: guestSession, error: guestSessionError } = await adminClient
      .from('guest_sessions')
      .select('guest_name, auth_method')
      .eq('id', session.id)
      .single();

    if (guestSessionError || !guestSession) {
      return apiResponse.error('Unauthorized', 'Guest session not found.', 401);
    }

    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .select('slug')
      .eq('id', session.weddingId)
      .single();

    if (weddingError || !wedding) {
      return apiResponse.error('Wedding not found', 'Wedding not found.', 404);
    }

    await adminClient
      .from('guest_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', session.id);

    return apiResponse.success({
      valid: true,
      session: {
        client_id: session.weddingId,
        wedding_slug: wedding.slug,
        access_type: guestSession.auth_method === 'magic_token' ? 'admin' : 'guest',
        guest_name: guestSession.guest_name || undefined,
      },
    });
  } catch (error) {
    console.error('[API] Guest session lookup error:', error);
    return apiResponse.error('Internal error', 'An unexpected error occurred.', 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const response = apiResponse.success({ success: true });

  try {
    const token = getCookieValueFromRequest(request, GUEST_SESSION_COOKIE);
    if (token && apiGuards.requireServiceRole() === null) {
      const adminClient = getSupabaseAdminClient();
      await adminClient
        .from('guest_sessions')
        .delete()
        .eq('session_token', token);
    }
  } catch (error) {
    console.error('[API] Guest logout error:', error);
  }

  response.headers.append('Set-Cookie', clearSessionCookie(request, GUEST_SESSION_COOKIE));
  return response;
};
