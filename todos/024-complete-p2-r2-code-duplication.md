---
status: complete
priority: p2
issue_id: "024"
tags: [code-review, code-quality, dry, pr-30]
dependencies: []
---

# R2 Configuration Code Duplication

## Problem Statement

The `website-image.ts` API endpoint duplicates R2 configuration and S3 client initialization code that already exists in `src/lib/r2/client.ts`. This creates maintenance burden and potential for drift.

## Findings

**Duplicate code in:** `src/pages/api/upload/website-image.ts:40-76`

```typescript
// Duplicated: getR2Config() - 18 lines
function getR2Config() {
  const accountId = import.meta.env.R2_ACCOUNT_ID;
  // ...
}

// Duplicated: getS3Client() - 15 lines
let s3Client: S3Client | null = null;
function getS3Client(config: ...) { ... }
```

**Existing code in:** `src/lib/r2/client.ts`
- `isR2Configured()`
- `generatePresignedUploadUrl()`
- S3 client initialization

**Impact:**
- ~36 lines of duplicate code
- Bug fixes need to be applied in two places
- Inconsistent behavior possible

## Proposed Solutions

### Option A: Import from lib/r2 (Recommended)
**Pros:** DRY, single source of truth
**Cons:** May need to extend existing functions
**Effort:** Small (30 minutes)
**Risk:** Low

```typescript
import { isR2Configured, getR2Config } from '../../../lib/r2/client';
import { generatePresignedUploadUrl } from '../../../lib/r2';
```

### Option B: Extend generatePresignedUploadUrl
**Pros:** Full reuse
**Cons:** Changes existing API
**Effort:** Medium
**Risk:** Low

Add optional `subfolder` parameter to existing function.

## Recommended Action

Option A - Import existing utilities, extend if needed

## Technical Details

**Affected files:**
- `src/pages/api/upload/website-image.ts`
- `src/lib/r2/client.ts` (if extending)

**LOC Reduction:** ~36 lines

## Acceptance Criteria

- [ ] No duplicate R2 config code
- [ ] website-image.ts uses lib/r2 utilities
- [ ] All existing functionality preserved
- [ ] Tests pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | DRY - Don't Repeat Yourself |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
- Existing R2 code: src/lib/r2/client.ts
