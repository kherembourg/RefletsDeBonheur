---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, security, pr-25]
dependencies: []
---

# Password Stored in sessionStorage

## Problem Statement

The signup wizard persists all form state to sessionStorage, including the password and confirmPassword fields. This exposes credentials to:
- Malicious browser extensions
- XSS attacks
- Shared computer scenarios

## Findings

### From security-sentinel and architecture-strategist agents:
- **Location**: `src/components/signup/SignupWizard.tsx` (lines 57-64)
- The `state` object includes `account: { email, password, confirmPassword }`
- All state is serialized to sessionStorage on every change

```typescript
useEffect(() => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ state }));
  } catch {
    // Ignore storage errors
  }
}, [state]);
```

## Proposed Solutions

### Option A: Exclude sensitive fields from persistence
```typescript
const { account: { password, confirmPassword, ...safeAccount }, ...rest } = state;
sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
  state: { ...rest, account: safeAccount }
}));
```
**Pros**: Maintains form persistence for non-sensitive data
**Cons**: Password must be re-entered on page refresh
**Effort**: Low
**Risk**: Low

### Option B: Remove sessionStorage persistence entirely
Delete the persistence feature - users complete signup in one session
**Pros**: Simplest, most secure
**Cons**: Minor UX regression if user refreshes
**Effort**: Low
**Risk**: Low

### Option C: Use encrypted storage
Encrypt sensitive data before storing
**Pros**: Maintains full persistence
**Cons**: Over-engineering, key management complexity
**Effort**: High
**Risk**: Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/components/signup/SignupWizard.tsx`

## Acceptance Criteria

- [ ] Password is never written to sessionStorage
- [ ] confirmPassword is never written to sessionStorage
- [ ] Other form fields (email, names, slug) can still be persisted
- [ ] No regression in normal signup flow

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by security-sentinel agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
- OWASP Sensitive Data Exposure: https://owasp.org/www-project-web-security-testing-guide/
