---
status: pending
priority: p2
issue_id: "014"
tags: [code-review, security, pr-25]
dependencies: []
---

# Email Enumeration via Different Error Messages

## Problem Statement

The signup endpoint returns different error messages for existing vs non-existing emails, allowing attackers to enumerate registered email addresses.

## Findings

### From security-sentinel agent:
- **Location**: `src/pages/api/signup.ts` (lines 162-172)

```typescript
if (authResult.error?.message?.includes('already been registered')) {
  return new Response(
    JSON.stringify({
      error: 'Email exists',
      field: 'email',
      message: 'An account with this email already exists. Please sign in instead.',
    }),
```

This reveals whether an email is registered.

## Proposed Solutions

### Option A: Generic success message
Always return success, send email if account created
```
"If this email is not already registered, an account has been created. Check your inbox."
```
**Pros**: No enumeration possible
**Cons**: UX impact - user doesn't know if account exists
**Effort**: Medium
**Risk**: Medium (UX)

### Option B: Rate limit + generic errors
Keep specific errors but rate limit aggressively
**Pros**: Better UX, still limits enumeration
**Cons**: Doesn't fully prevent
**Effort**: Low
**Risk**: Low

### Option C: Add CAPTCHA after N attempts
Show CAPTCHA after 3 failed attempts from same IP
**Pros**: Blocks automated enumeration
**Cons**: Adds friction
**Effort**: Medium
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/signup.ts`

## Acceptance Criteria

- [ ] Automated email enumeration is mitigated
- [ ] UX remains acceptable for legitimate users

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by security-sentinel agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
- OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
