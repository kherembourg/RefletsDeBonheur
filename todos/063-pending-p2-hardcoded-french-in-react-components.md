---
status: pending
priority: p2
issue_id: "063"
tags: [code-review, i18n, ux]
dependencies: []
---

# Hardcoded French Strings in React Components

## Problem Statement

Despite a comprehensive i18n system (1133 lines, FR/EN/ES), most React components bypass it with hardcoded French strings. The i18n `t()` function is designed for Astro components, not React. There is no React-compatible `useTranslation` hook with language context.

Components with hardcoded French:
- `MediaCard.tsx` line 68: `'Supprimer definitivement ce souvenir ?'`
- `GalleryGrid.tsx` lines 250, 335, 442: `'Galerie'`, `'Chargement des photos...'`, `'Code d\'acces'`
- `MessageList.tsx` line 100: `'Supprimer ce message ?'`
- `UploadForm.tsx` lines 91, 136: error messages in French
- `AlbumManager.tsx` line 90: confirmation text
- Multiple admin components

## Findings

- **Source:** Pattern Recognition, Silent Failure Hunter (Issue 19)
- **Evidence:** i18n `useTranslations()` only works in Astro, no React context provider

## Proposed Solutions

### Option A: Create React i18n context + useT() hook (Recommended)
- Create a React context provider for language
- Create `useT()` hook that React components can call
- Migrate hardcoded strings to translation keys
- **Effort:** Medium (4-5h)
- **Risk:** Low

## Acceptance Criteria

- [ ] React i18n hook exists and works in all React islands
- [ ] No hardcoded French strings in React components
- [ ] EN and ES users see correct translations in interactive components

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Pattern Recognition + Silent Failure Hunter |
