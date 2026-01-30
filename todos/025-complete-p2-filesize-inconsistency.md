---
status: complete
priority: p2
issue_id: "025"
tags: [code-review, validation, consistency, pr-30]
dependencies: []
---

# File Size Limit Inconsistency

## Problem Statement

ImageManager.tsx validates against 10MB limit while useWebsiteEditor.ts and the API expect 5MB. This inconsistency could confuse users when uploads fail.

## Findings

**ImageManager.tsx:103** - 10MB limit:
```typescript
if (file.size > 10 * 1024 * 1024) {
  setErrors((prev) => ({ ...prev, [key]: 'L\'image doit faire moins de 10 MB' }));
```

**useWebsiteEditor.ts:336** - 5MB limit:
```typescript
const maxSize = 5 * 1024 * 1024;
if (file.size > maxSize) {
  throw new Error(`Fichier trop volumineux. Maximum 5 Mo.`);
```

**Impact:**
- Files between 5-10MB pass ImageManager validation but fail in hook
- Confusing error messages for users
- Inconsistent behavior

## Proposed Solutions

### Option A: Align to 5MB Everywhere (Recommended)
**Pros:** Consistent with API expectations
**Cons:** More restrictive than current ImageManager
**Effort:** Small (2 minutes)
**Risk:** Low

Update ImageManager.tsx line 103:
```typescript
if (file.size > 5 * 1024 * 1024) {
  setErrors((prev) => ({ ...prev, [key]: 'L\'image doit faire moins de 5 Mo' }));
```

### Option B: Use Shared Constant
**Pros:** Single source of truth
**Cons:** Minor refactor
**Effort:** Small
**Risk:** Low

```typescript
// lib/constants.ts
export const WEBSITE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
```

## Recommended Action

Option B - Create shared constant for consistency

## Technical Details

**Affected files:**
- `src/components/admin/ImageManager.tsx`
- `src/hooks/useWebsiteEditor.ts`
- Optionally create `src/lib/constants.ts`

## Acceptance Criteria

- [ ] All file size limits use consistent 5MB value
- [ ] Error messages are consistent
- [ ] Optionally use shared constant

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Validation limits should be consistent across layers |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
