---
status: pending
priority: p2
issue_id: "075"
tags: [code-review, security, auth]
dependencies: []
---

# Session Cookie Not HttpOnly — Accessible to XSS

## Problem Statement

The session cookie `reflets_session_token` is set via `document.cookie` in client-side JavaScript (`clientAuth.ts`). This means the cookie is NOT `HttpOnly` and can be read/stolen by any XSS attack. The cookie contains the raw session token used for server-side authentication.

## Findings

**File:** `src/lib/auth/clientAuth.ts` lines 27-30

```typescript
function setSessionCookie(token: string, maxAgeHours: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeHours * 60 * 60;
  document.cookie = `${SESSION_COOKIE_NAME}=${token}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
}
```

The cookie has `SameSite=Lax` and `Secure` (good), but is missing `HttpOnly` because it's set from JavaScript. This is a fundamental limitation — to set `HttpOnly`, the cookie must be set from the server (via `Set-Cookie` response header).

Currently the cookie duplicates the token already in localStorage, so XSS can steal it from either location. However, the long-term goal should be to move auth to HttpOnly cookies.

## Proposed Solutions

### Option A: Set cookie from server login response (Recommended)
- Have the `/api/auth/client-login` endpoint return a `Set-Cookie` header with `HttpOnly; Secure; SameSite=Lax`
- Remove client-side `document.cookie` manipulation
- **Effort:** Medium | **Risk:** Low

### Option B: Accept current limitation, document it
- The token is already in localStorage (same XSS exposure)
- `HttpOnly` cookie would require architectural changes to all auth flows
- Add a comment documenting why this isn't HttpOnly
- **Effort:** Small | **Risk:** Accepted risk

## Acceptance Criteria

- [ ] Session cookie is HttpOnly (Option A) or risk is documented (Option B)
