---
status: pending
priority: p3
issue_id: "068"
tags: [code-review, architecture, consistency]
dependencies: []
---

# Consolidate Three Competing Response Helper Systems

## Problem Statement

Three different systems for JSON API responses:
1. `apiResponse` from `lib/api/middleware.ts` (38 calls in 8 files)
2. `errorResponse`/`jsonResponse` from `stripe/apiAuth.ts` (23 calls in 4 files)
3. Raw `new Response(JSON.stringify(...))` (155 occurrences in 32 files)

Additionally, some endpoints leak internal `error.message` to clients in 500 responses.

## Findings

- **Source:** Pattern Recognition (Issue 3), Security Sentinel (M1), Silent Failure Hunter (Issue 27)

## Proposed Solutions

- Migrate all endpoints to `apiResponse` exclusively
- Merge `errorResponse` from `apiAuth.ts` into `apiResponse`
- Ensure 500 responses never expose `error.message` — log server-side only
- **Effort:** Medium (3-4h)
- **Risk:** Low

## Acceptance Criteria

- [ ] Single response helper system used across all endpoints
- [ ] No raw `new Response(JSON.stringify(...))` in API endpoints
- [ ] 500 responses use generic messages, details logged server-side

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Pattern Recognition + Security Sentinel |
