---
status: pending
priority: p3
issue_id: "017"
tags: [code-review, quality, pr-25]
dependencies: []
---

# useEffect Dependency Array Incomplete in SlugStep

## Problem Statement

The useEffect in SlugStep.tsx has incomplete dependency array, which could cause stale closure bugs.

## Findings

### From architecture-strategist agent:
- **Location**: `src/components/signup/steps/SlugStep.tsx` (lines 50-55)

```typescript
useEffect(() => {
  if (!data.slug && partner1Name && partner2Name) {
    const suggested = generateSlug(partner1Name, partner2Name);
    onChange({ slug: suggested });
  }
}, [partner1Name, partner2Name]); // Missing onChange and data.slug
```

The `onChange` and `data.slug` are used inside the effect but not listed in dependencies.

## Proposed Solutions

### Option A: Add missing dependencies
```typescript
}, [partner1Name, partner2Name, data.slug, onChange]);
```
**Pros**: Correct React behavior
**Cons**: May trigger more re-runs (but useCallback on onChange should prevent)
**Effort**: Low
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/components/signup/steps/SlugStep.tsx`

## Acceptance Criteria

- [ ] ESLint exhaustive-deps rule passes
- [ ] No stale closure bugs
- [ ] Component still works correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | React hooks best practice |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
