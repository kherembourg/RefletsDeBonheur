---
status: pending
priority: p2
issue_id: "060"
tags: [code-review, performance, upload, mobile, memory]
dependencies: []
---

# Upload UX: Data URL Memory Bombs, Sequential Uploads, No Abort

## Problem Statement

Three compounding issues in the upload flow that will cause problems during a wedding:

1. **Data URL previews (memory bomb):** `readAsDataURL()` creates base64 strings for every file. 10 photos = ~67MB of strings. 30 photos on mobile = browser crash. Video files are even worse (200MB+ into a string).

2. **Sequential uploads:** `uploadMultipleToR2` uploads files one at a time. 10 photos = 30 sequential HTTP requests (presign + PUT + confirm each). On mobile 4G, this takes minutes.

3. **No abort/cancellation:** Zero `AbortController` usage in the entire codebase. If user closes upload modal, XHR requests continue as zombies with stale callbacks. If user navigates away during gallery load, fetches continue.

## Findings

- **Source:** Performance Oracle (CRITICAL-2, CRITICAL-3), Frontend Races Reviewer (Issues 1, 2, 20)
- **Files:** `src/components/gallery/UploadForm.tsx` lines 42-56, `src/lib/r2/upload.ts` lines 160-203
- **Evidence:** `FileReader.readAsDataURL()` for previews, sequential `for` loop with `await`, zero `AbortController` results

## Proposed Solutions

### Option A: Fix all three (Recommended)
1. Replace `readAsDataURL` with `URL.createObjectURL(file)` — revoke on remove/unmount
2. Add concurrent uploads (2-3 parallel) with semaphore pattern
3. Add `AbortController` to upload flow — abort on modal close/unmount
- **Effort:** Medium (3-4h)
- **Risk:** Low

## Acceptance Criteria

- [ ] File previews use `URL.createObjectURL` not `readAsDataURL`
- [ ] Object URLs revoked on file removal and component unmount
- [ ] Uploads run 2-3 in parallel
- [ ] Upload flow supports abort via `AbortController`
- [ ] Modal close aborts in-flight uploads
- [ ] No React state-on-unmounted warnings

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Performance Oracle + Frontend Races Reviewer |
