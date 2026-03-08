---
status: pending
priority: p3
issue_id: "070"
tags: [code-review, react, reliability, frontend]
dependencies: []
---

# Frontend Lifecycle Issues - Timers, Listeners, Stale Closures

## Problem Statement

Multiple frontend lifecycle issues found across components:

1. **Slideshow stale closure:** `setIsPlaying(!isPlaying)` in keyboard handler captures stale `isPlaying`. Spacebar toggle unreliable.
2. **QR print blind setTimeout:** `setTimeout(500ms)` before `print()` — should use `img.onload` instead.
3. **PWA listener leak:** `appinstalled` event listener never removed. Grows on remount.
4. **useWebsiteEditor timer leaks:** Status reset `setTimeout` calls not tracked or cancelled on unmount.
5. **RSVPResponsesViewer:** Service recreated every render + blob URL leak on CSV export.
6. **Toast timer reset:** `onClose` identity changes reset auto-dismiss timer.
7. **GalleryGrid:** No cancellation token on initial data load (unlike `useMedia` which does it correctly).
8. **ContentEditor:** `setTimeout(fn, 0)` to avoid setState-during-render — should use `useEffect`.

## Findings

- **Source:** Frontend Races Reviewer (Issues 4-14)
- **Pattern:** Good patterns (cancelled flag in useMedia, uploadingRef guard) applied inconsistently

## Proposed Solutions

Fix each issue individually — most are 5-30 min fixes:
- Slideshow: use ref for isPlaying in keyboard handler
- QR print: use `img.onload` + `img.complete` check
- PWA: remove `appinstalled` listener in cleanup
- Timers: track setTimeout IDs in refs, clear on unmount
- RSVPService: wrap in `useMemo`
- GalleryGrid: add `cancelled` flag pattern
- **Effort:** Medium (3-4h total for all)
- **Risk:** Low

## Acceptance Criteria

- [ ] No timer leaks on component unmount
- [ ] No event listener leaks
- [ ] No stale closures in keyboard handlers
- [ ] QR print uses img.onload not setTimeout
- [ ] All data loading effects have cancellation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Frontend Races Reviewer |
