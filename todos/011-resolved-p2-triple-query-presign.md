---
status: pending
priority: p2
issue_id: "011"
tags: [code-review, performance, pr-25]
dependencies: ["010"]
---

# Triple Query in presign.ts for Trial Limits

## Problem Statement

Each upload request makes 3 sequential database queries. For a batch upload of 10 photos, this is 30 queries = ~1.5 seconds of overhead.

## Findings

### From performance-oracle agent:
- **Location**: `src/pages/api/upload/presign.ts` (lines 69-173)

**Current flow:**
```typescript
// Query 1: Get wedding owner
const { data: wedding } = await adminClient.from('weddings').select('owner_id')...

// Query 2: Get subscription status
const { data: profile } = await adminClient.from('profiles').select('subscription_status')...

// Query 3: Count media
const { count } = await adminClient.from('media').select('*', { count: 'exact', head: true })...
```

**Impact**: ~150-200ms per upload request (3 sequential queries)

## Proposed Solutions

### Option A: Single query with JOIN
```typescript
const { data } = await adminClient
  .from('weddings')
  .select(`
    owner_id,
    profiles!inner(subscription_status),
    photo_count:media(count).filter(type.eq.photo),
    video_count:media(count).filter(type.eq.video)
  `)
  .eq('id', weddingId)
  .single();
```
**Pros**: 66% reduction in queries
**Cons**: More complex query
**Effort**: Low
**Risk**: Low

### Option B: Postgres function
```sql
CREATE FUNCTION check_upload_eligibility(p_wedding_id UUID, p_content_type TEXT)
RETURNS JSON AS $$
  -- Returns subscription_status, photo_count, video_count
$$;
```
**Pros**: Cleanest API
**Cons**: Requires migration
**Effort**: Medium
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected Files:**
- `src/pages/api/upload/presign.ts`

## Acceptance Criteria

- [ ] Presign endpoint makes <= 1 database query for trial checks
- [ ] Response time improved by 60%+
- [ ] Functionality unchanged

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by performance-oracle agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
