---
status: complete
priority: p3
issue_id: "027"
tags: [code-review, performance, optimization, pr-30]
dependencies: []
---

# Excessive JSON.stringify on Every Render

## Problem Statement

The `hasUnsavedChanges` computation runs `JSON.stringify` on the entire customization object on every render. For frequent re-renders (color picker interactions), this adds unnecessary overhead.

## Findings

**Location:** `src/hooks/useWebsiteEditor.ts:104`

```typescript
const hasUnsavedChanges = JSON.stringify(customization) !== lastSavedRef.current;
```

**Impact:**
- ~0.5-1ms per render
- With rapid color picker interactions, can cause jank
- Scales poorly with larger customization objects

## Proposed Solutions

### Option A: Use useMemo (Recommended)
**Pros:** Simple, idiomatic React
**Cons:** None
**Effort:** Very small (1 line)
**Risk:** None

```typescript
const hasUnsavedChanges = useMemo(
  () => JSON.stringify(customization) !== lastSavedRef.current,
  [customization]
);
```

## Recommended Action

Option A - Wrap with useMemo

## Technical Details

**Affected files:**
- `src/hooks/useWebsiteEditor.ts`

## Acceptance Criteria

- [ ] hasUnsavedChanges only recomputed when customization changes
- [ ] No regression in save warning behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Expensive computations should be memoized |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
