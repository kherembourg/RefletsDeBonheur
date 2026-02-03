import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getStripeClient, isStripeConfigured, PRODUCT_CONFIG } from '../../../lib/stripe/server';
import type { ThemeId } from '../../../lib/themes';
import { RESERVED_SLUGS, isValidSlugFormat } from '../../../lib/slugValidation';
import { validatePassword, getPasswordRequirementsMessage } from '../../../lib/passwordValidation';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';

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

  if (!isStripeConfigured()) {
    return new Response(
      JSON.stringify({
        error: 'Payment system not configured',
        message: 'Stripe is not configured.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

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

    // Note: We store the password temporarily (it will be used to create auth user after payment)
    // The pending_signups table expires after 24h and is only accessible via service role
    // This is more secure than emailing a temporary password or forcing password reset

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

    // Store wizard data in pending_signups
    const { data: pendingSignup, error: insertError } = await adminClient
      .from('pending_signups')
      .insert({
        stripe_session_id: session.id,
        email,
        password_hash: password, // Store temporarily for account creation (expires in 24h)
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
      return new Response(
        JSON.stringify({
          error: 'Failed to prepare checkout',
          message: 'Unable to prepare your account. Please try again.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return Stripe session URL
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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
