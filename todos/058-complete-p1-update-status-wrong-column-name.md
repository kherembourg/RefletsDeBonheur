---
status: pending
priority: p1
issue_id: "058"
tags: [code-review, bug, api]
dependencies: []
---

# god/update-status.ts Uses Wrong Column Name

## Problem Statement

The god admin `update-status` endpoint queries `.eq('session_token', sessionToken)` but the `auth_sessions` table column is `token`, not `session_token`. This means session verification ALWAYS fails, making the endpoint non-functional. God admins cannot change client subscription statuses.

## Findings

- **Source:** Silent Failure Hunter (Issue 12)
- **File:** `src/pages/api/god/update-status.ts` line 49
- **Evidence:** Compare with `god/create-token.ts` line 47 which correctly uses `.eq('token', sessionToken)`

## Proposed Solutions

### Option A: Fix column name (Recommended)
Change `'session_token'` to `'token'` on line 49.
- **Effort:** Tiny (5 min)
- **Risk:** None

## Acceptance Criteria

- [ ] Column name changed to `'token'`
- [ ] God admin can update client status through dashboard
- [ ] Test covers the endpoint

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Silent Failure Hunter |
