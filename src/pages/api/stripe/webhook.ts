import type { APIRoute } from 'astro';
import { getSupabaseAdminClient, isSupabaseServiceRoleConfigured } from '../../../lib/supabase/server';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { getStripeClient, getStripeWebhookSecret, isStripeConfigured, PRODUCT_CONFIG } from '../../../lib/stripe/server';
import type Stripe from 'stripe';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSupabaseConfigured() || !isSupabaseServiceRoleConfigured()) {
    console.error('[Webhook] Database not configured');
    return new Response('Database not configured', { status: 503 });
  }

  if (!isStripeConfigured()) {
    console.error('[Webhook] Stripe not configured');
    return new Response('Payment system not configured', { status: 503 });
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
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
            console.error('[Webhook] Failed to update profile:', error);
          } else {
            console.log(`[Webhook] Profile ${profileId} upgraded to active`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find profile by stripe_customer_id
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const status = mapStripeStatus(subscription.status);
          // Access current_period_end with type assertion - property exists in Stripe API but may not be in types
          const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
          const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000) : new Date();

          await adminClient
            .from('profiles')
            .update({
              subscription_status: status,
              subscription_end_date: currentPeriodEnd.toISOString(),
            })
            .eq('id', profile.id);

          console.log(`[Webhook] Subscription updated for profile ${profile.id}: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find profile by stripe_customer_id
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await adminClient
            .from('profiles')
            .update({
              subscription_status: 'cancelled',
            })
            .eq('id', profile.id);

          console.log(`[Webhook] Subscription cancelled for profile ${profile.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only process renewal invoices (not the initial payment)
        if (invoice.billing_reason === 'subscription_cycle') {
          const { data: profile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            // Extend subscription by 1 year for renewals
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            await adminClient
              .from('profiles')
              .update({
                subscription_status: 'active',
                subscription_end_date: endDate.toISOString(),
              })
              .eq('id', profile.id);

            console.log(`[Webhook] Subscription renewed for profile ${profile.id}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          // Mark as expired after payment failure
          await adminClient
            .from('profiles')
            .update({
              subscription_status: 'expired',
            })
            .eq('id', profile.id);

          console.log(`[Webhook] Payment failed for profile ${profile.id}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Webhook] Handler error:', error);
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
