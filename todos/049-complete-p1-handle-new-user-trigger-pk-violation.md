---
status: pending
priority: p1
issue_id: "049"
tags: [code-review, security, data-integrity, signup, trial]
dependencies: []
---

# handle_new_user Trigger Causes PK Violation in Trial Account Creation

## Problem Statement

The existing `handle_new_user` trigger (from migration 001 or similar) fires on `auth.users` INSERT and automatically creates a row in the `profiles` table. When the `create_trial_account` RPC then tries to INSERT into `profiles` for the same user, it will hit a primary key violation because the row already exists.

This means **100% of trial account creations will fail** in any environment where the trigger is active.

## Findings

- **Source:** Data Integrity Guardian agent
- **Location:** `supabase/migrations/011_trial_account.sql` (line ~30, INSERT INTO profiles)
- **Related:** Existing `handle_new_user` trigger on `auth.users`

The `create_trial_account` function does:
```sql
INSERT INTO profiles (id, email, display_name, subscription_status, subscription_end_date)
VALUES (p_user_id, p_email, ...)
```

But by the time the RPC runs, the trigger has already created a profile row with `id = p_user_id`.

## Proposed Solutions

### Option A: Use INSERT ... ON CONFLICT UPDATE (Recommended)
Change the INSERT in `create_trial_account` to an upsert:
```sql
INSERT INTO profiles (id, email, display_name, subscription_status, subscription_end_date)
VALUES (p_user_id, p_email, ...)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  subscription_status = EXCLUDED.subscription_status,
  subscription_end_date = EXCLUDED.subscription_end_date;
```
- **Pros:** Works regardless of trigger state, idempotent
- **Cons:** Slightly masks trigger behavior
- **Effort:** Small
- **Risk:** Low

### Option B: DROP the trigger and handle profile creation only via RPC
- **Pros:** Single code path for profile creation
- **Cons:** Breaking change if other flows rely on the trigger
- **Effort:** Medium
- **Risk:** Medium (need to audit all auth flows)

### Option C: Check if profile exists first, then UPDATE or INSERT
- **Pros:** Explicit control
- **Cons:** Race condition between check and insert, more code
- **Effort:** Small
- **Risk:** Medium

## Recommended Action

Option A — upsert is safest and simplest.

## Acceptance Criteria

- [ ] Trial account creation succeeds when `handle_new_user` trigger exists
- [ ] Existing Stripe payment flow still works
- [ ] Profile has correct `subscription_status = 'trial'` and `subscription_end_date`
- [ ] All tests pass
