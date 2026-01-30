# Brainstorm: Complete Stripe Payment Flow

**Date:** January 30, 2026
**Status:** Ready for Planning

---

## What We're Building

Complete the end-to-end Stripe payment flow for the $199 wedding package. The code infrastructure already exists in the codebase—this work focuses on:

1. **Stripe account setup** - Create account, configure products/prices
2. **Local testing environment** - Stripe CLI for webhook forwarding
3. **End-to-end verification** - Test the complete flow with test cards
4. **Gap identification** - Find and fix any issues in existing code

---

## Why This Approach

**Stripe CLI + Local Testing** was chosen because:

- Fastest feedback loop for development
- No deployment needed to test webhooks
- Can iterate quickly on code fixes
- Standard practice for Stripe integration development

---

## Current State

### Already Implemented ✅

| Component | Location | Status |
|-----------|----------|--------|
| Stripe client setup | `src/lib/stripe/server.ts` | Done |
| Checkout endpoint | `src/pages/api/stripe/checkout.ts` | Done |
| Webhook handler | `src/pages/api/stripe/webhook.ts` | Done |
| Billing portal | `src/pages/api/stripe/portal.ts` | Done |
| Subscription API | `src/pages/api/stripe/subscription.ts` | Done |
| UI component | `src/components/admin/SubscriptionStatus.tsx` | Done |
| Database schema | `profiles.stripe_customer_id`, `subscription_status` | Done |
| Type definitions | `src/lib/stripe/types.ts` | Done |

### Not Yet Done

- Stripe account creation
- Products/prices in Stripe Dashboard
- Environment variables configured
- Success/cancel redirect pages (may need improvement)
- End-to-end testing

---

## Key Decisions

1. **Test mode first** - Verify everything works before going live
2. **Use Stripe CLI** - Forward webhooks to localhost for testing
3. **One-time payment model** - Initial $199 for 2 years (not subscription)
4. **Renewal handled separately** - $19.99/year renewal is future work

---

## Test Scenarios to Verify

1. **Happy path**: User clicks upgrade → completes checkout → webhook fires → profile updated to `active`
2. **Cancel checkout**: User abandons checkout → no changes to profile
3. **Webhook verification**: Signature validation works correctly
4. **Trial user UI**: Shows upgrade button, limitations banner
5. **Active user UI**: Shows "Manage subscription" button, no limitations

---

## Open Questions

1. **Success page**: Does the current success redirect provide good UX?
2. **Error handling**: What happens if webhook fails? Is there retry logic?
3. **Duplicate payments**: Is there protection against double-charges?

---

## Next Steps

Run `/workflows:plan` to create implementation tasks for:

1. Stripe account setup instructions
2. Environment variable configuration
3. Stripe CLI installation and usage
4. Step-by-step testing checklist
5. Code fixes for any issues found

---

## References

- Existing checkout code: `src/pages/api/stripe/checkout.ts`
- Webhook handler: `src/pages/api/stripe/webhook.ts`
- Stripe types: `src/lib/stripe/types.ts`
- Pricing page: `src/pages/pricing.astro`
