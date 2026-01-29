---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, quality, pr-25]
dependencies: []
---

# Code Duplication: RESERVED_SLUGS and isValidSlugFormat

## Problem Statement

The `RESERVED_SLUGS` constant and `isValidSlugFormat()` function are duplicated in two files. If a new reserved slug is added, both files must be updated - this is a maintenance burden and source of bugs.

## Findings

### From multiple agents:
- **Location 1**: `src/pages/api/signup.ts` (lines 19-31)
- **Location 2**: `src/pages/api/weddings/check-slug.ts` (lines 7-47)

Both files have identical or near-identical:
```typescript
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'demo', 'demo_gallery', ...
]);

function isValidSlugFormat(slug: string): boolean {
  const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  return pattern.test(slug) && slug.length >= 3 && slug.length <= 50;
}
```

## Proposed Solutions

### Option A: Extract to shared utility (RECOMMENDED)
Create `src/lib/slugValidation.ts`:
```typescript
export const RESERVED_SLUGS = new Set([...]);
export function isValidSlugFormat(slug: string): boolean { ... }
export function normalizeSlug(slug: string): string { ... }
export function generateSlugSuggestions(base: string): string[] { ... }
```
**Pros**: Single source of truth, reusable
**Cons**: Minor refactor
**Effort**: Low
**Risk**: Low

### Option B: Keep as-is with documentation
Add comment noting the duplication
**Pros**: No changes needed
**Cons**: Tech debt, will drift
**Effort**: None
**Risk**: Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**New File:**
- `src/lib/slugValidation.ts`

**Modified Files:**
- `src/pages/api/signup.ts` - import from shared
- `src/pages/api/weddings/check-slug.ts` - import from shared

## Acceptance Criteria

- [ ] Single definition of RESERVED_SLUGS
- [ ] Single definition of isValidSlugFormat
- [ ] Both API files import from shared module
- [ ] Tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | DRY violation |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
