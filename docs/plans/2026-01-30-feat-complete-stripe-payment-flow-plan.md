---
title: Complete Stripe Payment Flow
type: feat
date: 2026-01-30
---

# Complete Stripe Payment Flow

## Overview

Complete the end-to-end Stripe payment flow for the $199 wedding package. The code infrastructure is ~90% complete. This plan focuses on:

1. Setting up Stripe test environment
2. Fixing critical gaps in existing code
3. Testing the full payment flow end-to-end
4. Documenting the setup process

## Problem Statement

The Stripe integration code exists but has never been tested against real Stripe APIs. Key issues identified:

- **No Stripe account/products configured** - Cannot test without this
- **Missing idempotency** - Webhook retries could corrupt data
- **No duplicate payment protection** - Active users could pay twice
- **Poor success/cancel UX** - No feedback after returning from Stripe
- **Security gaps** - URL validation missing in checkout endpoint

## Proposed Solution

A phased approach: fix critical security/data issues first, then test the full flow.

---

## Technical Approach

### Phase 1: Critical Code Fixes

Before testing, fix security and data integrity issues.

#### Task 1.1: Add Webhook Idempotency

**File:** `src/pages/api/stripe/webhook.ts`

**Why:** Stripe delivers webhooks with "at least once" guarantee. Without idempotency, profile could be updated multiple times.

**Changes:**
1. Create `stripe_events` table for tracking processed events
2. Check if event ID already exists before processing
3. Store event ID after successful processing

```sql
-- Add to supabase/migrations/XXX_stripe_events.sql
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_event_id ON stripe_events(stripe_event_id);
```

**Acceptance Criteria:**
- [x] `stripe_events` table exists with unique constraint on `stripe_event_id`
- [x] Webhook checks if event already processed before handling
- [x] Duplicate events are logged and skipped (return 200)
- [x] Successfully processed events are stored

---

#### Task 1.2: Add Duplicate Payment Protection

**File:** `src/pages/api/stripe/checkout.ts`

**Why:** Prevent active users from accidentally paying again.

**Changes:**
```typescript
// Before creating checkout session, check current status
const { data: profile } = await adminClient
  .from('profiles')
  .select('subscription_status')
  .eq('id', profileId)
  .single();

if (profile?.subscription_status === 'active') {
  return new Response(
    JSON.stringify({ error: 'Already subscribed', code: 'ALREADY_ACTIVE' }),
    { status: 400 }
  );
}
```

**Acceptance Criteria:**
- [x] Checkout returns 400 if user already has `subscription_status: 'active'`
- [x] Error message is clear and actionable
- [x] UI handles this error gracefully (shows "Already subscribed" message)

---

#### Task 1.3: Add URL Validation

**File:** `src/pages/api/stripe/checkout.ts`

**Why:** Prevent open redirect vulnerability through success/cancel URLs.

**Changes:**
```typescript
// Validate URLs are same-origin
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const allowed = new URL(siteUrl);
    return parsed.origin === allowed.origin;
  } catch {
    return false;
  }
};

if (!isValidUrl(successUrl) || !isValidUrl(cancelUrl)) {
  return new Response(
    JSON.stringify({ error: 'Invalid redirect URL' }),
    { status: 400 }
  );
}
```

**Acceptance Criteria:**
- [x] Checkout rejects URLs with different origins
- [x] Test with malicious URLs returns 400
- [x] Valid same-origin URLs work correctly

---

### Phase 2: UX Improvements

#### Task 2.1: Success/Cancel Feedback

**File:** `src/components/admin/AdminPanel.tsx`

**Why:** Users need confirmation their payment succeeded or was cancelled.

**Changes:**
1. Read `payment` query parameter on mount
2. Show toast notification for success/cancelled states
3. Clear query parameter after showing toast
4. Trigger subscription status refresh

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');

  if (payment === 'success') {
    showToast('Paiement réussi ! Votre abonnement est maintenant actif.', 'success');
    // Remove query param from URL
    window.history.replaceState({}, '', window.location.pathname);
    // Refresh subscription status
    refetchSubscription();
  } else if (payment === 'cancelled') {
    showToast('Paiement annulé. Vous pouvez réessayer à tout moment.', 'info');
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);
```

**Acceptance Criteria:**
- [x] Success toast appears when returning with `?payment=success`
- [x] Cancelled toast appears when returning with `?payment=cancelled`
- [x] Query parameter is removed from URL after showing toast
- [x] Subscription status is refreshed after successful payment

---

### Phase 3: Stripe Setup & Testing

#### Task 3.1: Create Stripe Account

**Steps:**
1. Go to https://dashboard.stripe.com/register
2. Complete account setup (email verification)
3. Stay in **Test mode** (toggle in dashboard header)

**No code changes needed.**

---

#### Task 3.2: Create Product & Price

**Steps in Stripe Dashboard:**
1. Go to Products → Add product
2. Name: "Reflets de Bonheur - Wedding Package"
3. Description: "2 years of unlimited photo sharing, wedding website, guestbook"
4. Price: €199.00 (one-time)
5. Copy the Price ID (starts with `price_`)

**Optional:** Update `STRIPE_PRICES.INITIAL_2_YEARS` in `src/lib/stripe/server.ts` if using predefined prices instead of `price_data`.

---

#### Task 3.3: Configure Environment Variables

**File:** `.env` (local only, never commit)

```bash
# Copy from Stripe Dashboard → Developers → API keys
STRIPE_SECRET_KEY=sk_test_XXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXX

# Webhook secret will come from Stripe CLI
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXX
```

**Acceptance Criteria:**
- [ ] `.env` has all three Stripe variables
- [ ] Keys start with `sk_test_` and `pk_test_` (test mode)
- [ ] Server starts without Stripe configuration errors

---

#### Task 3.4: Install & Configure Stripe CLI

**Commands:**
```bash
# Install via Homebrew (macOS)
brew install stripe/stripe-cli/stripe

# Verify installation
stripe --version

# Login (opens browser)
stripe login

# Start webhook forwarding and get secret
stripe listen --forward-to localhost:4321/api/stripe/webhook
```

Copy the `whsec_...` value printed by CLI to your `.env` as `STRIPE_WEBHOOK_SECRET`.

**Acceptance Criteria:**
- [ ] Stripe CLI installed and authenticated
- [ ] Webhook forwarding running on correct URL
- [ ] Webhook secret added to `.env`

---

#### Task 3.5: End-to-End Test Checklist

Run through each scenario with the dev server and Stripe CLI active.

**Test 1: Happy Path**
- [ ] Start as trial user (or create new account)
- [ ] Click "Passer au forfait complet" in admin dashboard
- [ ] Redirected to Stripe Checkout
- [ ] Use test card `4242 4242 4242 4242`, any expiry, any CVC
- [ ] Complete payment
- [ ] Webhook received in CLI terminal
- [ ] Redirected to `/admin?payment=success`
- [ ] Success toast appears
- [ ] Status shows "Actif" (not "Essai gratuit")

**Test 2: Cancel Checkout**
- [ ] Click upgrade button
- [ ] On Stripe Checkout, click back arrow
- [ ] Redirected to `/admin?payment=cancelled`
- [ ] Cancelled toast appears
- [ ] Status unchanged (still trial)

**Test 3: Duplicate Payment Prevention**
- [ ] With active subscription, try to access checkout endpoint
- [ ] Should receive "Already subscribed" error
- [ ] No new Stripe session created

**Test 4: Webhook Idempotency**
- [ ] Trigger same webhook event twice
- [ ] Second event should be skipped (check logs)
- [ ] Profile not updated twice

**Test 5: Failed Payment**
- [ ] Use decline card `4000 0000 0000 0002`
- [ ] Payment should fail
- [ ] User shown error on Stripe Checkout
- [ ] No webhook for checkout.session.completed

---

### Phase 4: Documentation

#### Task 4.1: Create Stripe Setup Guide

**File:** `docs/stripe-setup.md`

Document:
1. How to create Stripe account
2. How to create product/price
3. How to get API keys
4. How to install Stripe CLI
5. How to test locally
6. How to configure for production

**Acceptance Criteria:**
- [x] New developer can follow guide to set up Stripe
- [x] Test and production instructions clearly separated
- [x] Common troubleshooting included

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/api/stripe/webhook.ts` | Add idempotency checking |
| `src/pages/api/stripe/checkout.ts` | Add duplicate protection + URL validation |
| `src/components/admin/AdminPanel.tsx` | Add success/cancel toast handling |
| `supabase/migrations/XXX_stripe_events.sql` | New table for event tracking |
| `.env.example` | Document required Stripe variables |
| `docs/stripe-setup.md` | New setup guide |

---

## Test Cards Reference

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Generic decline |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0027 6000 3184` | Requires 3D Secure |

Use any future expiry (e.g., `12/34`) and any CVC (e.g., `123`).

---

## Success Criteria

- [ ] All Phase 1 security fixes implemented and tested
- [ ] Phase 2 UX improvements show proper feedback
- [ ] Phase 3 end-to-end tests all pass
- [ ] Phase 4 documentation allows new developers to onboard
- [ ] No console errors during payment flow
- [ ] Profile correctly transitions from `trial` → `active`

---

## Out of Scope

- Email notifications (separate feature)
- Renewal flow automation (future work)
- Invoice history display (future work)
- Production deployment (separate task)

---

## References

- Brainstorm: `docs/brainstorms/2026-01-30-stripe-payment-flow-brainstorm.md`
- Existing checkout: `src/pages/api/stripe/checkout.ts`
- Existing webhook: `src/pages/api/stripe/webhook.ts`
- Stripe CLI docs: https://docs.stripe.com/stripe-cli
- Stripe test cards: https://docs.stripe.com/testing
