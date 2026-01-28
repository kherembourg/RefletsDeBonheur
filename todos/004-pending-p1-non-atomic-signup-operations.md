---
status: pending
priority: p1
issue_id: "004"
tags: [code-review, data-integrity, pr-25]
dependencies: []
---

# Non-Atomic Multi-Table Operations in Signup

## Problem Statement

The signup flow creates records across 3 tables (auth.users, profiles, weddings) without a database transaction. If any step fails, cleanup may also fail, leaving orphaned records.

## Findings

### From data-integrity-guardian agent:
- **Location**: `src/pages/api/signup.ts` (lines 153-272)
- Operations are sequential without transaction:
  1. Create `auth.users` record (line 153)
  2. Create `profiles` record (line 191)
  3. Create `weddings` record (line 220)
- Cleanup code exists but has no error handling

```typescript
if (profileError) {
  // Cleanup: delete the auth user since profile creation failed
  await adminClient.auth.admin.deleteUser(userId);  // No error handling!
  return new Response(...)
}
```

**Data Corruption Scenario:**
1. User created in auth.users successfully
2. Profile creation fails (e.g., network timeout)
3. Cleanup deleteUser() also fails
4. Result: Orphaned auth.users record

## Proposed Solutions

### Option A: Add robust cleanup with retry
```typescript
if (profileError) {
  let attempts = 0;
  while (attempts < 3) {
    try {
      await adminClient.auth.admin.deleteUser(userId);
      break;
    } catch (e) {
      attempts++;
      await new Promise(r => setTimeout(r, 100 * attempts));
    }
  }
  if (attempts === 3) {
    console.error('[CRITICAL] Orphaned user:', userId);
  }
}
```
**Pros**: Handles transient failures
**Cons**: Still not atomic
**Effort**: Low
**Risk**: Low

### Option B: Postgres function for atomic signup
Create a stored procedure that handles all operations in a transaction
**Pros**: True atomicity
**Cons**: More complex, requires migration
**Effort**: High
**Risk**: Medium

### Option C: Scheduled cleanup job
Run periodic job to find and delete orphaned records
**Pros**: Catches all edge cases
**Cons**: Delayed cleanup, adds infrastructure
**Effort**: Medium
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/signup.ts`

## Acceptance Criteria

- [ ] Cleanup operations have proper error handling
- [ ] Failed cleanups are logged with user ID for manual intervention
- [ ] No orphaned records can be created under normal failure conditions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by data-integrity-guardian agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
