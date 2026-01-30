---
status: complete
priority: p1
issue_id: "019"
tags: [code-review, security, api, pr-30]
dependencies: []
---

# Authentication Bypass in Demo/Development Mode

## Problem Statement

The `/api/upload/website-image` endpoint allows file uploads without authentication when no Authorization header is provided. The code explicitly allows this with the comment "For demo mode or development, we allow uploads without auth."

This is a **critical security vulnerability** that allows anyone to upload files to any wedding's R2 storage simply by not providing an auth header.

## Findings

**Location:** `src/pages/api/upload/website-image.ts:160-217`

```typescript
// Check authorization via Supabase auth token
const authHeader = request.headers.get('Authorization');
if (authHeader?.startsWith('Bearer ')) {
  // ... auth check happens here
}
// Note: For demo mode or development, we allow uploads without auth
```

**Impact:**
- Storage exhaustion attacks
- Content injection (uploading malicious/inappropriate images)
- Cost escalation (R2 storage costs)
- Unauthorized access to any wedding's storage

**Exploitability:** HIGH - Trivial to exploit

## Proposed Solutions

### Option A: Require Auth, Explicit Demo Mode Flag (Recommended)
**Pros:** Secure by default, clear intent
**Cons:** Requires env var configuration
**Effort:** Small
**Risk:** Low

```typescript
const isDemoMode = import.meta.env.DEMO_MODE === 'true';

if (!isDemoMode) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // ... verify token
}
```

### Option B: Always Require Auth
**Pros:** Simplest, most secure
**Cons:** Demo mode won't work without auth
**Effort:** Small
**Risk:** Breaks demo functionality

## Recommended Action

Option A - Require explicit DEMO_MODE=true environment variable

## Technical Details

**Affected files:**
- `src/pages/api/upload/website-image.ts`

## Acceptance Criteria

- [ ] API returns 401 when Authorization header is missing (unless DEMO_MODE=true)
- [ ] DEMO_MODE environment variable is documented
- [ ] Existing authenticated uploads continue to work
- [ ] Tests added for auth enforcement

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Security-sentinel agent identified this |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
- Similar pattern in presign.ts for reference
