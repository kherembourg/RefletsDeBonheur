---
status: pending
priority: p2
issue_id: "015"
tags: [code-review, data-integrity, pr-25]
dependencies: []
---

# Count Error Handling Continues Without Enforcing Limits

## Problem Statement

When the count query fails in presign.ts, the code logs the error but continues processing. Since `count` is null, `null ?? 0` evaluates to `0`, effectively disabling the limit check.

## Findings

### From data-integrity-guardian agent:
- **Location**: `src/pages/api/upload/presign.ts` (lines 125-127, 153-155)

```typescript
if (countError) {
  console.error('[API] Error counting photos:', countError);
}  // No return! Continues with potentially null count

if ((photoCount ?? 0) >= TRIAL_PHOTO_LIMIT) {  // null ?? 0 = 0, always passes
```

**Impact**: If database has connectivity issues, trial users can upload unlimited content.

## Proposed Solutions

### Option A: Fail-safe on count errors (RECOMMENDED)
```typescript
if (countError) {
  console.error('[API] Error counting photos:', countError);
  return new Response(JSON.stringify({
    error: 'Database error',
    message: 'Unable to verify upload limits. Please try again.',
  }), { status: 503 });
}
```
**Pros**: Safe default, prevents abuse
**Cons**: Users see error on DB issues
**Effort**: Low
**Risk**: Low

### Option B: Allow uploads but flag for review
Continue but mark uploads as "pending_review"
**Pros**: Better UX
**Cons**: More complex
**Effort**: Medium
**Risk**: Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/upload/presign.ts`

## Acceptance Criteria

- [ ] Count query failures return error response
- [ ] Uploads are not allowed when limits cannot be verified
- [ ] Error message is user-friendly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Fail-open anti-pattern |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
