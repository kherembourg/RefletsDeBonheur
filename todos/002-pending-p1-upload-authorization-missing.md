---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security, pr-25]
dependencies: []
---

# Upload Endpoints Lack Authorization

## Problem Statement

The `/api/upload/presign` and `/api/upload/confirm` endpoints accept any `weddingId` without verifying the requester has legitimate access. An attacker who guesses or enumerates a wedding ID can upload arbitrary content.

## Findings

### From security-sentinel agent:
- **Location**: `src/pages/api/upload/presign.ts` (lines 46-73)
- **Evidence**: Only validates presence of `weddingId`, not authorization
- Checks subscription status but not WHO is uploading
- Trial limits can be bypassed by uploading to other weddings

```typescript
const { weddingId, fileName, contentType, guestIdentifier } = body;
if (!weddingId || !fileName || !contentType) {
  // Only validates presence, not authorization
}
```

## Proposed Solutions

### Option A: Session-based authorization
Verify the requester's session belongs to the wedding owner:
```typescript
const session = await getSession(request);
if (session?.userId !== wedding.owner_id) {
  return new Response('Unauthorized', { status: 401 });
}
```
**Pros**: Strong authorization
**Cons**: Blocks guest uploads (intentional feature)
**Effort**: Low
**Risk**: Medium (may break guest upload feature)

### Option B: Guest session validation
Check `guestIdentifier` against valid `guest_sessions` table:
```typescript
const { data: guestSession } = await adminClient
  .from('guest_sessions')
  .select('wedding_id')
  .eq('session_token', guestIdentifier)
  .eq('wedding_id', weddingId)
  .single();
```
**Pros**: Supports both owner and guest uploads
**Cons**: More complex
**Effort**: Medium
**Risk**: Low

### Option C: Signed upload tokens
Generate short-lived signed tokens for upload authorization
**Pros**: Stateless, secure
**Cons**: More architectural change
**Effort**: High
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/upload/presign.ts`
- `src/pages/api/upload/confirm.ts`

## Acceptance Criteria

- [ ] Presign endpoint verifies requester has access to the wedding
- [ ] Confirm endpoint verifies requester has access to the wedding
- [ ] Guest uploads still work with valid PIN/session
- [ ] Owner uploads work with valid auth session
- [ ] Unauthorized requests return 401/403

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by security-sentinel agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
