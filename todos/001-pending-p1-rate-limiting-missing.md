---
status: pending
priority: p1
issue_id: "001"
tags: [code-review, security, pr-25]
dependencies: []
---

# Rate Limiting Missing on Public Endpoints

## Problem Statement

The `/api/signup` and `/api/weddings/check-slug` endpoints have no rate limiting, allowing unlimited requests. This enables:
- Email enumeration attacks
- Slug reservation denial-of-service
- Resource exhaustion through mass account creation
- Database quota exhaustion

## Findings

### From security-sentinel agent:
- **Location**: `src/pages/api/signup.ts` (lines 43-324)
- **Location**: `src/pages/api/weddings/check-slug.ts` (lines 65-184)
- **Exploitability**: High - trivial to automate requests
- The plan document mentions "Add rate limiting (10 per IP per hour)" but this was not implemented

## Proposed Solutions

### Option A: Middleware-based rate limiting
**Pros**: Centralized, reusable across endpoints
**Cons**: Requires additional dependency or custom implementation
**Effort**: Medium
**Risk**: Low

### Option B: Vercel/Cloudflare edge rate limiting
**Pros**: No code changes, handles at infrastructure level
**Cons**: Requires deployment configuration
**Effort**: Low
**Risk**: Low

### Option C: Supabase RLS with rate limiting function
**Pros**: Database-level protection
**Cons**: More complex, harder to tune
**Effort**: High
**Risk**: Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/signup.ts`
- `src/pages/api/weddings/check-slug.ts`

**Suggested limits:**
- Signup: 5 attempts per IP per hour
- Slug check: 30 requests per IP per minute

## Acceptance Criteria

- [ ] Rate limiting implemented on `/api/signup`
- [ ] Rate limiting implemented on `/api/weddings/check-slug`
- [ ] Returns 429 Too Many Requests with Retry-After header
- [ ] Limits are configurable via environment variables

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by security-sentinel agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
- OWASP Rate Limiting: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
