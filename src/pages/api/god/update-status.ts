import type { APIRoute } from 'astro';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { clientId, status, godAdminId, sessionToken } = body;

    if (!clientId || !status) {
      return new Response(
        JSON.stringify({ error: 'clientId and status are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['active', 'expired', 'trial'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be active, expired, or trial' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Verify the god admin session is valid
    if (!godAdminId || !sessionToken) {
      return new Response(
        JSON.stringify({ error: 'God admin authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the session is valid for this god admin
    const { data: session, error: sessionError } = await adminClient
      .from('auth_sessions')
      .select('user_id, user_type, expires_at')
      .eq('session_token', sessionToken)
      .eq('user_id', godAdminId)
      .eq('user_type', 'god')
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

    // Verify the god admin exists
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

    // Update the profile subscription status
    const { error } = await adminClient
      .from('profiles')
      .update({
        subscription_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (error) {
      console.error('[API] Update status error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update status', message: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log the audit event
    await adminClient.from('audit_log').insert({
      action: 'client_status_changed',
      actor_type: 'god',
      actor_id: godAdminId,
      details: { client_id: clientId, new_status: status },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Update status error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
