import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../lib/supabase/server';
import { isSupabaseConfigured, supabase } from '../../lib/supabase/client';
import type { ThemeId } from '../../lib/themes';

export const prerender = false;

// Generate a random guest code (6 uppercase chars/numbers, excluding confusing ones)
function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Reserved slugs that cannot be used
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'demo', 'demo_gallery', 'demo_livre-or', 'demo_rsvp', 'demo_website',
  'connexion', 'pricing', 'tarification', 'precios', 'offline', 'fr', 'es', 'account',
  'god', 'test', 'signup', 'inscription', 'registro', 'guestbook', 'gallery', 'photos',
  'rsvp', 'infos', 'livre-or', 'mentions-legales', 'cgv', 'politique-confidentialite',
]);

// Validate slug format
function isValidSlugFormat(slug: string): boolean {
  if (slug.length < 3 || slug.length > 50) return false;
  const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/;
  return slugPattern.test(slug);
}

interface SignupRequest {
  email: string;
  password: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date?: string;
  slug: string;
  theme_id: ThemeId;
}

export const POST: APIRoute = async ({ request }) => {
  // Check Supabase configuration
  if (!isSupabaseConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database not configured',
        message: 'Supabase is not configured. Please set environment variables.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database admin not configured',
        message: 'Service role key is required for signup.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: SignupRequest = await request.json();
    const { email, password, partner1_name, partner2_name, wedding_date, slug, theme_id } = body;

    // Validate required fields
    if (!email || !password || !partner1_name || !partner2_name || !slug || !theme_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'Email, password, partner names, slug, and theme are required.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email',
          field: 'email',
          message: 'Please enter a valid email address.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          error: 'Password too short',
          field: 'password',
          message: 'Password must be at least 8 characters.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate slug
    const normalizedSlug = slug.toLowerCase().trim();
    if (!isValidSlugFormat(normalizedSlug)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid slug format',
          field: 'slug',
          message: 'URL must be 3-50 characters, lowercase letters, numbers, and hyphens only.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (RESERVED_SLUGS.has(normalizedSlug)) {
      return new Response(
        JSON.stringify({
          error: 'Slug reserved',
          field: 'slug',
          message: 'This URL is reserved and cannot be used.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Check if slug is already taken
    const { data: existingWedding } = await adminClient
      .from('weddings')
      .select('slug')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (existingWedding) {
      return new Response(
        JSON.stringify({
          error: 'Slug taken',
          field: 'slug',
          message: 'This URL is already in use. Please choose another.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create user in Supabase Auth
    const coupleNames = `${partner1_name.trim()} & ${partner2_name.trim()}`;
    const weddingName = `${partner1_name.trim()} & ${partner2_name.trim()}'s Wedding`;

    const authResult = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: coupleNames,
      },
    });

    if (authResult.error || !authResult.data.user) {
      // Check for duplicate email
      if (authResult.error?.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({
            error: 'Email exists',
            field: 'email',
            message: 'An account with this email already exists. Please sign in instead.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to create account',
          message: authResult.error?.message || 'Unknown error occurred.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.data.user.id;

    // Set trial period to 31 days
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 31);

    // Create profile with trial status
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          full_name: coupleNames,
          subscription_status: 'trial',
          subscription_end_date: trialEndDate.toISOString(),
          stripe_customer_id: null,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      // Cleanup: delete the auth user since profile creation failed
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          error: 'Profile creation failed',
          message: profileError.message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create wedding
    const guestCode = generateShortCode();

    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .insert({
        owner_id: userId,
        slug: normalizedSlug,
        pin_code: guestCode,
        name: weddingName,
        bride_name: partner1_name.trim(),
        groom_name: partner2_name.trim(),
        wedding_date: wedding_date || null,
        venue_name: null,
        venue_address: null,
        venue_lat: null,
        venue_lng: null,
        venue_map_url: null,
        config: {
          theme: {
            name: theme_id,
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
      // Cleanup: delete profile and auth user
      await adminClient.from('profiles').delete().eq('id', userId);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          error: 'Wedding creation failed',
          message: weddingError?.message || 'Unknown error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sign in the user to create a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      // Account created successfully but auto-login failed
      // Return success but indicate manual login needed
      return new Response(
        JSON.stringify({
          success: true,
          slug: normalizedSlug,
          redirect: `/${normalizedSlug}/admin`,
          needsLogin: true,
          message: 'Account created! Please sign in to continue.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return success with session info
    return new Response(
      JSON.stringify({
        success: true,
        slug: normalizedSlug,
        redirect: `/${normalizedSlug}/admin`,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at,
        },
        user: {
          id: userId,
          email,
          wedding_id: wedding.id,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Signup error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
