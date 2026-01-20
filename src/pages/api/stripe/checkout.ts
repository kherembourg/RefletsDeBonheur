import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getStripeClient, isStripeConfigured, PRODUCT_CONFIG } from '../../../lib/stripe/server';

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
    const { profileId, successUrl, cancelUrl } = body;

    if (!profileId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdminClient();

    // Get profile data
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, stripe_customer_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripeClient();
    let customerId = profile.stripe_customer_id;

    // Create Stripe customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: {
          profileId: profile.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to profile
      await adminClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', profileId);
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: PRODUCT_CONFIG.name,
              description: PRODUCT_CONFIG.description,
            },
            unit_amount: PRODUCT_CONFIG.initialPrice, // $199 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        profileId: profile.id,
        type: 'initial_payment',
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      payment_intent_data: {
        metadata: {
          profileId: profile.id,
          type: 'initial_payment',
        },
      },
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Checkout error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
