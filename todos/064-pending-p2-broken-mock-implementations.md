---
status: pending
priority: p2
issue_id: "064"
tags: [code-review, bug, functional]
dependencies: []
---

# Three Broken Mock Implementations in Production

## Problem Statement

Three user-facing features call `mockAPI` which does nothing in production:

1. **Toggle uploads (no-op):** `AdminPanel.tsx` calls `mockAPI.toggleUploads()` which is `await delay(300); return void`. The UI toggle appears to work but the wedding config is never updated. Admins cannot enable/disable photo uploads.

2. **RSVP submit (hardcoded mock):** `WeddingRSVP.tsx` uses `setTimeout` to simulate an API call. Comment says "replace with actual Supabase call." Guest RSVP submission does not work in production at all.

3. **Export/backup (fake data):** The backup button returns `new Blob(['Mock backup data'])`. No actual data is exported.

## Findings

- **Source:** Agent-Native Reviewer (Issues 2, 3, 4)
- **Files:** `src/lib/api.ts` lines 194-206, `src/components/wedding/WeddingRSVP.tsx` lines 37-47, `src/components/admin/AdminPanel.tsx` line 165

## Proposed Solutions

### Option A: Wire to real APIs (Recommended)
1. Upload toggle: Create `PATCH /api/weddings/{id}/config` and update `config.features` JSONB
2. RSVP submit: Wire to `RSVPService.submitResponse()` or create `POST /api/rsvp/submit`
3. Export: Create `GET /api/weddings/{id}/export` generating real ZIP from R2 + Supabase
- **Effort:** Medium (4-6h total)
- **Risk:** Low

## Acceptance Criteria

- [ ] Upload toggle actually updates wedding config in database
- [ ] RSVP submission creates real database records
- [ ] Export generates real ZIP with photos and data
- [ ] `mockAPI` file deleted or replaced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Agent-Native Reviewer |
