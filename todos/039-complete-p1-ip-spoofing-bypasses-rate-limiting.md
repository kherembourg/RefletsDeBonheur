---
status: complete
priority: p1
issue_id: "039"
tags: [code-review, security, rate-limiting, pr-49]
dependencies: []
---

# IP Spoofing Bypasses Rate Limiting

## Problem Statement

The `getClientIP()` function in `rateLimit.ts` checks `X-Forwarded-For` header before `cf-connecting-ip`, allowing any attacker to bypass rate limiting by sending a different forged IP address with every request.

Since the platform uses Cloudflare, the `cf-connecting-ip` header is set server-side and cannot be spoofed. But because `X-Forwarded-For` is checked first, an attacker can override it.

## Findings

**Source:** Security sentinel (HIGH-1), Performance oracle (HIGH)

- File: `src/lib/rateLimit.ts` lines 91-111
- Current order: `x-forwarded-for` -> `x-real-ip` -> `cf-connecting-ip` -> fallback
- All rate limiters on financial endpoints (verify-payment: 10/hr, checkout: 5/hr) are bypassable
- Attacker simply sends `X-Forwarded-For: random-ip` header on each request

## Proposed Solutions

### Option A: Reverse header priority order (Recommended)
```typescript
export function getClientIP(request: Request): string {
  const cfConnecting = request.headers.get('cf-connecting-ip');
  if (cfConnecting) return cfConnecting;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;

  return '127.0.0.1';
}
```
- Pros: Simple 5-line change, immediately effective behind Cloudflare
- Cons: None
- Effort: Small
- Risk: None

### Option B: Strip untrusted headers at proxy level
- Pros: Defense in depth
- Cons: Requires infrastructure config, not just code
- Effort: Medium
- Risk: Low

## Recommended Action

Option A - immediate fix before merging PR #49.

## Technical Details

- **Affected files:** `src/lib/rateLimit.ts`
- **Affected endpoints:** All rate-limited endpoints (verify-payment, checkout, signup, presign, confirm, check-slug, website-image)
- **PR:** #49

## Acceptance Criteria

- [ ] `cf-connecting-ip` is checked first in `getClientIP()`
- [ ] Tests verify header priority order
- [ ] Rate limiting cannot be bypassed with spoofed X-Forwarded-For header

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-22 | Created from code review of PRs #46-51 | Security + Performance agents both flagged this independently |

## Resources

- PR #49: feat/rate-limiting-signup
- OWASP: Rate Limiting Best Practices
