---
status: pending
priority: p1
issue_id: "052"
tags: [code-review, security, auth, api]
dependencies: []
---

# /api/admin/create-client Has No Authentication

## Problem Statement

The `create-client` API endpoint has zero authentication or authorization checks. Any unauthenticated user can create unlimited Supabase Auth users, profiles with trial subscriptions, and weddings with any slug. Also lacks rate limiting.

Additionally, if profile creation succeeds but wedding creation fails, there is no cleanup of the orphaned auth user and profile (unlike `signup.ts` which has proper retry cleanup).

## Findings

- **Source:** Security Sentinel (H3), Silent Failure Hunter (Issue 11)
- **File:** `src/pages/api/admin/create-client.ts`
- **Evidence:** No session token check, no auth header validation. Compare with `create-token.ts` which checks `godAdminId` + `sessionToken`.

## Proposed Solutions

### Option A: Add god admin session verification (Recommended)
- Add `godAdminId` and `sessionToken` verification (same pattern as `create-token.ts`)
- Add rate limiting
- Add cleanup logic for partial failures (same as `signup.ts`)
- **Effort:** Small (1-2h)
- **Risk:** Low

## Acceptance Criteria

- [ ] Endpoint requires valid god admin session
- [ ] Rate limiting applied
- [ ] Cleanup on partial failure (auth user + profile deleted if wedding creation fails)
- [ ] Unauthenticated requests return 401

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Security Sentinel + Silent Failure Hunter |
