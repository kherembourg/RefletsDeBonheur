---
status: pending
priority: p2
issue_id: "062"
tags: [code-review, security, typescript, validation]
dependencies: []
---

# API Request Bodies Are Unvalidated

## Problem Statement

Every API endpoint destructures `request.json()` without runtime validation. `request.json()` returns `Promise<any>`. No Zod, no joi, no manual type guards. A malicious request with wrong types (`weddingId: 123` instead of string) passes initial checks and propagates into Supabase queries. The `SignupRequest` type annotation in `signup.ts` is purely cosmetic — zero runtime validation.

This pattern appears across `presign.ts`, `confirm.ts`, `guest-login.ts`, `checkout.ts`, `webhook.ts`, `save.ts`, and `signup.ts`.

## Findings

- **Source:** TypeScript Reviewer (Issue 3)
- **Files:** All API endpoints in `src/pages/api/`
- **Evidence:** `const body = await request.json(); const { weddingId } = body;` — no validation

## Proposed Solutions

### Option A: Add Zod schemas to API endpoints (Recommended)
- Define Zod schemas for each endpoint's request body
- Validate with `schema.safeParse(body)` before processing
- Return 400 with specific validation errors
- **Effort:** Medium (4-5h for all endpoints)
- **Risk:** Low

### Option B: Manual type guards
- Write manual validation for each field
- **Effort:** Medium (similar)
- **Risk:** Higher — manual validation is error-prone

## Acceptance Criteria

- [ ] All API endpoints validate request body at runtime
- [ ] Wrong types (number for string, missing fields) return 400
- [ ] No `any` types flow from request.json() into business logic

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by TypeScript Reviewer |
