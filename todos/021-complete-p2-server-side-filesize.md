---
status: complete
priority: p2
issue_id: "021"
tags: [code-review, security, validation, pr-30]
dependencies: []
---

# Missing Server-Side File Size Validation

## Problem Statement

The 5MB file size limit for website images is only enforced client-side. The API endpoint does not validate file size, allowing attackers to bypass client validation and upload large files.

## Findings

**Client-side validation exists:**
`src/hooks/useWebsiteEditor.ts:336-340`
```typescript
const maxSize = 5 * 1024 * 1024;
if (file.size > maxSize) {
  throw new Error(`Fichier trop volumineux. Maximum 5 Mo.`);
}
```

**Server-side validation missing:**
`src/pages/api/upload/website-image.ts` - No Content-Length check

**Impact:**
- Storage cost escalation
- Potential denial of service via storage exhaustion
- Bypasses intended limits

## Proposed Solutions

### Option A: Validate Content-Length Header (Recommended)
**Pros:** Simple, catches most cases
**Cons:** Header can be spoofed
**Effort:** Small
**Risk:** Low

```typescript
const contentLength = request.headers.get('Content-Length');
if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
  return new Response(
    JSON.stringify({
      error: 'File too large',
      message: 'Website images must be under 5MB',
    }),
    { status: 413, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Option B: Accept fileSize in Request Body
**Pros:** More reliable than header
**Cons:** Requires API change
**Effort:** Small
**Risk:** Low

Add `fileSize` to request body and validate it.

## Recommended Action

Option A combined with accepting fileSize in request body for redundancy

## Technical Details

**Affected files:**
- `src/pages/api/upload/website-image.ts`

## Acceptance Criteria

- [ ] API validates file size from Content-Length header
- [ ] API returns 413 Payload Too Large for files > 5MB
- [ ] Error message is clear and user-friendly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Server should never trust client-side validation |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
