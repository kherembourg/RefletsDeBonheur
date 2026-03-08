---
status: pending
priority: p1
issue_id: "050"
tags: [code-review, security, stripe, data-integrity]
dependencies: []
---

# Stripe Webhook Silently Fails on Database Updates

## Problem Statement

In 4 webhook event handlers (`subscription.updated`, `subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`), database updates to `profiles` do not check the returned `error` object. If any update fails, the webhook returns 200 OK to Stripe, which will never retry. Payment state in the database becomes permanently inconsistent with Stripe.

Additionally, profile lookups ignore the `error` field — if the query itself errors (not "not found"), `profile` is null and the handler silently skips the update, marking the event as "completed."

The `pending_signups` update on checkout.session.completed also logs but does not throw on failure.

## Findings

- **Source:** Silent Failure Hunter (Issues 1, 2, 3)
- **File:** `src/pages/api/stripe/webhook.ts` lines 130-231 (4 handlers), lines 81-89 (pending signup)
- **Evidence:** No `.error` check on any `adminClient.from('profiles').update(...)` call
- **Impact:** Customer pays but database never reflects "active", or payment fails but user keeps free access

## Proposed Solutions

### Option A: Add error checks and throw on failure (Recommended)
- Check `{ error }` on every profile update and profile lookup
- Throw on error so the outer catch marks event as "failed" and returns 500 for Stripe retry
- **Pros:** Simple, uses existing retry infrastructure
- **Cons:** None
- **Effort:** Small (1h)
- **Risk:** Low

## Acceptance Criteria

- [ ] All 4 profile update calls check `{ error }` and throw on failure
- [ ] All 4 profile lookup calls check `{ error }` and throw on query error (not just null)
- [ ] Pending signup update throws on failure
- [ ] Webhook error status update wrapped in its own try/catch
- [ ] Tests cover DB failure scenarios

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Silent Failure Hunter |
