import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import type { SubscriptionInfo } from '../../../lib/stripe/types';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const profileId = url.searchParams.get('profileId');

  if (!profileId) {
    return new Response(
      JSON.stringify({ error: 'Missing profileId parameter' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    return new Response(
      JSON.stringify({ error: 'Database not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const adminClient = getSupabaseAdminClient();

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('subscription_status, subscription_end_date, stripe_customer_id')
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found', message: error?.message }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
