# Stripe Setup Guide

This guide covers how to set up Stripe payments for Reflets de Bonheur.

## 1. Create a Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complete the registration with your email
3. Verify your email address
4. Stay in **Test mode** (toggle in the top-right of the dashboard) for development

## 2. Get API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy the following keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`) - click "Reveal test key"

3. Add them to your `.env` file:

```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

## 3. Create Product & Price (Optional)

The checkout endpoint uses dynamic pricing by default. If you want to use predefined prices:

1. Go to **Products** → **Add product**
2. Fill in:
   - **Name**: "Reflets de Bonheur - Wedding Package"
   - **Description**: "2 years of unlimited photo sharing, wedding website, guestbook"
3. Add a price:
   - **Price**: 199.00 EUR
   - **Billing period**: One time
4. Copy the Price ID (starts with `price_`)
5. Update `STRIPE_PRICES.INITIAL_2_YEARS` in `src/lib/stripe/server.ts`

## 4. Install Stripe CLI (Local Development)

The Stripe CLI forwards webhook events to your local server.

### macOS (Homebrew)

```bash
brew install stripe/stripe-cli/stripe
```

### Other platforms

See [Stripe CLI installation guide](https://docs.stripe.com/stripe-cli).

### Login

```bash
stripe login
```

This opens a browser to authenticate with your Stripe account.

## 5. Start Webhook Forwarding

Run this in a separate terminal while developing:

```bash
stripe listen --forward-to localhost:4321/api/stripe/webhook
```

This will output a webhook signing secret like:

```
> Ready! Your webhook signing secret is whsec_abc123...
```

Copy this value to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

## 6. Test the Payment Flow

### Start the dev server

```bash
npm run dev
```

### Test cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Generic decline |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0027 6000 3184` | Requires 3D Secure |

Use any future expiry (e.g., `12/34`) and any CVC (e.g., `123`).

### Test scenarios

1. **Happy path**: Log in as a trial user → Admin → Click "Passer au forfait complet" → Complete with test card → Verify webhook in CLI → Verify success toast

2. **Cancel checkout**: Start checkout → Click back → Verify cancelled toast

3. **Declined card**: Use `4000 0000 0000 0002` → Verify decline message

### Trigger test webhooks

```bash
# Trigger a checkout completed event
stripe trigger checkout.session.completed

# Trigger a payment failed event
stripe trigger invoice.payment_failed
```

## 7. Production Configuration

### Create webhook endpoint

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Enter your production URL: `https://your-domain.com/api/stripe/webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`)

### Update environment variables

```bash
# Production keys (from Stripe Dashboard > API keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Production webhook secret (from the endpoint you created)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Go live

1. Complete your Stripe account verification (provide business info, bank details)
2. Toggle from **Test mode** to **Live mode** in the dashboard
3. Update your production environment with live keys

## Troubleshooting

### Webhook not receiving events

1. Verify `stripe listen` is running
2. Check the webhook secret matches your `.env`
3. Check the URL matches your server port (4321 by default)

### "Payment system not configured" error

Verify all three Stripe variables are set in `.env`:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Checkout session fails

1. Check browser console for errors
2. Check server logs for Stripe API errors
3. Verify the profile exists and has valid email

### Webhook signature verification fails

1. Make sure you're using the webhook secret from `stripe listen` (not from Dashboard)
2. The secret changes each time you restart `stripe listen`

## Architecture Notes

### Payment model

- Initial payment: €199 one-time for 2 years
- Renewal: €19.99/year (future feature)

### Webhook events handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activates subscription (status → 'active') |
| `customer.subscription.updated` | Updates subscription status |
| `customer.subscription.deleted` | Marks as cancelled |
| `invoice.payment_succeeded` | Extends subscription for renewals |
| `invoice.payment_failed` | Marks as expired |

### Database tables

- `profiles.subscription_status`: 'trial' | 'active' | 'expired' | 'cancelled'
- `profiles.subscription_end_date`: When subscription expires
- `profiles.stripe_customer_id`: Stripe customer ID
- `stripe_events`: Tracks processed webhook events (idempotency)

## Resources

- [Stripe API Reference](https://docs.stripe.com/api)
- [Stripe CLI Documentation](https://docs.stripe.com/stripe-cli)
- [Stripe Testing Guide](https://docs.stripe.com/testing)
- [Stripe Webhooks Guide](https://docs.stripe.com/webhooks)
