import type { APIRoute } from 'astro';
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
    const { profileId, returnUrl } = body;

    if (!profileId || !returnUrl) {
      return errorResponse('Missing required fields');
    }

    // Verify the authenticated user owns this profile (prevent IDOR)
    const authResult = await verifyProfileOwnership(request, profileId, adminClient);
    if (!authResult.authorized) {
      return errorResponse(authResult.error || 'Unauthorized', 403);
    }

    // Validate returnUrl is same-origin to prevent open redirect vulnerability
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    if (!validateSameOrigin(returnUrl, siteUrl)) {
      return errorResponse('Invalid return URL', 400, 'INVALID_URL');
    }

    // Get profile with Stripe customer ID
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return errorResponse('Profile not found', 404);
    }

    if (!profile.stripe_customer_id) {
      return errorResponse('No Stripe customer found for this profile');
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
    // Don't expose internal error details to clients
    return errorResponse('Failed to create portal session', 500);
  }
};
