---
status: pending
priority: p2
issue_id: "076"
tags: [code-review, architecture, dead-code]
dependencies: []
---

# UploadForm Still Imports mockAPI

## Problem Statement

`UploadForm.tsx` still imports `mockAPI` from `../../lib/api` (line 4) and uses it for AI caption generation (line 96). While AdminPanel was correctly migrated away from mockAPI, UploadForm was only partially migrated — uploads use DataService but caption generation still uses the mock.

## Findings

**File:** `src/components/gallery/UploadForm.tsx`

- Line 4: `import { mockAPI } from '../../lib/api';`
- Line 96: `const caption = await mockAPI.generateCaption(item.preview);`

This means the "generate AI caption" button calls a mock function in production, not a real API. This is misleading UX — the button appears to work but returns fake data.

## Proposed Solutions

### Option A: Remove AI caption feature for now
- Remove the Sparkles button and `generateAICaption` function
- Remove the `mockAPI` import
- Add it back when a real AI captioning service is integrated
- **Effort:** Small | **Risk:** None

### Option B: Route through DataService
- Add `generateCaption()` to DataService
- Mock mode returns fake caption, production mode calls a real endpoint
- **Effort:** Medium | **Risk:** Low

## Acceptance Criteria

- [ ] No production code calls mockAPI functions
- [ ] AI caption feature either works for real or is removed
