import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase/client';
import { getStripeClient, isStripeConfigured } from '../../../lib/stripe/server';

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

interface VerifyPaymentRequest {
  session_id: string;
}

export const POST: APIRoute = async ({ request }) => {
  // Check configuration
  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Database not configured',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isStripeConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Payment system not configured',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: VerifyPaymentRequest = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing session ID',
          message: 'Stripe session ID is required.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripeClient();
    const adminClient = getSupabaseAdminClient();

    // Retrieve and verify Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          error: 'Payment not completed',
          message: 'Payment has not been completed yet.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get pending signup by stripe_session_id
    const { data: pendingSignup, error: fetchError } = await adminClient
      .from('pending_signups')
      .select('*')
      .eq('stripe_session_id', session_id)
      .single();

    if (fetchError || !pendingSignup) {
      console.error('[API] Pending signup not found:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Signup data not found',
          message: 'Unable to find your signup information. Please contact support.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already completed (idempotency)
    if (pendingSignup.completed_at) {
      // Account already created - just return success
      // User will need to sign in manually if they refreshed the page
      return new Response(
        JSON.stringify({
          success: true,
          slug: pendingSignup.slug,
          redirect: `/${pendingSignup.slug}/admin`,
          alreadyCompleted: true,
          message: 'Your account has already been created. Please sign in.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Re-validate slug availability (race condition check)
    const { data: existingWedding } = await adminClient
      .from('weddings')
      .select('slug')
      .eq('slug', pendingSignup.slug)
      .maybeSingle();

    if (existingWedding) {
      return new Response(
        JSON.stringify({
          error: 'Slug taken after payment',
          field: 'slug',
          message: 'This URL was just taken by someone else. Please contact support to choose a different URL.',
          code: 'SLUG_CONFLICT_POST_PAYMENT',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create account (same logic as /api/signup.ts)
    const coupleNames = `${pendingSignup.partner1_name} & ${pendingSignup.partner2_name}`;
    const weddingName = `${pendingSignup.partner1_name} & ${pendingSignup.partner2_name}'s Wedding`;

    // Create user in Supabase Auth using the password from pending_signups
    const authResult = await adminClient.auth.admin.createUser({
      email: pendingSignup.email,
      password: pendingSignup.password_hash, // This is actually the plain password, not a hash
      email_confirm: true,
      user_metadata: {
        full_name: coupleNames,
      },
    });

    if (authResult.error || !authResult.data.user) {
      console.error('[API] Auth user creation failed:', authResult.error);

      // Check for duplicate email
      if (authResult.error?.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({
            error: 'Account error',
            field: 'email',
            code: 'ACCOUNT_EXISTS_OR_ERROR',
            message: 'An account with this email already exists. Please contact support.',
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

    // Set subscription to active for 2 years (paid account, not trial)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 2);

    // Get Stripe customer ID from session
    const customerId = session.customer as string;

    // Create profile with active subscription status
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: pendingSignup.email,
          full_name: coupleNames,
          subscription_status: 'active', // Paid account, not trial!
          subscription_end_date: subscriptionEndDate.toISOString(),
          stripe_customer_id: customerId || null,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('[API] Profile creation failed:', profileError);
      // Cleanup: delete the auth user
      let cleanupSuccess = false;
      for (let attempt = 0; attempt < 3 && !cleanupSuccess; attempt++) {
        try {
          await adminClient.auth.admin.deleteUser(userId);
          cleanupSuccess = true;
        } catch (cleanupError) {
          console.error(`[CRITICAL] Cleanup attempt ${attempt + 1} failed for user ${userId}:`, cleanupError);
          if (attempt < 2) await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        }
      }
      return new Response(
        JSON.stringify({
          error: 'Profile creation failed',
          message: 'Account creation failed. Please try again or contact support.',
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
        slug: pendingSignup.slug,
        pin_code: guestCode,
        name: weddingName,
        bride_name: pendingSignup.partner1_name,
        groom_name: pendingSignup.partner2_name,
        wedding_date: pendingSignup.wedding_date || null,
        venue_name: null,
        venue_address: null,
        venue_lat: null,
        venue_lng: null,
        venue_map_url: null,
        config: {
          theme: {
            name: pendingSignup.theme_id,
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
      // Cleanup: delete profile and auth user
      let cleanupSuccess = false;
      for (let attempt = 0; attempt < 3 && !cleanupSuccess; attempt++) {
        try {
          await adminClient.from('profiles').delete().eq('id', userId);
          await adminClient.auth.admin.deleteUser(userId);
          cleanupSuccess = true;
        } catch (cleanupError) {
          console.error(`[CRITICAL] Cleanup attempt ${attempt + 1} failed for user ${userId}:`, cleanupError);
          if (attempt < 2) await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        }
      }

      return new Response(
        JSON.stringify({
          error: 'Wedding creation failed',
          message: 'Account creation failed. Please try again or contact support.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark pending signup as completed
    await adminClient
      .from('pending_signups')
      .update({
        completed_at: new Date().toISOString(),
        stripe_checkout_status: 'completed',
      })
      .eq('id', pendingSignup.id);

    // Sign in the user to create a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: pendingSignup.email,
      password: pendingSignup.password_hash, // Use the stored password
    });

    if (signInError || !signInData.session) {
      console.error('[API] Auto-login failed:', signInError);
      // Account created successfully but auto-login failed
      return new Response(
        JSON.stringify({
          success: true,
          slug: pendingSignup.slug,
          redirect: `/${pendingSignup.slug}/admin`,
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
        slug: pendingSignup.slug,
        redirect: `/${pendingSignup.slug}/admin`,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at,
        },
        user: {
          id: userId,
          email: pendingSignup.email,
          wedding_id: wedding.id,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Verify payment error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
