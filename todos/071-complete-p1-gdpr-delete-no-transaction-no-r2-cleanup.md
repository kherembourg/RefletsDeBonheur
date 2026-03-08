---
status: pending
priority: p1
issue_id: "071"
tags: [code-review, security, data-integrity, gdpr]
dependencies: []
---

# GDPR Delete Endpoint: No Transaction + No R2 Object Cleanup

## Problem Statement

`/api/gdpr/delete-data.ts` performs 5 sequential DELETE operations without a database transaction. If any intermediate step fails, the data is left in an inconsistent state (partial deletion). Additionally, R2 storage objects are never deleted — only database records — leaving orphaned files in cloud storage indefinitely.

## Findings

**File:** `src/pages/api/gdpr/delete-data.ts`

1. **No transaction**: Lines 81-112 perform 5 sequential deletes (media, guestbook_messages, rsvps, guest_sessions, weddings). If the wedding delete fails (line 109-121), child records are already gone but the wedding record persists — a partial deletion state.

2. **No R2 cleanup**: Media DB records are deleted (line 81-85) but the corresponding R2 objects (photos/videos) are never cleaned up. The `deleteR2MediaFiles()` helper exists in `src/lib/r2/deleteMedia.ts` but is not called. This leaves potentially gigabytes of orphaned files.

3. **No profile/auth cleanup**: The endpoint deletes wedding data but not the user's `profiles` record or `auth_sessions`. The user account persists even after "deleting all data."

## Proposed Solutions

### Option A: Add transaction + R2 cleanup (Recommended)
- Use Supabase RPC or a stored procedure to wrap all deletes in a single transaction
- Before deleting media DB records, fetch URLs and call `deleteR2MediaFiles()` for each
- Add profile deletion or clearly document that account deletion is separate
- **Effort:** Medium | **Risk:** Low

### Option B: Best-effort with rollback info
- Keep sequential deletes but return detailed info about what was/wasn't deleted
- Add a separate R2 cleanup job that runs periodically
- **Effort:** Small | **Risk:** Medium (orphaned data remains)

## Technical Details

**Affected files:**
- `src/pages/api/gdpr/delete-data.ts`

## Acceptance Criteria

- [ ] All deletes wrapped in a transaction (or atomic RPC)
- [ ] R2 objects deleted before or alongside DB records
- [ ] Partial failure returns clear error with rollback
- [ ] Profile/auth session cleanup addressed (or documented as separate)
