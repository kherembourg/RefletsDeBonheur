---
status: pending
priority: p2
issue_id: "059"
tags: [code-review, performance, gallery, mobile]
dependencies: []
---

# Gallery Has No Pagination - All Media Loaded At Once

## Problem Statement

`getMedia()` fetches ALL media for a wedding with no pagination. `GalleryGrid` renders every `MediaCard` at once. At 200+ photos, this means one Supabase query returning 200+ rows with all columns (including `exif_data` JSONB), 200+ DOM elements, and 200+ `<img>` tags. On mobile devices at a wedding, this causes multi-second loads and potential crashes at 500+ photos.

Additionally, `select('*')` over-fetches — the `mediaToItem` converter only uses 7 of 22 columns. And `mediaToItem` omits the `status` property, so the processing overlay in `MediaCard` never shows in production.

## Findings

- **Source:** Performance Oracle (CRITICAL-1, OPT-1, OPT-5)
- **Files:** `src/lib/services/dataService.ts` line 253, `src/components/gallery/GalleryGrid.tsx` line 382
- **Evidence:** `mediaApi.getByWeddingId` passes no `limit`/`offset` (API already supports them)

## Proposed Solutions

### Option A: Cursor-based pagination with infinite scroll (Recommended)
- Load 24-48 items initially
- Add IntersectionObserver sentinel to trigger loading more
- Narrow `select('*')` to required columns only
- Add `status` to `MediaItem` in `mediaToItem` converter
- **Effort:** Medium (3-4h)
- **Risk:** Low — `mediaApi` already supports `limit`/`offset`

## Acceptance Criteria

- [ ] Gallery loads max 48 items initially
- [ ] Infinite scroll loads more items as user scrolls
- [ ] `select('*')` replaced with specific columns
- [ ] `status` field propagated to `MediaItem`
- [ ] Processing indicator shows for `status === 'processing'` in production
- [ ] Gallery usable on mobile with 500+ photos

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Performance Oracle |
