---
status: pending
priority: p3
issue_id: "066"
tags: [code-review, simplicity, cleanup]
dependencies: []
---

# Dead Code Cleanup (~2000-2500 Lines)

## Problem Statement

Multiple dead components, unused dependencies, and YAGNI violations accumulate cognitive load:

**Dead components (never imported):**
- `SearchFilters.tsx` + `SearchFilters.test.tsx`
- `BulkActions.tsx` + `BulkActions.test.tsx` (GalleryGrid has inline bulk ops)
- `ThemedHero.tsx`
- `PageTransition.tsx`
- `Skeleton.tsx`
- `AIAssistant.tsx` (fake AI for disabled guestbook)

**Unused dependencies:**
- `bcryptjs` + `@types/bcryptjs` — never imported in source
- `jszip` — only used in dead BulkActions

**Unused feature flags:**
- `liveWall` and `geoFencing` — defined in types but never consumed by UI

**Other:**
- `src/lib/theme.ts` dark mode system (unused for wedding site)
- `imagePlaceholders.ts` SVG generation (CSS background-color suffices)
- `src/lib/api.ts` mockAPI (redundant with DataService demo mode)
- Tests for dead components

## Findings

- **Source:** Code Simplicity Reviewer
- **Estimated reduction:** ~2000-2500 lines

## Acceptance Criteria

- [ ] Dead components deleted
- [ ] `bcryptjs` and `jszip` uninstalled
- [ ] `liveWall`/`geoFencing` removed from type definitions
- [ ] Tests for dead components removed
- [ ] All existing tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Code Simplicity Reviewer |
