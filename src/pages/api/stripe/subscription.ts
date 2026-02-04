import type { APIRoute } from 'astro';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import { apiGuards, apiResponse } from '../../../lib/api/middleware';
import type { SubscriptionInfo } from '../../../lib/stripe/types';
import { verifyProfileOwnership, errorResponse } from '../../../lib/stripe/apiAuth';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const profileId = url.searchParams.get('profileId');

  if (!profileId) {
    return errorResponse('Missing profileId parameter');
  }

  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return errorResponse('Database not configured', 503);
  }

  const adminClient = getSupabaseAdminClient();

  try {
    // Verify the authenticated user owns this profile (prevent IDOR)
    const authResult = await verifyProfileOwnership(request, profileId, adminClient);
    if (!authResult.authorized) {
      return errorResponse(authResult.error || 'Unauthorized', 403);
    }

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('subscription_status, subscription_end_date, stripe_customer_id')
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      return errorResponse('Profile not found', 404);
    }

    const now = new Date();
    const endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const isTrialExpired = profile.subscription_status === 'trial' && endDate !== null && endDate < now;

    const subscriptionInfo: SubscriptionInfo = {
      status: isTrialExpired ? 'expired' : (profile.subscription_status as SubscriptionInfo['status']),
      trialEndsAt: profile.subscription_status === 'trial' ? profile.subscription_end_date : null,
      currentPeriodEnd: profile.subscription_status === 'active' ? profile.subscription_end_date : null,
      cancelAtPeriodEnd: false, // Would need Stripe API call to determine
      stripeCustomerId: profile.stripe_customer_id,
      stripeSubscriptionId: null, // Would need Stripe API call
      daysRemaining,
      isTrialExpired,
      canUploadToCloud: profile.subscription_status === 'active',
    };

    return new Response(
      JSON.stringify(subscriptionInfo),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Subscription status error:', error);
    return errorResponse('Internal server error', 500);
  }
};
