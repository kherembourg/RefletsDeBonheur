---
status: pending
priority: p1
issue_id: "006"
tags: [code-review, testing, pr-25]
dependencies: []
---

# ThemeStep Test Will Fail - Language Mismatch

## Problem Statement

The ThemeStep test expects French loading text ("chargement") but the component uses English ("Creating..."). This test will fail when run.

## Findings

### From pattern-recognition-specialist agent:
- **Test Location**: `src/components/signup/__tests__/ThemeStep.test.tsx` (line 112)
- **Component Location**: `src/components/signup/steps/ThemeStep.tsx` (line 136)

**Test expects:**
```typescript
expect(screen.getByText(/chargement/i)).toBeInTheDocument();
```

**Component actually renders:**
```typescript
{loading ? 'Creating...' : 'Create My Wedding Site'}
```

## Proposed Solutions

### Option A: Fix the test to match English component
```typescript
expect(screen.getByText(/creating/i)).toBeInTheDocument();
```
**Pros**: Quick fix, matches actual behavior
**Cons**: Test was likely written with intent for i18n
**Effort**: Low
**Risk**: Low

### Option B: Update component to use translations
Wire up the translation system to the component
**Pros**: Fixes the underlying i18n issue
**Cons**: Requires more work (see related todo)
**Effort**: Medium
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/components/signup/__tests__/ThemeStep.test.tsx`
- `src/components/signup/steps/ThemeStep.tsx`

## Acceptance Criteria

- [ ] ThemeStep test passes
- [ ] Test matches actual component behavior

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by pattern-recognition-specialist agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
