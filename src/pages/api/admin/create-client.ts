import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';

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
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database not configured',
        message: 'Supabase is not configured. Please set environment variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database admin not configured',
        message: 'SUPABASE_SERVICE_ROLE_KEY is required for client creation.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
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

    const adminClient = getSupabaseAdminClient();

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
      return new Response(
        JSON.stringify({
          error: 'Failed to create user',
          message: authResult.error?.message || 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = authResult.data.user.id;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 2);

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          full_name: couple_names,
          subscription_status: 'trial',
          subscription_end_date: expiresAt.toISOString(),
          stripe_customer_id: null,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          error: 'Profile creation failed',
          message: profileError?.message || 'Unknown error',
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
      return new Response(
        JSON.stringify({
          error: 'Wedding creation failed',
          message: weddingError?.message || 'Unknown error',
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
      subscription_expires_at: expiresAt.toISOString(),
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_login_at: null,
      photo_count: 0,
      video_count: 0,
      message_count: 0,
      storage_used_mb: 0,
    };

    return new Response(
      JSON.stringify({ client }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API] Create client error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
