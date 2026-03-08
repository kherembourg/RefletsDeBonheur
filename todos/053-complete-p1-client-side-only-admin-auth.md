---
status: pending
priority: p1
issue_id: "053"
tags: [code-review, security, auth]
dependencies: []
---

# Client-Side Only Admin Authorization

## Problem Statement

Admin access to `/<slug>/admin` is gated only by `localStorage.getItem('reflets_is_admin') === 'true'`. Any user can bypass this by running `localStorage.setItem('reflets_is_admin', 'true')` in DevTools or using curl (no localStorage check applies). The Astro page loads the AdminPanel with full wedding data (including `weddingId`, `profileId`) server-side before any client check.

## Findings

- **Source:** Security Sentinel (H1), Architecture Strategist (3.5)
- **Files:** `src/pages/[slug]/admin.astro` lines 33-68, `src/lib/auth.ts` lines 64-99
- **Evidence:** `isAdmin()` checks 4 different localStorage keys with empty catch blocks

## Proposed Solutions

### Option A: Server-side session verification in Astro frontmatter (Recommended)
- Read session token from cookie in `admin.astro` frontmatter
- Verify against `auth_sessions` table server-side
- Redirect to `/connexion` if invalid, before rendering AdminPanel
- Do not pass sensitive props without server-side verification
- **Effort:** Medium (3-4h)
- **Risk:** Low

## Acceptance Criteria

- [ ] Admin page checks session token server-side before rendering
- [ ] Invalid/missing session redirects to login
- [ ] `weddingId` and `profileId` not exposed without auth
- [ ] localStorage check remains as UX optimization only (not security)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Known pre-existing issue, confirmed by 2 agents |
