---
status: pending
priority: p3
issue_id: "077"
tags: [code-review, consistency, stripe]
dependencies: []
---

# Webhook checkout.session.completed Doesn't Throw on DB Error

## Problem Statement

The `checkout.session.completed` handler in `webhook.ts` logs DB errors but doesn't throw, unlike all other handlers (`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`). This means a failed profile update silently succeeds — the event is marked "completed" even though the subscription wasn't activated.

## Findings

**File:** `src/pages/api/stripe/webhook.ts` lines 86-89, 115-118

```typescript
// checkout.session.completed — logs but continues
if (error) {
  console.error('[Webhook] Failed to update profile:', error);
  // Missing: throw new Error(...)
}
```

vs. all other handlers:
```typescript
if (updateError) {
  throw new Error(`Failed to update subscription for profile ${profile.id}: ${updateError.message}`);
}
```

## Proposed Solutions

### Option A: Throw on error like other handlers (Recommended)
- **Effort:** Small | **Risk:** None

## Acceptance Criteria

- [ ] `checkout.session.completed` throws on DB update failure
- [ ] Event is marked as "failed" when the update doesn't persist
