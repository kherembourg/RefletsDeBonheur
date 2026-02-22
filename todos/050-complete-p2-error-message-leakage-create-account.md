---
status: pending
priority: p2
issue_id: "050"
tags: [code-review, security, signup, trial]
dependencies: []
---

# Error Message Information Leakage in create-account.ts

## Problem Statement

The outer catch block in `create-account.ts` may return raw error messages from Supabase to the client, potentially leaking internal implementation details.

## Findings

- **Source:** Security Sentinel agent
- **Location:** `src/pages/api/signup/create-account.ts` (outer catch block)

## Proposed Solutions

### Option A: Generic error message in outer catch (Recommended)
Return a generic "An error occurred" message instead of `error.message`.
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] Outer catch returns generic error message
- [ ] Internal error is logged server-side for debugging
- [ ] No Supabase-specific error details reach the client
