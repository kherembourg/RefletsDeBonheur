import type { APIRoute } from 'astro';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { verifyProfileOwnership, validateSameOrigin, errorResponse } from '../../../lib/stripe/apiAuth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return errorResponse('Database not configured', 503);
  }

  if (!isStripeConfigured()) {
    return errorResponse('Payment system not configured', 503);
  }

  const adminClient = getSupabaseAdminClient();

  try {
    const body = await request.json();
    const { profileId, successUrl, cancelUrl } = body;

    if (!profileId || !successUrl || !cancelUrl) {
      return errorResponse('Missing required fields');
    }

    // Verify the authenticated user owns this profile (prevent IDOR)
    const authResult = await verifyProfileOwnership(request, profileId, adminClient);
    if (!authResult.authorized) {
      return errorResponse(authResult.error || 'Unauthorized', 403);
    }

    // Validate redirect URLs are same-origin to prevent open redirect vulnerability
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    if (!validateSameOrigin(successUrl, siteUrl) || !validateSameOrigin(cancelUrl, siteUrl)) {
      return errorResponse('Invalid redirect URL', 400, 'INVALID_URL');
    }

    // Get profile data including subscription status
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, stripe_customer_id, subscription_status')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return errorResponse('Profile not found', 404);
    }

    // Check if user already has an active subscription (prevent duplicate payments)
    if (profile.subscription_status === 'active') {
      return errorResponse('You already have an active subscription', 400, 'ALREADY_ACTIVE');
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
    // Don't expose internal error details to clients
    return errorResponse('Failed to create checkout session', 500);
  }
};
