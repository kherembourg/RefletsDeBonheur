---
status: complete
priority: p1
issue_id: "029"
tags: [code-review, security, api, pr-30]
dependencies: ["019"]
---

# Client API Calls Missing Authorization Headers

## Problem Statement

The `useWebsiteEditor` hook makes API calls to `/api/customization/save` and `/api/upload/website-image` without sending Authorization headers. This means all production saves will fail with 401 Unauthorized once the server-side auth bypass is fixed (todo #019).

Users will see the "Enregistré" (Saved) status in the UI but their data is **NOT actually persisted** because the API returns an error that's not properly handled.

## Findings

**Location:** `src/hooks/useWebsiteEditor.ts:175-178` and `src/hooks/useWebsiteEditor.ts:347-356`

```typescript
// Save API call - NO Authorization header
const response = await fetch('/api/customization/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // Missing: Authorization
  body: JSON.stringify({ weddingId, customization: data }),
});

// Upload presign call - NO Authorization header
const presignResponse = await fetch('/api/upload/website-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // Missing: Authorization
  body: JSON.stringify({...}),
});
```

**API requirements:** Both endpoints require `Authorization: Bearer <token>` header per `save.ts:34-39`:
```typescript
const authHeader = request.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401 });
}
```

**Impact:**
- Silent data loss - users believe changes are saved when they're not
- Upload failures in production mode
- Broken production workflow

## Proposed Solutions

### Option A: Pass Token via Hook Options (Recommended)
**Pros:** Clean separation, testable, no global state
**Cons:** Requires parent component to provide token
**Effort:** Medium
**Risk:** Low

```typescript
export interface UseWebsiteEditorOptions {
  weddingId: string;
  weddingSlug: string;
  demoMode?: boolean;
  authToken?: string;  // Add this
  // ...
}

// In saveToApi:
const response = await fetch('/api/customization/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  },
  body: JSON.stringify({ weddingId, customization: data }),
});
```

### Option B: Use Supabase Client's getSession
**Pros:** Automatic token management
**Cons:** Couples hook to Supabase client
**Effort:** Small
**Risk:** Medium (Supabase session might not exist)

```typescript
import { supabase } from '../lib/supabase/client';

const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Recommended Action

Option A - Pass token via hook options for clear dependencies

## Technical Details

**Affected files:**
- `src/hooks/useWebsiteEditor.ts`
- `src/pages/admin/website-editor.astro` (to pass token)

## Acceptance Criteria

- [ ] Hook accepts optional `authToken` parameter
- [ ] All API calls include Authorization header when token provided
- [ ] Demo mode continues to work without token (when DEMO_MODE=true on server)
- [ ] Save errors are properly caught and displayed to user
- [ ] website-editor.astro passes auth token to hook

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Data-integrity agent identified API calls missing auth |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
- Related: todo #019 (server-side auth bypass)
