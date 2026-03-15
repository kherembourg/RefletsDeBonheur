import type { APIRoute } from 'astro';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase/client';
import {
  AUTH_SESSION_COOKIE,
  clearSessionCookie,
  createSessionCookie,
  getCookieValueFromRequest,
  getSupabaseAdminClient,
  verifyAppSessionToken,
} from '../../../lib/supabase/server';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';

export const prerender = false;

const CLIENT_SESSION_HOURS = 24 * 7;
const REFRESH_TOKEN_DAYS = 30;

const bodySchema = z.object({
  username: z.string().email(),
});

function generateToken(length: number = 64): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function profileToSession(profileId: string, wedding: { name: string | null; bride_name: string; groom_name: string; slug: string }) {
  const coupleNames = `${wedding.bride_name} & ${wedding.groom_name}`.trim();
  const weddingName = (wedding.name || `Mariage de ${coupleNames}`.trim()).trim();

  return {
    client_id: profileId,
    wedding_name: weddingName,
    couple_names: coupleNames,
    wedding_slug: wedding.slug,
    is_admin: true,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return apiResponse.error('Unauthorized', 'Supabase access token required.', 401);
  }

  const accessToken = authHeader.slice(7);

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse.error('Validation error', 'Invalid session bootstrap payload.', 400);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return apiResponse.error('Unauthorized', 'Invalid Supabase session.', 401);
    }

    const userId = authData.user.id;
    const adminClient = getSupabaseAdminClient();

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, subscription_status, subscription_end_date')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return apiResponse.error('Profile not found', 'Profile not found.', 404);
    }

    if (profile.email !== parsed.data.username) {
      return apiResponse.error('Unauthorized', 'Session bootstrap payload does not match authenticated user.', 403);
    }

    if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trial') {
      return apiResponse.error('Forbidden', 'Account is suspended or expired.', 403);
    }

    if (profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date()) {
      await adminClient
        .from('profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', userId);
      return apiResponse.error('Forbidden', 'Subscription has expired.', 403);
    }

    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .select('name, bride_name, groom_name, slug')
      .eq('owner_id', userId)
      .single();

    if (weddingError || !wedding) {
      return apiResponse.error('Wedding not found', 'Wedding not found.', 404);
    }

    const token = generateToken();
    const refreshToken = generateToken();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + CLIENT_SESSION_HOURS);
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_DAYS);

    const { error: sessionError } = await adminClient
      .from('auth_sessions')
      .insert({
        user_id: userId,
        user_type: 'client',
        token,
        refresh_token: refreshToken,
        expires_at: tokenExpiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('[API] Failed to create client app session:', sessionError);
      return apiResponse.error('Session error', 'Failed to create session.', 500);
    }

    await adminClient.from('audit_log').insert({
      action: 'client_login_success',
      actor_type: 'client',
      actor_id: userId,
      details: { username: parsed.data.username },
    });

    const response = apiResponse.success({
      success: true,
      session: profileToSession(userId, wedding),
    });

    response.headers.append(
      'Set-Cookie',
      createSessionCookie(request, AUTH_SESSION_COOKIE, token, CLIENT_SESSION_HOURS * 60 * 60)
    );

    return response;
  } catch (error) {
    console.error('[API] Client session bootstrap error:', error);
    return apiResponse.error('Internal error', 'An unexpected error occurred.', 500);
  }
};

export const GET: APIRoute = async ({ request }) => {
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const token = getCookieValueFromRequest(request, AUTH_SESSION_COOKIE);
  if (!token) {
    return apiResponse.error('Unauthorized', 'No active client session.', 401);
  }

  const session = await verifyAppSessionToken(token, 'client');
  if (!session) {
    const response = apiResponse.error('Unauthorized', 'Invalid or expired session.', 401);
    response.headers.append('Set-Cookie', clearSessionCookie(request, AUTH_SESSION_COOKIE));
    return response;
  }

  try {
    const adminClient = getSupabaseAdminClient();
    const { data: wedding, error } = await adminClient
      .from('weddings')
      .select('name, bride_name, groom_name, slug')
      .eq('owner_id', session.userId)
      .single();

    if (error || !wedding) {
      return apiResponse.error('Wedding not found', 'Wedding not found.', 404);
    }

    await adminClient
      .from('auth_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', session.sessionId);

    return apiResponse.success({
      valid: true,
      session: profileToSession(session.userId, wedding),
    });
  } catch (error) {
    console.error('[API] Client session lookup error:', error);
    return apiResponse.error('Internal error', 'An unexpected error occurred.', 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const response = apiResponse.success({ success: true });

  try {
    const token = getCookieValueFromRequest(request, AUTH_SESSION_COOKIE);
    if (token && apiGuards.requireServiceRole() === null) {
      const adminClient = getSupabaseAdminClient();
      await adminClient
        .from('auth_sessions')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: 'logout',
        })
        .eq('token', token)
        .eq('user_type', 'client');
    }
  } catch (error) {
    console.error('[API] Client logout error:', error);
  }

  response.headers.append('Set-Cookie', clearSessionCookie(request, AUTH_SESSION_COOKIE));
  return response;
};
