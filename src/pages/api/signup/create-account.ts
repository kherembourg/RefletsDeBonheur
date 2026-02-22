import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import type { ThemeId } from '../../../lib/themes';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { sendWelcomeEmail } from '../../../lib/email';
import { detectLanguageFromRequest } from '../../../lib/email/lang';
import { validateSignupFields } from './validation';

export const prerender = false;

interface CreateAccountRequest {
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
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.createAccount);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // Check configuration
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  try {
    const body: CreateAccountRequest = await request.json();
    const { email, password, partner1_name, partner2_name, wedding_date, slug, theme_id } = body;

    // Validate all fields
    const validationError = validateSignupFields({ email, password, partner1_name, partner2_name, slug, theme_id });
    if (validationError) return validationError;

    const normalizedSlug = slug.toLowerCase().trim();
    const adminClient = getSupabaseAdminClient();

    // Check if slug is already taken
    const { data: existingWedding } = await adminClient
      .from('weddings')
      .select('slug')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (existingWedding) {
      return apiResponse.error('Slug taken', 'This URL is already in use. Please choose another.', 400, 'slug');
    }

    // Step 1: Create user in Supabase Auth with actual password
    const coupleNames = `${partner1_name.trim()} & ${partner2_name.trim()}`;
    const authResult = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: coupleNames,
      },
    });

    if (authResult.error || !authResult.data.user) {
      console.error('[API] Auth user creation failed:', authResult.error);

      if (authResult.error?.message?.includes('already been registered')) {
        return apiResponse.error(
          'Account exists',
          'An account with this email already exists. Please sign in instead.',
          400,
          'email'
        );
      }

      return apiResponse.error(
        'Failed to create account',
        'Unable to create your account. Please try again.',
        500
      );
    }

    const userId = authResult.data.user.id;

    // Step 2: Create profile + wedding in atomic transaction
    let accountData: {
      user_id: string;
      wedding_id: string;
      email: string;
      slug: string;
      couple_names: string;
      guest_code: string;
      trial_ends_at: string;
    };

    try {
      const { data, error: rpcError } = await adminClient.rpc('create_trial_account', {
        p_user_id: userId,
        p_email: email,
        p_partner1_name: partner1_name.trim(),
        p_partner2_name: partner2_name.trim(),
        p_wedding_date: wedding_date || null,
        p_slug: normalizedSlug,
        p_theme_id: theme_id,
      });

      if (rpcError || !data) {
        throw new Error(rpcError?.message || 'Transaction failed with no error message');
      }

      accountData = data as typeof accountData;
    } catch (transactionError) {
      console.error('[API] Trial account creation transaction failed:', transactionError);

      // CRITICAL: Transaction failed, must delete auth user to prevent orphaned record
      try {
        await adminClient.auth.admin.deleteUser(userId);
        console.log(`[API] Cleaned up auth user ${userId} after transaction failure`);
      } catch (cleanupError) {
        console.error(`[CRITICAL] Failed to cleanup auth user ${userId}:`, cleanupError);
      }

      return apiResponse.error(
        'Account creation failed',
        'Failed to create your account. Please try again or contact support.',
        500
      );
    }

    // Step 3: Send welcome email (non-blocking, fire-and-forget)
    const lang = detectLanguageFromRequest(request);
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

    sendWelcomeEmail({
      coupleNames: accountData.couple_names,
      email: accountData.email,
      slug: accountData.slug,
      magicLink: `${siteUrl}/${accountData.slug}/admin`,
      guestCode: accountData.guest_code,
      lang,
      hasPassword: true,
    }).catch((err) => console.error('[Email] Welcome email fire-and-forget error:', err));

    // Return success - frontend will auto-login with password
    return apiResponse.success({
      success: true,
      slug: accountData.slug,
      email: accountData.email,
    });
  } catch (error) {
    console.error('[API] Create account error:', error);
    return apiResponse.error(
      'Internal server error',
      'An unexpected error occurred. Please try again.',
      500
    );
  }
};
