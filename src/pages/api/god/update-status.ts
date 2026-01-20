import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';

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
    const { clientId, status } = body;

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
