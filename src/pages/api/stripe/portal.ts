import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getStripeClient, isStripeConfigured } from '../../../lib/stripe/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isStripeConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Payment system not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { profileId, returnUrl } = body;

    if (!profileId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Get profile with Stripe customer ID
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found for this profile' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripeClient();

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Portal error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create portal session',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
