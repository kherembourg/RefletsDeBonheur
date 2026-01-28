---
status: pending
priority: p1
issue_id: "005"
tags: [code-review, data-integrity, pr-25]
dependencies: ["004"]
---

# Slug Race Condition (TOCTOU Vulnerability)

## Problem Statement

Time-of-check to time-of-use (TOCTOU) race condition exists between slug availability check and wedding creation. Two concurrent signups with the same slug can both pass validation, then one fails on insert, leaving orphaned user+profile records.

## Findings

### From data-integrity-guardian agent:
- **Location**: `src/pages/api/signup.ts` (lines 131-147, 220-259)
- Slug check is not atomic with the insert

**Race Condition Scenario:**
```
Request A: check-slug("marie-jean") -> available
Request B: check-slug("marie-jean") -> available
Request A: creates user, profile...
Request B: creates user, profile...
Request A: INSERT wedding -> SUCCESS
Request B: INSERT wedding -> UNIQUE VIOLATION
Request B: Cleanup user+profile (may fail) -> Orphaned records
```

The database UNIQUE constraint on `weddings.slug` will prevent duplicate slugs, but cleanup of user+profile may fail.

## Proposed Solutions

### Option A: Handle unique constraint violation explicitly
```typescript
if (weddingError?.code === '23505' && weddingError.message?.includes('slug')) {
  // Slug conflict - cleanup with retry
  await cleanupWithRetry(userId);
  return new Response(JSON.stringify({
    error: 'Slug taken',
    field: 'slug',
    message: 'This URL was just taken. Please choose another.',
  }), { status: 409 });
}
```
**Pros**: Simple, handles the specific case
**Cons**: Still creates orphaned records if cleanup fails
**Effort**: Low
**Risk**: Low

### Option B: Use database advisory lock
Lock on slug hash during the entire signup process
**Pros**: Prevents race entirely
**Cons**: Adds complexity, potential deadlocks
**Effort**: Medium
**Risk**: Medium

### Option C: Atomic signup with Postgres function
Same as todo #004 - handles all race conditions
**Pros**: Complete solution
**Cons**: Significant refactor
**Effort**: High
**Risk**: Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/signup.ts`

## Acceptance Criteria

- [ ] Unique constraint violations on slug are handled gracefully
- [ ] User receives helpful error message to try different slug
- [ ] No orphaned records created on slug conflicts
- [ ] Cleanup includes retry logic

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by data-integrity-guardian agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
- TOCTOU: https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use
