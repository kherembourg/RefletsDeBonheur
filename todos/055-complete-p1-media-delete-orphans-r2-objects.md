---
status: pending
priority: p1
issue_id: "055"
tags: [code-review, data-integrity, storage, gdpr]
dependencies: []
---

# Media Deletion Does Not Remove R2 Objects

## Problem Statement

`mediaApi.delete()` deletes the database row but never calls `deleteFile()` from the R2 client. Every deleted photo/video leaves orphaned files in R2 storage permanently. This is also a GDPR right-to-erasure violation — if an owner deletes a photo for privacy reasons, the file remains accessible via its direct R2 URL.

Same issue applies to wedding deletion via `ON DELETE CASCADE` — media rows deleted but R2 objects remain.

Also: orphaned R2 files accumulate when upload confirm fails (file uploaded to R2 but DB record never created).

## Findings

- **Source:** Data Integrity Guardian (C1), Silent Failure Hunter (Issue 10), Architecture Strategist
- **Files:** `src/lib/supabase/api.ts` lines 273-280, `src/lib/r2/client.ts` line 199 (`deleteFile` exists but never called)
- **Evidence:** `deleteFile()` function exists but grep shows zero callers

## Proposed Solutions

### Option A: Add R2 deletion to media delete flow (Recommended)
- Call `deleteFile()` for original + thumbnail when deleting media
- Add a cleanup job for orphaned R2 files (keys not referenced in media table)
- **Effort:** Medium (2-3h)
- **Risk:** Low

## Acceptance Criteria

- [ ] `mediaApi.delete()` also deletes R2 objects (original + thumbnail)
- [ ] Wedding deletion cascade triggers R2 cleanup
- [ ] Orphaned R2 file cleanup mechanism exists (cron or admin tool)
- [ ] Tests verify R2 files are deleted with media records

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by 3 agents independently |
