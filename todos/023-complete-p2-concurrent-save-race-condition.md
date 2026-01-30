---
status: complete
priority: p2
issue_id: "023"
tags: [code-review, data-integrity, race-condition, pr-30]
dependencies: []
---

# Race Condition: Concurrent Save Operations

## Problem Statement

The `performSave` function has no mutex/lock mechanism. Multiple saves can execute concurrently, potentially causing data loss or inconsistent state.

## Findings

**Location:** `src/hooks/useWebsiteEditor.ts:190-224`

```typescript
const performSave = useCallback(async () => {
  const currentCustomization = customizationRef.current;
  const currentJson = JSON.stringify(currentCustomization);

  if (currentJson === lastSavedRef.current) {
    return;
  }

  try {
    setSaveStatus('saving');
    // ... save logic - NO CHECK for already in progress
  }
}, [onSave, saveToApi]);
```

**Scenario:**
1. User makes change A, debounce starts
2. User makes change B at T=1.5s, debounce resets
3. User makes change C at T=3s, save B fires
4. User makes change D at T=3.5s, new debounce starts
5. Save B still in progress when save D triggers
6. Intermediate states may be lost

## Proposed Solutions

### Option A: Add In-Progress Flag (Recommended)
**Pros:** Simple, prevents concurrent saves
**Cons:** May queue saves
**Effort:** Small
**Risk:** Low

```typescript
const saveInProgressRef = useRef(false);

const performSave = useCallback(async () => {
  if (saveInProgressRef.current) {
    // Optionally queue another save after current completes
    return;
  }
  saveInProgressRef.current = true;
  try {
    // ... existing logic
  } finally {
    saveInProgressRef.current = false;
  }
}, []);
```

### Option B: Use AbortController
**Pros:** Cancels stale requests
**Cons:** More complex
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option A - Simple in-progress flag

## Technical Details

**Affected files:**
- `src/hooks/useWebsiteEditor.ts`

## Acceptance Criteria

- [ ] Only one save operation can be in progress at a time
- [ ] Later changes are still saved after current save completes
- [ ] No data loss in rapid editing scenarios

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Debounce alone doesn't prevent concurrent API calls |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
