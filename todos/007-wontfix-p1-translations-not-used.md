---
status: pending
priority: p1
issue_id: "007"
tags: [code-review, i18n, pr-25]
dependencies: []
---

# 264 Lines of Translations Added But Never Used

## Problem Statement

The PR added 264 lines of translations across EN/FR/ES for the signup wizard, but none of the components use them. All text is hardcoded in English. This is wasted code that will drift from actual component text.

## Findings

### From multiple agents (pattern-recognition, architecture-strategist, code-simplicity):
- **Translation Location**: `src/i18n/translations.ts` (264 lines added)
- **Components**: All use hardcoded English strings

**Example from AccountStep.tsx:**
```typescript
<h2 className="font-serif text-2xl text-charcoal mb-2">Create Your Account</h2>
<p className="text-charcoal/60 text-sm">Start your 1-month free trial...</p>
```

**Translations exist at:**
- `translations.en.signup.account.title`
- `translations.en.signup.account.subtitle`
- etc.

**SignupWizard.tsx accepts `lang` prop but never uses it:**
```typescript
export function SignupWizard({ lang = 'en' }: SignupWizardProps) {
  // lang is never referenced in the component body
```

## Proposed Solutions

### Option A: Delete unused translations (RECOMMENDED)
Remove the 264 lines of translations since they're not wired up
**Pros**: Removes dead code, -264 LOC
**Cons**: Need to re-add when i18n is properly implemented
**Effort**: Low
**Risk**: Low

### Option B: Wire up translations to components
Pass `lang` to all step components and use `useTranslations(lang)`
**Pros**: Proper i18n implementation
**Cons**: More work, touches all components
**Effort**: Medium
**Risk**: Low

### Option C: Keep as-is, document as tech debt
Leave translations for future use
**Pros**: No changes needed
**Cons**: Dead code, will drift from actual text
**Effort**: None
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/i18n/translations.ts` (264 lines to remove or wire up)
- `src/components/signup/SignupWizard.tsx`
- `src/components/signup/steps/AccountStep.tsx`
- `src/components/signup/steps/WeddingStep.tsx`
- `src/components/signup/steps/SlugStep.tsx`
- `src/components/signup/steps/ThemeStep.tsx`

## Acceptance Criteria

Either:
- [ ] Translations are deleted from translations.ts
OR:
- [ ] All signup components use translation system
- [ ] Components accept and use `lang` prop
- [ ] FR and ES translations work when language is switched

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | YAGNI violation - added but unused |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
