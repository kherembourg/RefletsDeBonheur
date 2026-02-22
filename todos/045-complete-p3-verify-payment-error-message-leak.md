---
status: complete
priority: p3
issue_id: "045"
tags: [code-review, security, pr-49]
dependencies: []
---

# verify-payment.ts Leaks Internal Error Messages

## Problem Statement

The outer catch block in `verify-payment.ts` (lines 253-261) exposes raw `error.message` to clients. Depending on the error source (Stripe SDK, Supabase, Node internals), this could leak implementation details.

```typescript
message: error instanceof Error ? error.message : 'Unknown error',
```

The `checkout.ts` endpoint handles this correctly with a generic message.

## Findings

**Source:** Security sentinel (LOW-2)

## Proposed Solutions

Replace with: `'An unexpected error occurred. Please try again or contact support.'`

- Effort: Small
- Risk: None

## Acceptance Criteria

- [ ] Error responses do not expose internal error details
- [ ] Console.error still logs the full error for debugging
