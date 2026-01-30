---
status: resolved
priority: p2
issue_id: "016"
tags: [code-review, security, pr-25]
dependencies: []
resolved_date: 2026-01-29
---

# Missing CSRF Protection

## Problem Statement

No CSRF tokens are validated on state-changing endpoints. Attackers could forge signup requests from malicious sites.

## Findings

### From security-sentinel agent:
- No CSRF tokens in any API endpoints
- No `SameSite` cookie configuration found
- No security headers configured

## Proposed Solutions

### Option A: SameSite cookies
Configure Supabase/session cookies with `SameSite=Strict`
**Pros**: Simple, browser-level protection
**Cons**: May affect legitimate cross-origin flows
**Effort**: Low
**Risk**: Low

### Option B: CSRF tokens
Implement CSRF token generation and validation
**Pros**: Complete protection
**Cons**: More complex
**Effort**: Medium
**Risk**: Low

### Option C: Double-submit cookie pattern
Use cookie + header matching
**Pros**: Stateless
**Cons**: Requires client-side changes
**Effort**: Medium
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/signup.ts`
- `astro.config.mjs` (for headers)
- Possibly all state-changing endpoints

## Acceptance Criteria

- [x] CSRF protection implemented
- [x] State-changing endpoints are protected
- [x] Legitimate requests still work

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by security-sentinel agent |
| 2026-01-29 | Implemented via Astro middleware | Origin header validation + security headers (CSP, X-Frame-Options, etc.) |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
- OWASP CSRF: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
