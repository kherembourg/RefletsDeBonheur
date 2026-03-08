import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../lib/supabase/server';
import { getStripeClient, getStripeWebhookSecret, PRODUCT_CONFIG } from '../../../lib/stripe/server';
import type Stripe from 'stripe';
import { apiGuards } from '../../../lib/api/middleware';
import { sendPaymentConfirmationEmail } from '../../../lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) {
    console.error('[Webhook] Database not configured');
    return supabaseGuard;
  }

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) {
    console.error('[Webhook] Service role not configured');
    return serviceRoleGuard;
  }

  const stripeGuard = apiGuards.requireStripe();
  if (stripeGuard) {
    console.error('[Webhook] Stripe not configured');
    return stripeGuard;
  }

  const stripe = getStripeClient();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header');
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    const webhookSecret = getStripeWebhookSecret();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();

  // Atomic idempotency: try to insert first
  // This prevents TOCTOU race conditions - if insert succeeds, we own this event
  const { error: insertError } = await adminClient
    .from('stripe_events')
    .insert({
      stripe_event_id: event.id,
      type: event.type,
      status: 'processing',
    });

  if (insertError) {
    // If insert fails with unique constraint (23505), event is already being/been processed
    if (insertError.code === '23505') {
      console.log(`[Webhook] Event ${event.id} already processed or in progress, skipping`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // For other errors, log but continue - better to process twice than not at all
    console.error('[Webhook] Failed to store event:', insertError);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionType = session.metadata?.type;

        if (sessionType === 'new_signup') {
          // New signup flow - mark pending signup as completed
          // The actual account creation is handled by /api/signup/verify-payment
          const { error } = await adminClient
            .from('pending_signups')
            .update({ stripe_checkout_status: 'completed' })
            .eq('stripe_session_id', session.id);

          if (error) {
            throw new Error(`Failed to mark pending signup as completed for session ${session.id}: ${error.message}`);
          }

          console.log(`[Webhook] Pending signup marked complete for session ${session.id}`);
        } else {
          // Existing profile upgrade flow
          const profileId = session.metadata?.profileId;

          if (!profileId) {
            console.error('[Webhook] No profileId in session metadata');
            break;
          }

          if (session.payment_status === 'paid') {
            // Calculate new subscription end date (2 years from now)
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + PRODUCT_CONFIG.initialPeriodYears);

            // Update profile to active status
            const { error } = await adminClient
              .from('profiles')
              .update({
                subscription_status: 'active',
                subscription_end_date: endDate.toISOString(),
                stripe_customer_id: session.customer as string,
              })
              .eq('id', profileId);

            if (error) {
              throw new Error(`Failed to update profile ${profileId}: ${error.message}`);
            }

            console.log(`[Webhook] Profile ${profileId} upgraded to active`);

            // Send payment confirmation email (non-blocking)
            const { data: profileData } = await adminClient
              .from('profiles')
              .select('email, full_name')
              .eq('id', profileId)
              .single();

            if (profileData?.email) {
              const amountPaid = `€${(session.amount_total ? session.amount_total / 100 : PRODUCT_CONFIG.initialPrice / 100).toFixed(2)}`;
              sendPaymentConfirmationEmail({
                coupleNames: profileData.full_name || 'Customer',
                email: profileData.email,
                amount: amountPaid,
                lang: 'fr',
              }).catch((err) => console.error('[Webhook] Payment email error:', err));
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile, error: lookupError } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (lookupError) {
          throw new Error(`Failed to look up profile for customer ${customerId}: ${lookupError.message}`);
        }

        if (profile) {
          const status = mapStripeStatus(subscription.status);
          const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
          const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : new Date();

          const { error: updateError } = await adminClient
            .from('profiles')
            .update({
              subscription_status: status,
              subscription_end_date: currentPeriodEnd.toISOString(),
            })
            .eq('id', profile.id);

          if (updateError) {
            throw new Error(`Failed to update subscription for profile ${profile.id}: ${updateError.message}`);
          }

          console.log(`[Webhook] Subscription updated for profile ${profile.id}: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile, error: lookupError } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (lookupError) {
          throw new Error(`Failed to look up profile for customer ${customerId}: ${lookupError.message}`);
        }

        if (profile) {
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({
              subscription_status: 'cancelled',
            })
            .eq('id', profile.id);

          if (updateError) {
            throw new Error(`Failed to cancel subscription for profile ${profile.id}: ${updateError.message}`);
          }

          console.log(`[Webhook] Subscription cancelled for profile ${profile.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (invoice.billing_reason === 'subscription_cycle') {
          const { data: profile, error: lookupError } = await adminClient
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (lookupError) {
            throw new Error(`Failed to look up profile for customer ${customerId}: ${lookupError.message}`);
          }

          if (profile) {
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            const { error: updateError } = await adminClient
              .from('profiles')
              .update({
                subscription_status: 'active',
                subscription_end_date: endDate.toISOString(),
              })
              .eq('id', profile.id);

            if (updateError) {
              throw new Error(`Failed to renew subscription for profile ${profile.id}: ${updateError.message}`);
            }

            console.log(`[Webhook] Subscription renewed for profile ${profile.id}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile, error: lookupError } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (lookupError) {
          throw new Error(`Failed to look up profile for customer ${customerId}: ${lookupError.message}`);
        }

        if (profile) {
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({
              subscription_status: 'expired',
            })
            .eq('id', profile.id);

          if (updateError) {
            throw new Error(`Failed to mark payment failed for profile ${profile.id}: ${updateError.message}`);
          }

          console.log(`[Webhook] Payment failed for profile ${profile.id}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as completed
    await adminClient
      .from('stripe_events')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Webhook] Handler error:', error);

    // Mark event as failed for investigation
    try {
      await adminClient
        .from('stripe_events')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('stripe_event_id', event.id);
    } catch (markError) {
      console.error('[Webhook] Failed to mark event as failed:', markError);
    }

    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'expired' | 'cancelled' | 'trial' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'expired';
    default:
      return 'expired';
  }
}
