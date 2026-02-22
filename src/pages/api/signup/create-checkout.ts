import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { getStripeClient, PRODUCT_CONFIG } from '../../../lib/stripe/server';
import type { ThemeId } from '../../../lib/themes';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { validateSignupFields } from './validation';

export const prerender = false;

interface CreateCheckoutRequest {
  email: string;
  password: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date?: string;
  slug: string;
  theme_id: ThemeId;
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit check - 5 attempts per IP per hour
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.signup);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // Check configuration
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const stripeGuard = apiGuards.requireStripe();
  if (stripeGuard) return stripeGuard;

  try {
    const body: CreateCheckoutRequest = await request.json();
    const { email, password, partner1_name, partner2_name, wedding_date, slug, theme_id } = body;

    // Validate all fields
    const validationError = validateSignupFields({ email, password, partner1_name, partner2_name, slug, theme_id });
    if (validationError) return validationError;

    const normalizedSlug = slug.toLowerCase().trim();
    const adminClient = getSupabaseAdminClient();

    // Check if slug is already taken (early fail before payment)
    const { data: existingWedding } = await adminClient
      .from('weddings')
      .select('slug')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (existingWedding) {
      return apiResponse.error('Slug taken', 'This URL is already in use. Please choose another.', 400, 'slug');
    }

    // Note: Password is validated but NOT stored in pending_signups for security
    // After payment succeeds, we generate a random temporary password and send password reset email
    // This ensures passwords are never stored in plaintext anywhere in the system

    // Create Stripe checkout session first
    const stripe = getStripeClient();
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

    const session = await stripe.checkout.sessions.create({
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
      success_url: `${siteUrl}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/signup/cancel`,
      metadata: {
        email,
        slug: normalizedSlug,
        type: 'new_signup',
      },
      customer_email: email,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    // Store wizard data in pending_signups (password is NOT stored for security)
    // This INSERT acts as a slug reservation - the unique constraint prevents duplicates
    const { data: pendingSignup, error: insertError } = await adminClient
      .from('pending_signups')
      .insert({
        stripe_session_id: session.id,
        email,
        partner1_name: partner1_name.trim(),
        partner2_name: partner2_name.trim(),
        wedding_date: wedding_date || null,
        slug: normalizedSlug,
        theme_id,
        stripe_checkout_status: 'pending',
      })
      .select()
      .single();

    if (insertError || !pendingSignup) {
      console.error('[API] Failed to create pending signup:', insertError);

      // Check for unique constraint violation (slug already reserved by another pending signup)
      // PostgreSQL error code 23505 = unique_violation
      if (insertError?.code === '23505' && insertError?.message?.includes('idx_pending_signups_slug_active')) {
        return apiResponse.error(
          'Slug reserved',
          'This URL is currently being used by another signup in progress. Please choose a different URL or try again in a few minutes.',
          409,
          'slug'
        );
      }

      return apiResponse.error(
        'Failed to prepare checkout',
        'Unable to prepare your account. Please try again.',
        500
      );
    }

    // Return Stripe session URL
    return apiResponse.success({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[API] Create checkout error:', error);
    return apiResponse.error(
      'Internal server error',
      'An unexpected error occurred. Please try again.',
      500
    );
  }
};
