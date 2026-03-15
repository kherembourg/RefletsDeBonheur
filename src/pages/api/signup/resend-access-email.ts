import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { apiGuards } from '../../../lib/api/middleware';
import { checkRateLimit, getClientIP, createRateLimitResponse, RATE_LIMITS } from '../../../lib/rateLimit';
import { sendWelcomeEmail } from '../../../lib/email';
import { detectLanguageFromRequest } from '../../../lib/email/lang';

export const prerender = false;

interface ResendAccessEmailRequest {
  email?: string;
  slug?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.verifyPayment);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  try {
    const body: ResendAccessEmailRequest = await request.json();
    const email = body.email?.trim().toLowerCase() || '';
    const slug = body.slug?.trim() || '';

    if (!email || !slug) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'Email and slug are required.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getSupabaseAdminClient();

    const { data: wedding, error: weddingError } = await adminClient
      .from('weddings')
      .select('owner_id, slug, pin_code, bride_name, groom_name')
      .eq('slug', slug)
      .maybeSingle();

    if (weddingError || !wedding) {
      return new Response(
        JSON.stringify({
          error: 'Wedding not found',
          message: 'Unable to find this wedding space.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', wedding.owner_id)
      .single();

    if (profileError || !profile || profile.email?.toLowerCase() !== email) {
      return new Response(
        JSON.stringify({
          error: 'Account not found',
          message: 'Unable to match this email with the wedding space.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${siteUrl}/${slug}/admin`,
      },
    });

    if (linkError) {
      console.error('[API] Failed to generate access link:', linkError);
      return new Response(
        JSON.stringify({
          error: 'Link generation failed',
          message: 'Unable to generate a new access link.',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lang = detectLanguageFromRequest(request);
    const sendResult = await sendWelcomeEmail({
      coupleNames: `${wedding.bride_name} & ${wedding.groom_name}`,
      email,
      slug,
      magicLink: linkData?.properties?.action_link || `${siteUrl}/connexion?mode=client&email=${encodeURIComponent(email)}`,
      guestCode: wedding.pin_code || '',
      lang,
    });

    if (!sendResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Email send failed',
          message: 'Unable to resend the access email.',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Resend access email error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
