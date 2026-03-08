---
status: pending
priority: p3
issue_id: "067"
tags: [code-review, security, csp]
dependencies: []
---

# CSP Hardening - Remove unsafe-eval, Consider Nonces

## Problem Statement

CSP includes both `unsafe-inline` and `unsafe-eval` for scripts, effectively disabling XSS protection. The Permissions-Policy also blocks `camera=()` which is problematic for a photo-sharing app where guests might want to capture photos directly.

## Findings

- **Source:** Security Sentinel (H4), TypeScript Reviewer (Issues 12, 13)
- **File:** `src/middleware.ts` lines 24, 39
- **Evidence:** `script-src 'self' 'unsafe-inline' 'unsafe-eval'` and `camera=()`

## Proposed Solutions

1. Remove `unsafe-eval` — test if Astro hydration works without it
2. Investigate nonce-based CSP for inline scripts
3. Change `camera=()` to `camera=(self)` for future "Take Photo" feature
4. Add `Strict-Transport-Security` header for production
- **Effort:** Medium (2-3h for testing)
- **Risk:** Medium — may require Astro config changes

## Acceptance Criteria

- [ ] `unsafe-eval` removed if possible
- [ ] Camera permission allows self-origin
- [ ] HSTS header added for production
- [ ] Application still functions correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Security Sentinel + TypeScript Reviewer |
