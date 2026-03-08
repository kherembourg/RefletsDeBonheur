---
status: pending
priority: p2
issue_id: "072"
tags: [code-review, security, csrf]
dependencies: []
---

# CSRF Check Bypassable via User-Agent Spoofing

## Problem Statement

The CSRF origin validation in `middleware.ts` (lines 49-68) only requires an Origin header for "browser" requests, detected by checking if User-Agent contains "Mozilla", "Chrome", or "Safari". An attacker can bypass this by sending requests with a non-browser User-Agent (e.g., `curl` or a custom string), making the CSRF protection ineffective for targeted attacks.

## Findings

**File:** `src/middleware.ts` lines 50-57

```typescript
const isBrowser =
  userAgent.includes('Mozilla') ||
  userAgent.includes('Chrome') ||
  userAgent.includes('Safari');

if (isBrowser && !isStripeWebhook) {
  // Only block browser requests without Origin
}
```

The Stripe webhook exception (`stripe-signature` header) is correct. But the User-Agent sniffing allows any non-browser tool to skip Origin validation entirely.

## Proposed Solutions

### Option A: Require Origin for ALL non-webhook requests (Recommended)
- Remove the User-Agent check entirely
- Only exempt requests with a valid `stripe-signature` header
- If this breaks server-to-server calls, add a shared API key header instead
- **Effort:** Small | **Risk:** Low (may break API calls without Origin)

### Option B: Use SameSite cookie + CSRF token
- Add a CSRF token to forms and API calls
- Rely on SameSite=Lax cookies for session auth (already in place)
- Origin check becomes defense-in-depth rather than primary protection
- **Effort:** Medium | **Risk:** Low

## Technical Details

**Affected files:**
- `src/middleware.ts`

## Acceptance Criteria

- [ ] CSRF protection cannot be bypassed by changing User-Agent
- [ ] Stripe webhooks still work
- [ ] Server-to-server API calls (if any) have an alternative auth mechanism
