---
status: pending
priority: p1
issue_id: "051"
tags: [code-review, security, injection, auth]
dependencies: []
---

# PostgREST Filter Injection in Guest Login

## Problem Statement

The guest login endpoint interpolates user input directly into a PostgREST `.or()` filter string:

```typescript
.or(`pin_code.eq.${upperCode},magic_token.eq.${upperCode}`)
```

While `.toUpperCase()` limits the character set somewhat, PostgREST filter syntax characters (`)`, `(`, `,`, `.`) survive uppercasing. A crafted input could inject additional filter conditions to match unintended weddings.

## Findings

- **Source:** Security Sentinel (H2), Data Integrity Guardian (H5), TypeScript Reviewer (7)
- **File:** `src/pages/api/auth/guest-login.ts` line 29
- **Evidence:** User-controlled `upperCode` interpolated into `.or()` filter string

## Proposed Solutions

### Option A: Two separate .eq() queries (Recommended)
```typescript
const { data: byPin } = await adminClient
  .from('weddings').select('id, owner_id, slug, pin_code, magic_token')
  .eq('pin_code', upperCode).maybeSingle();
const { data: byToken } = await adminClient
  .from('weddings').select('id, owner_id, slug, pin_code, magic_token')
  .eq('magic_token', upperCode).maybeSingle();
const wedding = byPin || byToken;
```
- **Pros:** Fully parameterized, no injection risk, clear intent
- **Cons:** Two queries instead of one
- **Effort:** Small (30min)
- **Risk:** None

## Acceptance Criteria

- [ ] Guest login uses separate `.eq()` queries, no string interpolation
- [ ] Tests verify login still works with valid PIN and magic token
- [ ] Tests verify crafted inputs do not match unintended weddings

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by 3 agents independently |
