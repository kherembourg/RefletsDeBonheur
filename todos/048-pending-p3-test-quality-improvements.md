---
status: pending
priority: p3
issue_id: "048"
tags: [code-review, testing, pr-47, pr-51]
dependencies: []
---

# Test Quality Improvements Across PRs #47 and #51

## Problem Statement

Several test quality issues identified across the new test files:

1. **PR #47**: i18n tests have 36 repetitive render-and-check tests that could use `test.each` (-200 LOC)
2. **PR #51**: ~350 lines testing trivial code (constants, early returns, hardcoded values)
3. **PR #51**: `Math.random()` in test fixture IDs makes failures non-reproducible
4. **PR #51**: Rate limit mock `RATE_LIMITS` object manually recreated in multiple test files (shotgun surgery)
5. **PR #49/51**: `as any` casts instead of `vi.mocked()` for test mocks

## Findings

**Source:** Code simplicity reviewer, Pattern recognition specialist, TypeScript reviewer

## Proposed Solutions

1. Consolidate i18n tests with `test.each` parameterization
2. Trim trivial assertion tests (dataService stub tests, supabase "not configured" tests)
3. Use deterministic IDs (`let counter = 0; const nextId = () => `media-${counter++}`)
4. Create shared test helper: `src/test/helpers/rateLimitMock.ts`
5. Replace `as any` with `vi.mocked()` where possible

## Acceptance Criteria

- [ ] No Math.random() in test fixture IDs
- [ ] Rate limit mock setup is shared via a test helper
- [ ] `vi.mocked()` used instead of `as any` for mock typing
