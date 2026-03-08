import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { validateBody } from '../../../lib/api/validation';

const bodySchema = z.object({
  code: z.string().min(1),
  guestName: z.string().optional(),
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  try {
    const body = await request.json();
    const validation = validateBody(bodySchema, body);
    if ('error' in validation) return validation.error;
    const { code, guestName } = validation.data;

    const upperCode = code.toUpperCase().trim();

    // Validate code format: alphanumeric only (prevents PostgREST filter injection)
    if (!/^[A-Z0-9]+$/.test(upperCode)) {
      return apiResponse.error('Invalid code', 'Invalid access code format.', 400);
    }

    const adminClient = getSupabaseAdminClient();

    // Find wedding by PIN or magic token using separate parameterized queries
    // (avoids .or() string interpolation which is vulnerable to PostgREST filter injection)
    let wedding = null;
    let isAdminCode = false;

    const { data: byPin } = await adminClient
      .from('weddings')
      .select('id, owner_id, slug, pin_code, magic_token')
      .eq('pin_code', upperCode)
      .limit(1)
      .maybeSingle();

    if (byPin) {
      wedding = byPin;
      isAdminCode = byPin.magic_token === upperCode;
    } else {
      const { data: byToken } = await adminClient
        .from('weddings')
        .select('id, owner_id, slug, pin_code, magic_token')
        .eq('magic_token', upperCode)
        .limit(1)
        .maybeSingle();

      if (byToken) {
        wedding = byToken;
        isAdminCode = true;
      }
    }

    if (!wedding) {
      return apiResponse.error('Invalid code', 'Invalid access code.', 401);
    }

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
      'An unexpected error occurred.',
      500
    );
  }
};
