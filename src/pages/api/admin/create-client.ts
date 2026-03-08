import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';

export const prerender = false;

function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.api);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  try {
    const adminClient = getSupabaseAdminClient();

    // Verify god admin session
    const sessionToken = request.headers.get('X-God-Session-Token');
    if (!sessionToken) {
      return apiResponse.error('Unauthorized', 'God admin session token required', 401);
    }

    const { data: session, error: sessionError } = await adminClient
      .from('auth_sessions')
      .select('user_id, user_type, expires_at')
      .eq('token', sessionToken)
      .eq('user_type', 'god')
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return apiResponse.error('Unauthorized', 'Invalid or expired god admin session', 401);
    }

    const { data: godAdmin, error: godError } = await adminClient
      .from('god_admins')
      .select('id')
      .eq('id', session.user_id)
      .single();

    if (godError || !godAdmin) {
      return apiResponse.error('Forbidden', 'God admin not found', 403);
    }

    const body = await request.json();
    const { wedding_name, couple_names, wedding_date, wedding_slug, username, password, email } = body;

    if (!wedding_name || !couple_names || !wedding_slug || !password || !email) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'wedding_name, couple_names, wedding_slug, email, and password are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const authResult = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: couple_names,
        username: username || email,
      },
    });

    if (authResult.error || !authResult.data.user) {
      console.error('[API] Failed to create auth user:', authResult.error);
      return new Response(
        JSON.stringify({
          error: 'Failed to create user',
          message: 'An unexpected error occurred.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = authResult.data.user.id;
    // Set trial period to 31 days
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 31);

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          full_name: couple_names,
          subscription_status: 'trial',
          subscription_end_date: trialEndDate.toISOString(),
          stripe_customer_id: null,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileError || !profile) {
      console.error('[API] Profile creation failed:', profileError);
      return new Response(
        JSON.stringify({
          error: 'Profile creation failed',
          message: 'An unexpected error occurred.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const [brideName, groomName] = couple_names.split(' & ').map((name: string) => name.trim());
    const guestCode = generateShortCode();

    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .insert({
        owner_id: userId,
        slug: wedding_slug,
        pin_code: guestCode,
        name: wedding_name,
        bride_name: brideName || '',
        groom_name: groomName || '',
        wedding_date: wedding_date || null,
        venue_name: null,
        venue_address: null,
        venue_lat: null,
        venue_lng: null,
        venue_map_url: null,
        config: {
          theme: {
            name: 'classic',
            primaryColor: '#ae1725',
            secondaryColor: '#c92a38',
            fontFamily: 'playfair',
          },
          features: {
            gallery: true,
            guestbook: true,
            rsvp: true,
            liveWall: false,
            geoFencing: false,
          },
          moderation: {
            enabled: true,
            autoApprove: true,
          },
          timeline: [],
        },
        hero_image_url: null,
        is_published: true,
      })
      .select()
      .single();

    if (weddingError || !wedding) {
      console.error('[API] Wedding creation failed:', weddingError);
      return new Response(
        JSON.stringify({
          error: 'Wedding creation failed',
          message: 'An unexpected error occurred.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const client = {
      id: userId,
      wedding_name,
      couple_names,
      wedding_date: wedding_date || null,
      wedding_slug,
      username: username || email,
      email,
      guest_code: guestCode,
      admin_code: wedding.magic_token,
      allow_uploads: true,
      allow_guestbook: true,
      theme: 'classic',
      custom_domain: null,
      status: 'trial',
      subscription_started_at: new Date().toISOString(),
      subscription_expires_at: trialEndDate.toISOString(),
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_login_at: null,
      photo_count: 0,
      video_count: 0,
      message_count: 0,
      storage_used_mb: 0,
    };

    return apiResponse.success({ client });
  } catch (error) {
    console.error('[API] Create client error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
