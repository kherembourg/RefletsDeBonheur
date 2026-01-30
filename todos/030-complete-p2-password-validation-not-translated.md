---
status: complete
priority: p2
issue_id: "030"
tags: [code-review, i18n, signup, localization]
dependencies: []
---

# Password Validation Errors Not Translated

## Problem Statement

The `getPasswordError()` function returns hardcoded English strings that bypass the i18n system. Users viewing the signup form in French or Spanish will see English password validation errors, breaking the localization experience.

## Findings

**Location:** `src/components/signup/steps/AccountStep.tsx:37-40`

```typescript
const passwordError = getPasswordError(data.password);
if (passwordError) {
  // Use the actual validation error which is already descriptive
  newErrors.password = passwordError;  // Returns English strings directly
}
```

**Source of English strings:** `src/lib/passwordValidation.ts`

```typescript
export function getPasswordError(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  // ... more English strings
}
```

**Impact:**
- FR/ES users see English validation messages
- Inconsistent UX - other errors are translated but password errors are not
- Partial i18n implementation

## Proposed Solutions

### Option A: Return Translation Keys from getPasswordError (Recommended)
**Pros:** Clean separation, reusable across components
**Cons:** Requires changing passwordValidation.ts API
**Effort:** Small
**Risk:** Low

```typescript
// passwordValidation.ts
export function getPasswordErrorKey(password: string): string | null {
  if (password.length < 8) return 'signup.errors.passwordTooShort';
  if (!/[A-Z]/.test(password)) return 'signup.errors.passwordNoUppercase';
  if (!/[a-z]/.test(password)) return 'signup.errors.passwordNoLowercase';
  if (!/[0-9]/.test(password)) return 'signup.errors.passwordNoNumber';
  return null;
}

// AccountStep.tsx
const passwordErrorKey = getPasswordErrorKey(data.password);
if (passwordErrorKey) {
  newErrors.password = t(lang, passwordErrorKey);
}
```

### Option B: Map Error Strings to Translation Keys in Component
**Pros:** No change to passwordValidation.ts
**Cons:** Fragile string matching, duplication
**Effort:** Small
**Risk:** Medium (string changes break mapping)

```typescript
const passwordError = getPasswordError(data.password);
if (passwordError) {
  const errorKeyMap: Record<string, string> = {
    'Password must be at least 8 characters': 'signup.errors.passwordTooShort',
    'Password must contain at least one uppercase letter': 'signup.errors.passwordNoUppercase',
    // ...
  };
  newErrors.password = errorKeyMap[passwordError]
    ? t(lang, errorKeyMap[passwordError])
    : passwordError;
}
```

### Option C: Pass lang to getPasswordError
**Pros:** Self-contained translation
**Cons:** Couples validation library to i18n system
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option A - Return translation keys from `getPasswordError()`. This keeps the validation logic clean and delegates translation to the consumer.

## Technical Details

**Affected files:**
- `src/lib/passwordValidation.ts` - Add new function or modify existing
- `src/components/signup/steps/AccountStep.tsx` - Use translation keys
- `src/i18n/translations.ts` - Add new password error keys (if not present)

**New translation keys needed:**
- `signup.errors.passwordNoUppercase`
- `signup.errors.passwordNoLowercase`
- `signup.errors.passwordNoNumber`

## Acceptance Criteria

- [x] Password validation errors display in user's selected language
- [x] All password requirements have corresponding translation keys
- [x] FR and ES translations are complete
- [x] Tests pass with translated error messages

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from i18n code review | getPasswordError returns raw English strings |
| 2026-01-30 | Fixed: Added getPasswordErrorKey() and translation keys | Pattern: return i18n keys from validation, translate at component level |

## Resources

- Commit: c6c520c feat(signup): wire i18n to all signup wizard components
- Related file: `src/lib/passwordValidation.ts`
