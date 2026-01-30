---
status: complete
priority: p2
issue_id: "031"
tags: [code-review, i18n, signup, ux]
dependencies: []
---

# Generic Error Message for Invalid Date

## Problem Statement

When a user enters an invalid wedding date, the error message shown is the generic `common.error` ("An error occurred") instead of a specific, helpful message like "Please enter a valid date". This provides poor UX and doesn't help the user understand what went wrong.

## Findings

**Location:** `src/components/signup/steps/WeddingStep.tsx:38-40`

```typescript
if (data.weddingDate) {
  const date = new Date(data.weddingDate);
  if (isNaN(date.getTime())) {
    newErrors.weddingDate = t(lang, 'common.error');  // Generic "An error occurred"
  }
}
```

**Current `common.error` values:**
- EN: "An error occurred"
- FR: "Une erreur est survenue"
- ES: "Ocurrió un error"

**Issue:** These generic messages don't tell the user what's wrong with the date field.

## Proposed Solutions

### Option A: Add Specific Translation Key (Recommended)
**Pros:** Clear, helpful error message
**Cons:** Need to add new translation keys
**Effort:** Small
**Risk:** Low

```typescript
// WeddingStep.tsx
if (isNaN(date.getTime())) {
  newErrors.weddingDate = t(lang, 'signup.errors.invalidDate');
}

// translations.ts - add to all languages:
// EN: "Please enter a valid date"
// FR: "Veuillez entrer une date valide"
// ES: "Por favor ingresa una fecha válida"
```

### Option B: Use Existing Key with Interpolation
**Pros:** No new keys needed
**Cons:** Less specific
**Effort:** Small
**Risk:** Low

Use `signup.wedding.dateHelper` with modification, but this is a workaround.

## Recommended Action

Option A - Add specific `signup.errors.invalidDate` translation key to all three languages.

## Technical Details

**Affected files:**
- `src/components/signup/steps/WeddingStep.tsx` - Change error key
- `src/i18n/translations.ts` - Add new key to EN, FR, ES

**Translation key to add:**
```typescript
// In signup.errors section of each language:
invalidDate: 'Please enter a valid date',  // EN
invalidDate: 'Veuillez entrer une date valide',  // FR
invalidDate: 'Por favor ingresa una fecha válida',  // ES
```

## Acceptance Criteria

- [x] Invalid date shows specific error message, not generic error
- [x] Error message is translated in all 3 languages
- [x] Tests updated to check for new error message

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from i18n code review | Generic errors hurt UX |
| 2026-01-30 | Fixed: Added signup.errors.invalidDate key in all 3 languages | Always use specific error messages for better UX |

## Resources

- Commit: c6c520c feat(signup): wire i18n to all signup wizard components
- Related file: `src/i18n/translations.ts`
