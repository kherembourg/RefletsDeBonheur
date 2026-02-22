---
status: pending
priority: p3
issue_id: "053"
tags: [code-review, quality, duplication, signup]
dependencies: []
---

# Extract Shared Validation Between create-account.ts and create-checkout.ts

## Problem Statement

~50 lines of validation logic (email, password, slug format, partner names) are duplicated between `create-account.ts` and `create-checkout.ts`. Changes to validation rules must be applied in both places.

## Findings

- **Source:** Code Simplicity Reviewer, Pattern Recognition Specialist, Architecture Strategist
- **Location:** `src/pages/api/signup/create-account.ts`, `src/pages/api/signup/create-checkout.ts`

## Proposed Solutions

### Option A: Extract shared validation to a utility (Recommended)
Create `src/pages/api/signup/validation.ts` with shared validators.
- **Effort:** Medium
- **Risk:** Low

## Acceptance Criteria

- [ ] Shared validation logic extracted to single location
- [ ] Both endpoints use the shared validators
- [ ] All existing tests pass
- [ ] ~40-50 LOC reduction
