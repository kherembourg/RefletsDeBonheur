import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  try {
    const body = await request.json();
    const { code, guestName } = body;

    if (!code || typeof code !== 'string') {
      return apiResponse.error('Missing code', 'Access code is required.', 400, 'code');
    }

    const upperCode = code.toUpperCase().trim();
    const adminClient = getSupabaseAdminClient();

    // Find wedding by PIN or magic token
    const { data: weddings, error: fetchError } = await adminClient
      .from('weddings')
      .select('id, owner_id, slug, pin_code, magic_token')
      .or(`pin_code.eq.${upperCode},magic_token.eq.${upperCode}`);

    if (fetchError || !weddings || weddings.length === 0) {
      return apiResponse.error('Invalid code', 'Invalid access code.', 401);
    }

    const wedding = weddings[0];
    const isAdminCode = wedding.magic_token === upperCode;

    // Verify owner subscription is active
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('subscription_status')
      .eq('id', wedding.owner_id)
      .single();

    if (profileError || !profile) {
      return apiResponse.error('Profile not found', 'Wedding owner profile not found.', 404);
    }

    if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trial') {
      return apiResponse.error('Unavailable', 'This wedding space is not available.', 403);
    }

    // Generate session token
    const tokenBytes = new Uint8Array(64);
    crypto.getRandomValues(tokenBytes);
    const sessionToken = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create guest session (service-role bypasses RLS)
    const { error: sessionError } = await adminClient
      .from('guest_sessions')
      .insert({
        wedding_id: wedding.id,
        session_token: sessionToken,
        guest_identifier: sessionToken,
        guest_name: guestName || null,
        auth_method: isAdminCode ? 'magic_token' : 'pin',
        expires_at: expiresAt.toISOString(),
        last_active_at: new Date().toISOString(),
      });

    if (sessionError) {
      console.error('[API] Failed to create guest session:', sessionError);
      return apiResponse.error('Session error', 'Failed to create session.', 500);
    }

    return apiResponse.success({
      session_token: sessionToken,
      wedding_id: wedding.id,
      wedding_slug: wedding.slug,
      access_type: isAdminCode ? 'admin' : 'guest',
      guest_name: guestName || null,
    });
  } catch (error) {
    console.error('[API] Guest login error:', error);
    return apiResponse.error(
      'Internal error',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
};
