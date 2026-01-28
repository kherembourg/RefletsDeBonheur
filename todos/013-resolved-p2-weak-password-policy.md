---
status: pending
priority: p2
issue_id: "013"
tags: [code-review, security, pr-25]
dependencies: []
---

# Weak Password Policy

## Problem Statement

Password validation only checks minimum length of 8 characters. Weak passwords like "12345678" or "password" are accepted, making accounts vulnerable to brute force attacks.

## Findings

### From security-sentinel agent:
- **Location**: `src/pages/api/signup.ts` (lines 93-103)

```typescript
if (password.length < 8) {
  return new Response(
    JSON.stringify({
      error: 'Password too short',
      field: 'password',
      message: 'Password must be at least 8 characters.',
    }),
```

## Proposed Solutions

### Option A: Add complexity requirements
```typescript
const hasUppercase = /[A-Z]/.test(password);
const hasLowercase = /[a-z]/.test(password);
const hasNumber = /[0-9]/.test(password);

if (!hasUppercase || !hasLowercase || !hasNumber) {
  return error('Password must include uppercase, lowercase, and number');
}
```
**Pros**: Simple, effective
**Cons**: May frustrate users
**Effort**: Low
**Risk**: Low

### Option B: Use zxcvbn library
Password strength estimation based on common patterns
**Pros**: Better UX, catches common passwords
**Cons**: Adds dependency
**Effort**: Medium
**Risk**: Low

### Option C: Block common passwords list
Check against top 1000 common passwords
**Pros**: Catches obvious weak passwords
**Cons**: Requires maintaining list
**Effort**: Low
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/signup.ts`
- `src/components/signup/steps/AccountStep.tsx` (client-side validation)

## Acceptance Criteria

- [ ] Passwords require more than just length
- [ ] User receives helpful error message
- [ ] Client-side validation matches server-side

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by security-sentinel agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
- zxcvbn: https://github.com/dropbox/zxcvbn
