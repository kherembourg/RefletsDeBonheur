import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { getStripeClient, PRODUCT_CONFIG } from '../../../lib/stripe/server';
import type { ThemeId } from '../../../lib/themes';
import { RESERVED_SLUGS, isValidSlugFormat } from '../../../lib/slugValidation';
import { validatePassword, getPasswordRequirementsMessage } from '../../../lib/passwordValidation';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { isValidEmail } from '../../../lib/validation/emailValidation';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';

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
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email',
          field: 'email',
          message: 'Please enter a valid email address.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return new Response(
        JSON.stringify({
          error: 'Weak password',
          field: 'password',
          message: getPasswordRequirementsMessage(),
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

    // Check if slug is already taken (early fail before payment)
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
        return new Response(
          JSON.stringify({
            error: 'Slug reserved',
            field: 'slug',
            message: 'This URL is currently being used by another signup in progress. Please choose a different URL or try again in a few minutes.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to prepare checkout',
          message: 'Unable to prepare your account. Please try again.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return Stripe session URL
    return apiResponse.success({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[API] Create checkout error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
