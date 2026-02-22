---
status: pending
priority: p3
issue_id: "046"
tags: [code-review, i18n, pr-48]
dependencies: []
---

# WebsiteEditor Sub-Components Missing i18n

## Problem Statement

All UI strings in the newly extracted WebsiteEditor sub-components remain hardcoded in French ("Retour", "Enregistrement...", "Reduire", "Themes", "Couleurs", etc.). PR #47 is actively adding i18n to the signup flow, creating an inconsistency.

## Findings

**Source:** Pattern recognition (LOW), Architecture strategist

- Files: EditorToolbar.tsx, EditorSidebar.tsx, PreviewPanel.tsx, ThemeTabContent.tsx
- ~20 hardcoded French strings across 4 files

## Proposed Solutions

Wire strings through `t(lang, 'editor.*')` in a future PR. Not blocking for PR #48 merge since this is pre-existing.

## Acceptance Criteria

- [ ] All user-visible strings in editor components use i18n
- [ ] EN/FR/ES translations for editor strings
