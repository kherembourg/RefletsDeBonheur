import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';

export const prerender = false;

const GOD_ACCESS_TOKEN_DURATION_HOURS = 24;

function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { godAdminId, clientId, sessionToken } = body;

    if (!godAdminId || !clientId) {
      return new Response(
        JSON.stringify({ error: 'godAdminId and clientId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Verify the god admin session is valid
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Session token required for authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the session is valid for this god admin
    const { data: session, error: sessionError } = await adminClient
      .from('auth_sessions')
      .select('user_id, user_type, expires_at')
      .eq('token', sessionToken)
      .eq('user_id', godAdminId)
      .eq('user_type', 'god')
      .is('revoked_at', null)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the god admin exists in the god_admins table
    const { data: godAdmin, error: godError } = await adminClient
      .from('god_admins')
      .select('id')
      .eq('id', godAdminId)
      .single();

    if (godError || !godAdmin) {
      return new Response(
        JSON.stringify({ error: 'God admin not found' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the wedding for this client
    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .select('id')
      .eq('owner_id', clientId)
      .single();

    if (weddingError || !wedding) {
      return new Response(
        JSON.stringify({ error: 'Wedding not found for this client' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate token and expiration
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + GOD_ACCESS_TOKEN_DURATION_HOURS);

    // Insert the access token
    const { error: insertError } = await adminClient
      .from('god_access_tokens')
      .insert({
        god_admin_id: godAdminId,
        wedding_id: wedding.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('[API] Create token error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create access token', message: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log the audit event
    await adminClient.from('audit_log').insert({
      action: 'impersonation_token_created',
      actor_type: 'god',
      actor_id: godAdminId,
      details: { wedding_id: wedding.id },
    });

    return new Response(
      JSON.stringify({ success: true, token }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Create token error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
