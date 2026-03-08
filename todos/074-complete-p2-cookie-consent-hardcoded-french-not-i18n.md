---
status: pending
priority: p2
issue_id: "074"
tags: [code-review, i18n, consistency]
dependencies: []
---

# CookieConsent Component Has Hardcoded French Strings

## Problem Statement

The `CookieConsent.tsx` component contains hardcoded French strings ("Refuser", "Accepter", "Ce site utilise des cookies...") despite todo #063 specifically targeting hardcoded French in React components. The component also has a non-i18n `aria-label="Consentement aux cookies"`.

## Findings

**File:** `src/components/layout/CookieConsent.tsx`

- Line 38: `aria-label="Consentement aux cookies"` — hardcoded French
- Lines 43-47: Cookie explanation text — hardcoded French
- Line 53: `Refuser` — hardcoded French
- Line 58: `Accepter` — hardcoded French

The component doesn't accept a `lang` prop or use the `t()` i18n helper, unlike other components fixed in this PR.

## Proposed Solutions

### Option A: Add i18n support (Recommended)
- Accept `lang` prop, use `t(lang, 'gdpr.cookieText')` etc.
- Add translation keys for FR/EN/ES
- **Effort:** Small | **Risk:** None

## Acceptance Criteria

- [ ] All user-visible strings use i18n translation keys
- [ ] Component accepts `lang` prop
- [ ] FR/EN/ES translations added
