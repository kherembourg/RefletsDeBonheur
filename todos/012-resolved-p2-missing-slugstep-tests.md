---
status: pending
priority: p2
issue_id: "012"
tags: [code-review, testing, pr-25]
dependencies: []
---

# Missing Test File for SlugStep Component

## Problem Statement

SlugStep is the most complex step component (238 lines) with async validation, debouncing, and API calls - but it has no tests. All other step components have test files.

## Findings

### From pattern-recognition-specialist agent:
- **Component**: `src/components/signup/steps/SlugStep.tsx` (238 lines)
- **Missing Test**: `src/components/signup/__tests__/SlugStep.test.tsx`

**Existing test files:**
- AccountStep.test.tsx ✓
- WeddingStep.test.tsx ✓
- ThemeStep.test.tsx ✓
- StepIndicator.test.tsx ✓

**SlugStep complexity includes:**
- Async slug validation via API
- Debounced API calls (500ms)
- Auto-suggestion from partner names
- Loading and error states
- Suggestion handling

## Proposed Solutions

### Option A: Create comprehensive SlugStep tests
Test the component with mocked API calls
**Pros**: Complete coverage
**Cons**: Requires effort
**Effort**: Medium
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**New File:**
- `src/components/signup/__tests__/SlugStep.test.tsx`

**Tests to include:**
- Renders all form fields
- Auto-generates slug from partner names
- Shows loading state during API check
- Handles available slug
- Handles taken slug with suggestions
- Handles API errors
- Debounces API calls
- Validates slug format client-side

## Acceptance Criteria

- [ ] SlugStep.test.tsx created
- [ ] Tests cover async validation flow
- [ ] Tests mock the check-slug API
- [ ] All tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Test coverage gap |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
