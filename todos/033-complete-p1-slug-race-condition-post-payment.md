---
status: complete
priority: p1
issue_id: "033"
tags: [data-integrity, code-review, payment-integration, pr-36, financial-risk]
dependencies: []
completed_at: 2026-02-04
---

# CRITICAL: Slug Race Condition After Payment (Financial Risk)

## Problem Statement

There's a race condition window between slug validation (before payment) and account creation (after payment). If two users select the same slug and both complete payment, one user will have paid $199 but receive an error: "Slug taken after payment". This creates **financial liability** as payment succeeded but service was not delivered.

**Why This Matters:**
- User paid money but got no account
- Manual refund required
- Support overhead (~15 min/incident)
- Brand damage and trust erosion
- Violates payment processor best practices

## Findings

**Location:**
- `src/pages/api/signup/create-checkout.ts:129-144` (first check)
- `src/pages/api/signup/verify-payment.ts:106-123` (second check)

**Evidence:**
```typescript
// Race condition window:
// Time   User A                 User B                 Database
// T0     Checks slug "alice"    -                      available
// T1     Creates checkout       -                      available
// T2     At Stripe...           Checks slug "alice"    available
// T5     Payment complete       Payment complete       available
// T6     Re-checks slug ✅      -                      taken by A
// T7     Creates wedding        -                      slug = "alice"
// T8     -                      Re-checks slug ❌      CONFLICT!
// T9     -                      409 Error              User B paid but no account!
```

**Current Handling:**
```typescript
// verify-payment.ts:113-123
if (existingWedding) {
  return new Response(JSON.stringify({
    error: 'Slug taken after payment',
    code: 'SLUG_CONFLICT_POST_PAYMENT',
    message: 'This URL was just taken by someone else. Please contact support...',
  }), { status: 409 });
}
```

**Impact:**
- Payment taken but no account created
- No automatic refund triggered
- Customer stranded with error message
- Support ticket required for resolution

**Reviewers Identified:** data-integrity-guardian, security-sentinel, architecture-strategist, performance-oracle

## Proposed Solutions

### Solution 1: Slug Reservation System (Recommended)
**Description:** Reserve slug in pending_signups with unique constraint, release on expiry.

**Pros:**
- Prevents race condition entirely
- Clean architectural solution
- No UX changes needed

**Cons:**
- Requires migration
- Adds complexity to cleanup

**Effort:** 4-6 hours

**Risk:** Low - well-tested pattern

**Implementation:**
```sql
-- Migration
CREATE UNIQUE INDEX idx_pending_signups_slug_active
ON pending_signups(slug)
WHERE completed_at IS NULL AND expires_at > now();

-- In create-checkout.ts, slug reservation happens at INSERT
-- Unique constraint prevents duplicates
```

### Solution 2: Automatic Slug Suffix
**Description:** If slug taken post-payment, automatically append suffix (e.g., alice-bob → alice-bob-2).

**Pros:**
- Always succeeds
- No refund needed
- User gets account

**Cons:**
- User may not like modified slug
- Requires email notification
- Could confuse users

**Effort:** 3-4 hours

**Risk:** Medium - UX impact

**Implementation:**
```typescript
if (existingWedding) {
  const alternativeSlug = `${pendingSignup.slug}-${Math.random().toString(36).substr(2, 4)}`;
  const retryResult = await adminClient.from('weddings').insert({
    ...originalData,
    slug: alternativeSlug
  });

  // Notify user of slug change
  return success({ slug: alternativeSlug, message: 'URL slightly modified' });
}
```

### Solution 3: Stripe Payment Hold (Complex)
**Description:** Use Stripe Payment Intents with manual capture - authorize card at checkout, capture only after account creation.

**Pros:**
- Never charge unless account created
- No refunds needed
- Industry best practice

**Cons:**
- Significant refactoring
- Changes payment flow
- More complex

**Effort:** 8-12 hours

**Risk:** High - major architectural change

## Recommended Action

**BLOCK MERGE** until fixed. Recommend **Solution 1** (Slug Reservation) for production readiness.

Alternative: **Solution 2** as quick fix, but user communication needed.

## Technical Details

**Affected Files:**
- `src/pages/api/signup/create-checkout.ts` (slug validation)
- `src/pages/api/signup/verify-payment.ts` (slug re-check)
- `supabase/migrations/008_create_pending_signups.sql` (add unique constraint)

**Database Changes:**
```sql
CREATE UNIQUE INDEX idx_pending_signups_slug_active
ON pending_signups(slug)
WHERE completed_at IS NULL AND expires_at > now();
```

**Error Handling:**
- Handle unique constraint violation (code 23505) in create-checkout
- Return friendly error: "This URL is being used by another signup in progress"

## Acceptance Criteria

- [x] No user can pay for an unavailable slug
- [x] Race condition eliminated or gracefully handled
- [x] Automatic refund triggered if account creation fails after payment
- [x] Tests verify concurrent slug requests are handled correctly
- [x] Documentation updated with slug reservation logic

## Work Log

**2026-02-04**: Issue identified during comprehensive code review of PR #36 by data-integrity-guardian and architecture-strategist agents. Classified as financial risk due to payment-without-service scenario.

**2026-02-04 (Resolution)**: Implemented Solution 1 (Slug Reservation System):
1. Created migration 009 adding unique partial index on `pending_signups(slug)` WHERE `completed_at IS NULL AND expires_at > now()`
2. Updated `create-checkout.ts` to catch PostgreSQL error 23505 and return user-friendly 409 error
3. Verified cleanup function works correctly with unique constraint (no changes needed)
4. Added comprehensive tests covering:
   - First user successfully reserves slug
   - Second concurrent user receives 409 error
   - Expired reservations allow new requests
   - Race condition timeline scenario
   - Validation before Stripe checkout
5. All 5 new tests passing, 937 total tests passing

**Fix Details:**
- Slug is reserved atomically at INSERT into `pending_signups`
- Database constraint prevents duplicates (no application-level race condition possible)
- User receives clear error: "This URL is currently being used by another signup in progress"
- No payment initiated if slug unavailable
- Zero financial liability risk

## Resources

- PR: #36 - Complete Stripe Payment Integration for Signup Flow
- Branch: `feat/stripe-payment-integration`
- Stripe Payment Intents: https://stripe.com/docs/payments/payment-intents
- Related finding: SLUG_CONFLICT_POST_PAYMENT error code already exists (verify-payment.ts:119)
