---
status: pending
priority: p2
issue_id: "073"
tags: [code-review, consistency, security]
dependencies: []
---

# Upload Delete Endpoint Missing Zod Validation

## Problem Statement

`/api/upload/delete.ts` uses manual `if (!mediaId)` validation (line 100) instead of the Zod `validateBody()` pattern used by all other API endpoints in this PR. This is an inconsistency that also misses UUID format validation — any string is accepted as a mediaId.

## Findings

**File:** `src/pages/api/upload/delete.ts` lines 97-106

```typescript
const body = await request.json();
const { mediaId } = body;
if (!mediaId) {
  return apiResponse.error('Missing required field', 'mediaId is required', 400);
}
```

Compare with `guest-login.ts`, `presign.ts`, `confirm.ts`, `create-client.ts`, `delete-data.ts`, `export-data.ts` — all use `validateBody(schema, body)`.

## Proposed Solutions

### Option A: Add Zod schema (Recommended)
```typescript
const deleteSchema = z.object({
  mediaId: z.string().uuid('Invalid media ID'),
});
```
- **Effort:** Small | **Risk:** None

## Acceptance Criteria

- [ ] `mediaId` validated with Zod UUID schema
- [ ] Consistent with other API endpoints in the PR
