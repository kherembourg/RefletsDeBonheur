---
status: done
priority: p3
issue_id: "037"
tags: [code-quality, code-review, payment-integration, pr-36, refactoring]
dependencies: []
completed_at: 2026-02-04
---

# Email Validation Logic Duplicated Across 4 Files

## Problem Statement

Email validation regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is duplicated across 4 different files. If validation rules change (e.g., to support internationalized email addresses), all 4 locations must be updated, creating high risk of divergence and bugs.

**Why This Matters:**
- DRY principle violation
- High maintenance burden
- Risk of inconsistent validation
- If one file is updated and others aren't, subtle bugs emerge

## Findings

**Locations:**
1. `src/pages/api/signup/create-checkout.ts:77`
2. `src/pages/api/signup.ts:76`
3. `src/components/signup/steps/AccountStep.tsx:32`
4. `src/test/functional/payment-flow.test.ts:344,349`

**Evidence:**
```typescript
// Duplicated 4 times:
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailPattern.test(email)) {
  return error('Invalid email');
}
```

**Impact:**
- 62 lines of duplicated validation code
- If email rules change, 4 files to update
- Frontend and backend validation could diverge

**Reviewers Identified:** pattern-recognition-specialist, kieran-rails-reviewer

## Proposed Solutions

### Solution 1: Extract to Shared Utility (Recommended)
**Description:** Create `/src/lib/validation/emailValidation.ts` with reusable functions.

**Pros:**
- Single source of truth
- Easy to update rules
- Consistent validation everywhere

**Cons:**
- Need to update imports in 4 files

**Effort:** 1-2 hours

**Risk:** Low

**Implementation:**
```typescript
// src/lib/validation/emailValidation.ts
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function validateEmailWithMessage(email: string, lang: Language) {
  if (!email) return { valid: false, message: t(lang, 'errors.emailRequired') };
  if (!isValidEmail(email)) return { valid: false, message: t(lang, 'errors.emailInvalid') };
  return { valid: true };
}

// Usage:
import { isValidEmail, validateEmailWithMessage } from '@/lib/validation/emailValidation';
```

## Recommended Action

Implement after P1/P2 issues resolved. Good refactoring opportunity to improve code quality.

## Technical Details

**Files to Update:**
- Create: `src/lib/validation/emailValidation.ts`
- Modify: `src/pages/api/signup/create-checkout.ts`
- Modify: `src/pages/api/signup.ts`
- Modify: `src/components/signup/steps/AccountStep.tsx`
- Modify: `src/test/functional/payment-flow.test.ts`

**Additional Benefit:**
Can strengthen validation to reject edge cases:
- `test@example..com` (double dots) - currently allowed
- `test@@example.com` (double @) - currently allowed
- `test@-example.com` (hyphen at start) - currently allowed

## Acceptance Criteria

- [x] Single email validation utility exported
- [x] All 4 files import from shared utility
- [x] No duplicated regex patterns
- [x] Tests verify validation is consistent
- [x] Documentation updated

## Work Log

**2026-02-04**: Issue identified during code pattern analysis of PR #36 by pattern-recognition-specialist agent.

**2026-02-04**: Completed implementation:
- Created `/src/lib/validation/emailValidation.ts` with `isValidEmail()` and `validateEmailWithMessage()` functions
- Exported `EMAIL_PATTERN` constant for direct access
- Updated all 4 files to import and use shared utility:
  - `src/pages/api/signup/create-checkout.ts`
  - `src/pages/api/signup.ts`
  - `src/components/signup/steps/AccountStep.tsx`
  - `src/test/functional/payment-flow.test.ts`
- Removed all duplicated email regex patterns
- Added comprehensive test suite (11 tests) covering:
  - Valid email formats
  - Invalid email formats
  - Edge cases (null, undefined, whitespace)
  - Custom error messages
  - Whitespace trimming
- All tests passing (952/952 tests pass)
- API endpoint tests verified (30/30 tests pass)

## Resources

- PR: #36 - Complete Stripe Payment Integration for Signup Flow
- Related: Slug validation also duplicated but already has shared utility (`slugValidation.ts`)
