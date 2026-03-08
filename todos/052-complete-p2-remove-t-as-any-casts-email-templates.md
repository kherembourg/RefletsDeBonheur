---
status: pending
priority: p2
issue_id: "052"
tags: [code-review, quality, typescript, email]
dependencies: []
---

# Remove (t as any) Type Casts in Email Templates

## Problem Statement

The email template code uses `(t as any).accessTextPassword` casts to access new translation keys. These keys exist on all language objects, so the casts are unnecessary and hide potential type errors.

## Findings

- **Source:** Code Simplicity Reviewer, Architecture Strategist, Pattern Recognition Specialist
- **Location:** `src/lib/email/templates.ts`

## Proposed Solutions

### Option A: Add keys to the TypeScript type definition (Recommended)
Ensure the `WelcomeEmailTranslations` type (or equivalent) includes the new keys, then remove the `as any` casts.
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] No `(t as any)` casts in email templates
- [ ] TypeScript compiles without errors
- [ ] All email tests pass
