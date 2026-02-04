import type { APIRoute } from 'astro';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Database not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Find the access token
    const { data: accessToken, error: tokenError } = await adminClient
      .from('god_access_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !accessToken) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired access token' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (accessToken.used_count >= accessToken.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Access token has been used' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the wedding
    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .select('*')
      .eq('id', accessToken.wedding_id)
      .single();

    if (weddingError || !wedding) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Wedding not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', wedding.owner_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Profile not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the token usage
    await adminClient
      .from('god_access_tokens')
      .update({
        used_at: new Date().toISOString(),
        used_count: accessToken.used_count + 1,
      })
      .eq('id', accessToken.id);

    // Log the audit event
    await adminClient.from('audit_log').insert({
      action: 'impersonation_token_used',
      actor_type: 'god',
      actor_id: accessToken.god_admin_id,
      details: { wedding_id: wedding.id },
    });

    // Build the client object
    const coupleNames = `${wedding.bride_name} & ${wedding.groom_name}`.trim();
    const weddingName = (wedding.name || `Mariage de ${coupleNames}`.trim()).trim();

    const client = {
      id: wedding.owner_id,
      wedding_name: weddingName,
      couple_names: coupleNames,
      wedding_date: wedding.wedding_date,
      wedding_slug: wedding.slug,
      username: profile.email,
      email: profile.email,
      guest_code: wedding.pin_code || '',
      admin_code: wedding.magic_token,
      allow_uploads: wedding.config?.features?.gallery ?? true,
      allow_guestbook: wedding.config?.features?.guestbook ?? true,
      theme: wedding.config?.theme?.name ?? 'classic',
      custom_domain: null,
      status: profile.subscription_status === 'active' || profile.subscription_status === 'trial'
        ? profile.subscription_status
        : 'expired',
      subscription_started_at: profile.created_at,
      subscription_expires_at: profile.subscription_end_date,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_login_at: null,
      photo_count: 0,
      video_count: 0,
      message_count: 0,
      storage_used_mb: 0,
    };

    return new Response(
      JSON.stringify({ valid: true, client }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Verify token error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
