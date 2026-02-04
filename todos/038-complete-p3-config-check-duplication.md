---
status: complete
priority: p3
issue_id: "038"
tags: [code-quality, code-review, refactoring, technical-debt]
dependencies: []
completed_at: 2026-02-04
---

# Configuration Checks Duplicated Across 18 API Endpoints

## Problem Statement

Configuration validation (Supabase, Stripe, service role) is duplicated verbatim across 18 API endpoint files, totaling ~540 lines of identical code. This creates significant maintenance burden - any change to error messages or logic must be replicated 18 times.

**Why This Matters:**
- DRY principle violation at scale (540 LoC duplication)
- High maintenance burden
- Risk of inconsistent error handling
- Code review overhead

## Findings

**Pattern Duplicated 18 Times:**
```typescript
if (!isSupabaseConfigured()) {
  return new Response(JSON.stringify({
    error: 'Database not configured',
    message: 'Supabase is not configured. Please check your environment variables.',
  }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}

if (!isStripeConfigured()) {
  return new Response(JSON.stringify({
    error: 'Stripe not configured',
    message: 'Stripe is not configured. Please check STRIPE_SECRET_KEY.',
  }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}
```

**Files Affected:** All API endpoints in `/src/pages/api/`
- `signup/create-checkout.ts`
- `signup/verify-payment.ts`
- `stripe/webhook.ts`
- `upload/presign.ts`
- `upload/confirm.ts`
- ... and 13 more

**Impact:**
- ~30 lines per file × 18 files = **540 lines of duplication**
- Changing error message requires updating 18 files
- Risk of inconsistency if one file missed

**Reviewers Identified:** pattern-recognition-specialist, kieran-rails-reviewer

## Proposed Solutions

### Solution 1: API Middleware Pattern (Recommended)
**Description:** Extract configuration checks into reusable middleware functions.

**Pros:**
- Single source of truth
- Reduces file size by 30-40%
- Easy to add new checks
- Consistent error responses

**Cons:**
- Requires refactoring all 18 endpoints
- New pattern to learn

**Effort:** 4-6 hours

**Risk:** Low

**Implementation:**
```typescript
// src/lib/api/middleware.ts
export const apiGuards = {
  requireSupabase: () => {
    if (!isSupabaseConfigured()) {
      return new Response(JSON.stringify({
        error: 'Database not configured',
        message: 'Supabase is not configured.',
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    return null; // No error
  },

  requireStripe: () => { /* similar */ },
  requireServiceRole: () => { /* similar */ },
};

export const apiResponse = {
  success: (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  error: (error: string, message: string, status: number, field?: string) => {
    return new Response(JSON.stringify({ error, message, field }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  },
};

// Usage in endpoints:
export const POST: APIRoute = async ({ request }) => {
  const guard = apiGuards.requireSupabase();
  if (guard) return guard;

  const stripeGuard = apiGuards.requireStripe();
  if (stripeGuard) return stripeGuard;

  // Main logic...
  return apiResponse.success({ sessionId, url });
};
```

## Recommended Action

Implement after P1/P2 issues resolved. Significant code quality improvement with moderate effort.

## Technical Details

**Files to Create:**
- `src/lib/api/middleware.ts`

**Files to Update:** All 18 API endpoints
- `src/pages/api/signup/create-checkout.ts`
- `src/pages/api/signup/verify-payment.ts`
- `src/pages/api/stripe/webhook.ts`
- ... and 15 more

**Expected Outcome:**
- Each API file reduced by ~30 lines
- Total codebase reduced by ~540 lines
- Consistent error handling across all endpoints

## Acceptance Criteria

- [x] API middleware created
- [x] All 18 endpoints refactored to use middleware
- [x] No duplicated config checks
- [x] Tests verify error responses unchanged
- [x] Response format consistent across endpoints
- [x] Documentation updated

## Work Log

**2026-02-04**: Issue identified during code pattern analysis by pattern-recognition-specialist agent. Classified as P3 due to technical debt impact.

**2026-02-04**: Issue resolved. Created middleware module (`src/lib/api/middleware.ts`) with configuration guards and response helpers. Refactored all API endpoints to use the new pattern. Reduced codebase by ~540 lines of duplication. All tests pass (960 passing tests).

## Resources

- PR: #36 - Complete Stripe Payment Integration for Signup Flow
- Related: Similar pattern needed for rate limiting, CSRF checks
- Pattern: API middleware is industry standard (Express.js, Koa, etc.)
