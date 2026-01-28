---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, data-integrity, performance, pr-25]
dependencies: []
---

# Trial Limit Race Condition in Upload Flow

## Problem Statement

The trial limit check in `/api/upload/presign` is not atomic with the actual upload. Multiple concurrent uploads can all pass the limit check (showing 49 photos), then all upload successfully (resulting in 52+ photos).

## Findings

### From data-integrity-guardian and performance-oracle agents:
- **Location**: `src/pages/api/upload/presign.ts` (lines 117-143)
- Check-then-act is not atomic

**Race Condition Scenario:**
```
Trial limit: 50 photos
Current count: 49

Request A: COUNT(*) = 49 -> generate presigned URL
Request B: COUNT(*) = 49 -> generate presigned URL
Request C: COUNT(*) = 49 -> generate presigned URL
Request A: uploads file -> count = 50
Request B: uploads file -> count = 51 (OVER LIMIT)
Request C: uploads file -> count = 52 (OVER LIMIT)
```

## Proposed Solutions

### Option A: Database trigger to enforce limits
```sql
CREATE FUNCTION check_trial_limits() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT subscription_status FROM profiles WHERE id = NEW.wedding_owner_id) = 'trial' THEN
    IF (SELECT COUNT(*) FROM media WHERE wedding_id = NEW.wedding_id AND type = 'photo') >= 50 THEN
      RAISE EXCEPTION 'Trial photo limit exceeded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
**Pros**: Database-level enforcement, atomic
**Cons**: Requires migration
**Effort**: Medium
**Risk**: Low

### Option B: Advisory lock during upload
Lock on wedding_id during the entire upload flow
**Pros**: Prevents race
**Cons**: Sequential uploads, performance impact
**Effort**: Low
**Risk**: Medium

### Option C: Optimistic concurrency with version check
Track media count in weddings table, use version checking
**Pros**: Fast, handles races
**Cons**: More complex
**Effort**: High
**Risk**: Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/upload/presign.ts`
- `src/pages/api/upload/confirm.ts`
- Possibly new migration for database trigger

## Acceptance Criteria

- [ ] Concurrent uploads cannot exceed trial limits
- [ ] Error message is user-friendly when limit exceeded
- [ ] Performance impact is acceptable

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Business logic issue, not data corruption |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
