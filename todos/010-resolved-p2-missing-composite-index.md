---
status: pending
priority: p2
issue_id: "010"
tags: [code-review, performance, database, pr-25]
dependencies: []
---

# Missing Composite Index for Trial Limit Queries

## Problem Statement

Trial limit queries filter by `(wedding_id, type)` but only `wedding_id` is indexed. Without a composite index, Postgres scans all media for the wedding and filters by type.

## Findings

### From performance-oracle agent:
- **Schema**: `supabase/migrations/001_initial_schema.sql`
- **Current Index**: `CREATE INDEX idx_media_wedding ON media(wedding_id);`
- **Missing Index**: `(wedding_id, type)` composite

**Query at** `src/pages/api/upload/presign.ts` (lines 119-123):
```typescript
.from('media')
.select('*', { count: 'exact', head: true })
.eq('wedding_id', weddingId)
.eq('type', 'photo');  // 'type' filter not covered by index
```

**Impact**: At 1000 photos per wedding, query is O(n) instead of O(log n)

## Proposed Solutions

### Option A: Add composite index (RECOMMENDED)
```sql
CREATE INDEX idx_media_wedding_type ON media(wedding_id, type);
```
**Pros**: Simple, effective
**Cons**: Slightly larger index
**Effort**: Low
**Risk**: Low

## Recommended Action

_To be filled during triage_

## Technical Details

**New Migration:**
```sql
CREATE INDEX idx_media_wedding_type ON media(wedding_id, type);
```

## Acceptance Criteria

- [ ] Composite index created
- [ ] EXPLAIN ANALYZE shows index-only scan for count queries
- [ ] Migration runs without issues

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-28 | Created during PR #25 code review | Identified by performance-oracle agent |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/25
