---
status: pending
priority: p2
issue_id: "065"
tags: [code-review, security, auth]
dependencies: []
---

# Guest Session Expiry Not Validated on Uploads

## Problem Statement

Both upload endpoints (`presign.ts`, `confirm.ts`) validate guest sessions by matching `session_token` and `wedding_id`, but neither checks `expires_at`. An expired guest session token still authorizes uploads indefinitely.

## Findings

- **Source:** Data Integrity Guardian (C3)
- **Files:** `src/pages/api/upload/presign.ts` lines 61-69, `src/pages/api/upload/confirm.ts` lines 172-183
- **Evidence:** Query lacks `.gt('expires_at', new Date().toISOString())`

## Proposed Solutions

### Option A: Add expiry check to queries (Recommended)
Add `.gt('expires_at', new Date().toISOString())` to guest session queries.
- **Effort:** Tiny (15 min)
- **Risk:** None

## Acceptance Criteria

- [ ] Both presign and confirm check `expires_at` on guest sessions
- [ ] Expired sessions return 401
- [ ] Tests cover expired session scenario

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Data Integrity Guardian |
