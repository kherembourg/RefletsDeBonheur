import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { getStripeClient, PRODUCT_CONFIG } from '../../../lib/stripe/server';
import { apiGuards } from '../../../lib/api/middleware';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { sendWelcomeEmail, sendPaymentConfirmationEmail } from '../../../lib/email';
import { detectLanguageFromRequest } from '../../../lib/email/lang';
import crypto from 'crypto';

export const prerender = false;

/**
 * Generate a cryptographically secure random temporary password
 * This password is only used temporarily - user will immediately receive password reset email
 */
function generateSecureTemporaryPassword(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

interface VerifyPaymentRequest {
  session_id: string;
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit check - 10 attempts per IP per hour
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.verifyPayment);
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

    // Create account using atomic transaction
    const coupleNames = `${pendingSignup.partner1_name} & ${pendingSignup.partner2_name}`;

    // Generate a secure random temporary password
    // User will immediately receive a password reset email and won't need this password
    const temporaryPassword = generateSecureTemporaryPassword();

    // Step 1: Create user in Supabase Auth (cannot be part of DB transaction)
    const authResult = await adminClient.auth.admin.createUser({
      email: pendingSignup.email,
      password: temporaryPassword, // Secure random temporary password
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

    // Get Stripe customer ID from session
    const customerId = session.customer as string;

    // Step 2: Create profile + wedding in atomic transaction
    // This stored procedure wraps all DB operations in a single transaction
    // If any step fails, everything is automatically rolled back
    let accountData: {
      user_id: string;
      wedding_id: string;
      email: string;
      slug: string;
      couple_names: string;
      guest_code: string;
    };

    try {
      const { data, error: rpcError } = await adminClient.rpc('create_account_from_payment', {
        p_user_id: userId,
        p_pending_signup_id: pendingSignup.id,
        p_stripe_customer_id: customerId || null,
      });

      if (rpcError || !data) {
        throw new Error(rpcError?.message || 'Transaction failed with no error message');
      }

      accountData = data as typeof accountData;
    } catch (transactionError) {
      console.error('[API] Account creation transaction failed:', transactionError);

      // CRITICAL: Transaction failed, must delete auth user to prevent orphaned record
      // No need for retries - just one cleanup attempt since this is the exception path
      try {
        await adminClient.auth.admin.deleteUser(userId);
        console.log(`[API] Successfully cleaned up auth user ${userId} after transaction failure`);
      } catch (cleanupError) {
        // This is a critical error - auth user exists but no profile/wedding
        console.error(`[CRITICAL] Failed to cleanup auth user ${userId} after transaction failure:`, cleanupError);
        console.error('[CRITICAL] Manual database cleanup required for orphaned auth user:', userId);
      }

      return new Response(
        JSON.stringify({
          error: 'Account creation failed',
          message: 'Failed to create your account. Please try again or contact support.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send password reset email so user can set their own password
    // This is more secure than storing passwords or auto-logging in
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const { data: linkData, error: resetError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: accountData.email,
      options: {
        redirectTo: `${siteUrl}/${accountData.slug}/admin`,
      },
    });

    // Detect language from request for email localization
    const lang = detectLanguageFromRequest(request);

    if (resetError) {
      console.error('[API] Password reset email failed:', resetError);
      // Account created but email failed - user can still request password reset manually
      return new Response(
        JSON.stringify({
          success: true,
          slug: accountData.slug,
          redirect: `/connexion?email=${encodeURIComponent(accountData.email)}&message=account_created_email_failed`,
          needsPasswordReset: true,
          message: 'Account created! Please check your email to set your password, or use the password reset link on the login page.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send welcome email with magic link (non-blocking - failure doesn't affect response)
    const magicLink = linkData?.properties?.action_link || `${siteUrl}/connexion`;
    sendWelcomeEmail({
      coupleNames: accountData.couple_names,
      email: accountData.email,
      slug: accountData.slug,
      magicLink,
      guestCode: accountData.guest_code,
      lang,
    }).catch((err) => console.error('[Email] Welcome email fire-and-forget error:', err));

    // Send payment confirmation email (non-blocking)
    const amountPaid = `€${(session.amount_total ? session.amount_total / 100 : PRODUCT_CONFIG.initialPrice / 100).toFixed(2)}`;
    sendPaymentConfirmationEmail({
      coupleNames: accountData.couple_names,
      email: accountData.email,
      slug: accountData.slug,
      amount: amountPaid,
      lang,
    }).catch((err) => console.error('[Email] Payment confirmation fire-and-forget error:', err));

    // Return success - user will receive email with magic link
    return new Response(
      JSON.stringify({
        success: true,
        slug: accountData.slug,
        redirect: `/signup/check-email?email=${encodeURIComponent(accountData.email)}&slug=${accountData.slug}`,
        message: 'Account created! Please check your email to access your wedding dashboard.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Verify payment error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again or contact support.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
