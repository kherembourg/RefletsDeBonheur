---
status: pending
priority: p2
issue_id: "061"
tags: [code-review, typescript, architecture]
dependencies: []
---

# Dual Type Systems Diverge Between types.ts and supabase/types.ts

## Problem Statement

Two parallel, incompatible type systems define the same domain entities:

| Concept | `types.ts` | `supabase/types.ts` |
|---|---|---|
| `ReactionEmoji` | `'heart' \| 'fire' \| 'laugh'` | `'heart-emoji' \| 'heart-eyes-emoji'` (Unicode) |
| `WeddingFeatures` | `photoGallery`, `countdown`, `timeline` (7 props) | `gallery`, no `countdown`/`timeline` (5 props) |
| `Wedding.pinCode` | `string` (required) | `string \| null` |

The `ReactionEmoji` mismatch is especially dangerous — app-layer uses English identifiers but DB stores Unicode emojis. Any code mixing them silently matches nothing.

The `weddingData.ts` converter uses `config: any` to bridge the two worlds, hiding structural mismatches.

## Findings

- **Source:** TypeScript Reviewer (Issue 2), Architecture Strategist (3.2), Pattern Recognition (5)
- **Files:** `src/lib/types.ts`, `src/lib/supabase/types.ts`, `src/lib/weddingData.ts` line 218

## Proposed Solutions

### Option A: Make supabase/types.ts canonical, derive app types (Recommended)
- Use `supabase gen types` to auto-generate DB types
- Derive app-level types with explicit mapping functions (replace `any` converters)
- Standardize on `gallery` (not `photoGallery`) matching DB
- Remove duplicate type definitions from `types.ts`
- **Effort:** Large (6-8h)
- **Risk:** Medium — wide-reaching changes

### Option B: Align types.ts with supabase/types.ts incrementally
- Fix the most dangerous divergences (ReactionEmoji, WeddingFeatures) first
- Add typed converters gradually
- **Effort:** Medium (3-4h per batch)
- **Risk:** Low

## Acceptance Criteria

- [ ] Single source of truth for domain types
- [ ] ReactionEmoji consistent across app and DB layers
- [ ] WeddingFeatures consistent (`gallery` not `photoGallery`)
- [ ] No `any` casts in weddingData.ts converter
- [ ] All converters properly typed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by 3 agents independently |
