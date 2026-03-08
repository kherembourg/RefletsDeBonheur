---
status: pending
priority: p1
issue_id: "054"
tags: [code-review, security, csrf]
dependencies: []
---

# CSRF Protection Bypass - Missing Origin Header Allowed

## Problem Statement

The CSRF middleware checks `Origin` against `Host`, but if the `Origin` header is absent, the request is allowed through. The comment mentions checking `Referer` but no such check is implemented. An attacker can craft requests from non-browser clients that omit the `Origin` header, bypassing CSRF protection for all POST endpoints.

## Findings

- **Source:** Security Sentinel (H5)
- **File:** `src/middleware.ts` lines 44-71
- **Evidence:** `if (origin) { ... }` — validation only happens if Origin exists

## Proposed Solutions

### Option A: Require Origin header for sensitive endpoints (Recommended)
- For state-changing endpoints (payment, upload, account creation), require Origin to be present
- Add Referer check as documented fallback
- **Effort:** Small (1h)
- **Risk:** Low — may break non-browser API clients (document requirement)

### Option B: Double-submit cookie CSRF tokens
- **Effort:** Medium (3-4h)
- **Risk:** Low

## Acceptance Criteria

- [ ] Sensitive POST endpoints reject requests without Origin header
- [ ] Or: Referer header checked as fallback when Origin absent
- [ ] Tests cover CSRF bypass scenarios

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Different from resolved todo #016 which was about missing CSRF entirely |
