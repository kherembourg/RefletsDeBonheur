---
status: complete
priority: p2
issue_id: "043"
tags: [code-review, bug, stripe, pr-49, pr-51]
dependencies: []
---

# checkout.ts Missing Critical Imports on Main Branch

## Problem Statement

`src/pages/api/stripe/checkout.ts` on the `main` branch uses `isSupabaseConfigured`, `isSupabaseServiceRoleConfigured`, `getSupabaseAdminClient`, `isStripeConfigured`, `getStripeClient`, and `PRODUCT_CONFIG` but **never imports them**. This means the Stripe checkout endpoint throws `ReferenceError` at runtime.

Both PR #49 and PR #51 independently fix this by adding the imports, which will cause a merge conflict.

## Findings

**Source:** Security sentinel (MEDIUM-3), Architecture strategist, TypeScript reviewer, Code simplicity reviewer

## Proposed Solutions

### Option A: Merge PR #49 first, rebase PR #51 (Recommended)
PR #49 adds both rate-limiting imports AND the missing function imports. After merging, PR #51 needs to be rebased and its duplicate import additions dropped.

### Option B: Create a separate hotfix PR
Extract the import fix into a tiny PR, merge it first, then rebase both #49 and #51.

## Acceptance Criteria

- [ ] checkout.ts has all required imports on main
- [ ] No merge conflicts between PR #49 and #51
- [ ] Checkout endpoint works at runtime

## Resources

- PR #49: feat/rate-limiting-signup
- PR #51: feat/test-coverage-improvement
