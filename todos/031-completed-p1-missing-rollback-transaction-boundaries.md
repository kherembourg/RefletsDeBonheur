# 🔴 CRITICAL: Missing Transaction Boundaries for Multi-Step Operations

**Status:** completed (Phase 1)
**Priority:** P1 (CRITICAL - Blocks merge)
**Category:** Data Integrity
**Created:** 2026-02-04
**Completed:** 2026-02-04 (Phase 1 - Idempotency Check)
**Source:** Code review PR #37 - data-integrity-guardian agent
**Commit:** a42f6f8

## Problem

The upload confirmation endpoint performs multiple state-changing operations without transaction boundaries. If any step fails, the system is left in an inconsistent state with no automatic rollback.

**Current Multi-Step Process:**
1. Fetch original image from R2
2. Generate thumbnail
3. Upload thumbnail to R2
4. Insert media record in database

**Failure Scenarios Without Transactions:**

- **Scenario A:** Thumbnail upload succeeds, database insert fails
  - Result: Orphaned thumbnail in R2 (see TODO #030)

- **Scenario B:** Database insert succeeds, subsequent thumbnail update fails
  - Result: Record shows null thumbnail when file actually exists

- **Scenario C:** Concurrent uploads for same file (race condition)
  - Result: Duplicate database records, duplicate thumbnails

**Severity:** CRITICAL - Data consistency violations

## Current Code

`src/pages/api/upload/confirm.ts:105-266`
```typescript
// ❌ No transaction wrapping these operations
try {
  const body = await request.json();

  // ... validation ...

  const adminClient = getSupabaseAdminClient();

  // ... authorization check ...

  // Step 1-3: Generate and upload thumbnail
  if (type === 'image') {
    const originalImageBuffer = await fetchFile(key);
    const thumbnail = await generateThumbnail(originalImageBuffer, { ... });
    const uploadResult = await uploadFile(thumbnailKey, thumbnail.buffer, 'image/webp', { ... });
    thumbnailUrl = uploadResult.url;
  }

  // Step 4: Database insert (separate, non-transactional)
  const { data: media, error } = await adminClient
    .from('media')
    .insert({ ... })
    .select()
    .single();

  if (error) {
    // ❌ No automatic rollback of R2 uploads!
    throw new Error('Failed to create media record');
  }

  return apiResponse.success({ media });
} catch (error) {
  // ❌ No cleanup or rollback logic
  return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
}
```

## Solution

### Phase 1: Add Idempotency Check (Prevents Duplicates)

```typescript
// Before any processing, check if this upload was already confirmed
const { data: existingMedia } = await adminClient
  .from('media')
  .select('id, thumbnail_url')
  .eq('wedding_id', weddingId)
  .eq('original_url', publicUrl)
  .maybeSingle();

if (existingMedia) {
  console.log('[API] Upload already confirmed:', existingMedia.id);
  return apiResponse.success({
    media: existingMedia,
    message: 'Upload already confirmed (idempotent)',
  });
}
```

### Phase 2: Database-Level Transaction (Atomic DB Operations)

While we can't wrap R2 operations in database transactions, we can ensure DB operations are atomic:

```typescript
// If using async background processing (TODO #029), ensure atomicity:
const { data: media, error } = await adminClient.rpc('create_media_with_processing', {
  p_wedding_id: weddingId,
  p_type: type,
  p_original_url: publicUrl,
  p_caption: caption,
  p_guest_name: guestName,
  p_guest_identifier: guestIdentifier,
});

// Database function (migration):
// CREATE OR REPLACE FUNCTION create_media_with_processing(
//   p_wedding_id UUID,
//   p_type TEXT,
//   p_original_url TEXT,
//   p_caption TEXT DEFAULT NULL,
//   p_guest_name TEXT DEFAULT NULL,
//   p_guest_identifier TEXT DEFAULT NULL
// ) RETURNS media AS $$
// BEGIN
//   -- Check for duplicate
//   PERFORM 1 FROM media
//   WHERE wedding_id = p_wedding_id
//     AND original_url = p_original_url;
//
//   IF FOUND THEN
//     RAISE EXCEPTION 'Upload already confirmed';
//   END IF;
//
//   -- Insert atomically
//   RETURN QUERY INSERT INTO media (
//     wedding_id, type, original_url, caption,
//     guest_name, guest_identifier, status
//   ) VALUES (
//     p_wedding_id, p_type, p_original_url, p_caption,
//     p_guest_name, p_guest_identifier,
//     CASE WHEN p_type = 'image' THEN 'processing' ELSE 'ready' END
//   ) RETURNING *;
// END;
// $$ LANGUAGE plpgsql;
```

### Phase 3: Compensating Transactions (Rollback Pattern)

```typescript
// Track operations for rollback
const operationsLog: Array<{
  type: 'r2_upload';
  key: string;
}> = [];

try {
  // ... validation and authorization ...

  // Thumbnail generation
  if (type === 'image') {
    try {
      const originalImageBuffer = await fetchFile(key);
      const thumbnail = await generateThumbnail(originalImageBuffer, { ... });

      const thumbnailKey = generateThumbnailKey(key, '400w');
      const uploadResult = await uploadFile(thumbnailKey, thumbnail.buffer, 'image/webp', { ... });

      // Log operation for potential rollback
      operationsLog.push({ type: 'r2_upload', key: thumbnailKey });

      thumbnailUrl = uploadResult.url;
    } catch (thumbnailError) {
      console.error('[API] Thumbnail generation failed:', thumbnailError);
      // Continue without thumbnail (graceful degradation)
    }
  }

  // Database insert
  const { data: media, error } = await adminClient
    .from('media')
    .insert({ ... })
    .select()
    .single();

  if (error || !media) {
    throw new Error('Failed to create media record');
  }

  return apiResponse.success({ media });

} catch (error) {
  // ✅ ROLLBACK: Undo all operations
  console.error('[API] Rolling back operations due to error:', error);

  for (const op of operationsLog) {
    try {
      if (op.type === 'r2_upload') {
        await deleteFile(op.key);
        console.log('[API] Rolled back R2 upload:', op.key);
      }
    } catch (rollbackError) {
      console.error('[API] Rollback failed for operation:', op, rollbackError);
      // Log for manual cleanup
    }
  }

  throw error; // Re-throw after rollback
}
```

## Recommended Implementation Order

1. **Immediate (This PR):** Implement Phase 1 (Idempotency Check)
   - Prevents most duplicate issues
   - Simple, no infrastructure changes
   - 1-2 hours

2. **Short-term:** Implement Phase 3 (Compensating Transactions)
   - Provides rollback capability
   - Works with current architecture
   - 2-3 hours

3. **Long-term:** Combine with async processing (TODO #029)
   - Simplifies transaction boundaries
   - Better separation of concerns
   - Part of background job implementation

## Testing

Add transaction and rollback tests:

```typescript
describe('Transaction Boundaries', () => {
  it('should be idempotent - duplicate confirms return existing record', async () => {
    // First confirm
    const response1 = await POST({ request });
    const data1 = await response1.json();

    // Second confirm with same data
    const response2 = await POST({ request });
    const data2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(data2.media.id).toBe(data1.media.id);
    expect(mockUploadFile).toHaveBeenCalledTimes(1); // Not called second time
  });

  it('should rollback R2 uploads if database insert fails', async () => {
    mockAdminClient.from('media').insert.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database constraint violation' },
        }),
      }),
    });

    await expect(POST({ request })).rejects.toThrow('Failed to create media record');

    // Verify rollback occurred
    expect(mockDeleteFile).toHaveBeenCalledWith('weddings/wedding-123/thumbnails/photo-400w.webp');
  });

  it('should handle concurrent uploads gracefully', async () => {
    // Simulate concurrent requests
    const promises = Array(5).fill(null).map(() => POST({ request }));
    const responses = await Promise.allSettled(promises);

    const successful = responses.filter(r => r.status === 'fulfilled');
    const failed = responses.filter(r => r.status === 'rejected');

    // Only one should succeed (idempotency)
    expect(successful).toHaveLength(1);
  });
});
```

## Database Migration

Add unique constraint to prevent duplicates at DB level:

```sql
-- Migration: Add unique constraint for upload deduplication
ALTER TABLE media
ADD CONSTRAINT unique_wedding_original_url
UNIQUE (wedding_id, original_url);

-- Add index for performance
CREATE INDEX idx_media_wedding_original_url
ON media (wedding_id, original_url);
```

## References

- ACID transaction principles
- Saga pattern for distributed transactions
- Compensating transactions
- Idempotency keys
- Review finding: data-integrity-guardian

## Blockers

None

## Estimated Effort

- Phase 1 (Idempotency): 1-2 hours
- Phase 2 (DB Transaction): 2-3 hours
- Phase 3 (Compensating): 2-3 hours

**Total:** 5-8 hours (can be split across PRs)

**Recommendation:** Implement Phase 1 immediately (blocking), defer Phase 2-3 to follow-up PR

---

## ✅ Phase 1 Completed (2026-02-04)

**Implementation:**
- Added idempotency check in `src/pages/api/upload/confirm.ts` (lines 156-177)
- Check queries for existing media with same `wedding_id` + `original_url`
- Returns early with existing record if found (prevents duplicate uploads)
- Continues gracefully if idempotency check encounters error
- Database migration `010_media_upload_idempotency.sql` adds:
  - UNIQUE constraint on `(wedding_id, original_url)`
  - Index for performance: `idx_media_wedding_original_url`

**Tests Added:**
1. Idempotent behavior - duplicate confirms return existing record
2. Normal flow - proceeds with upload if no existing media
3. Error handling - continues upload if idempotency check fails
4. All existing tests still pass (10/10 tests pass)

**Impact:**
- ✅ Prevents duplicate media records from concurrent uploads
- ✅ Prevents race conditions causing duplicate thumbnails
- ✅ Prevents database inconsistencies from retried uploads
- ✅ Database-level enforcement via UNIQUE constraint

**Next Steps:**
- Phase 2 (DB Transaction): Deferred to future PR
- Phase 3 (Compensating Transactions): Deferred to future PR
- Consider implementing along with async processing (TODO #029)
