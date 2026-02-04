# 🔴 CRITICAL: Orphaned Thumbnails Risk - Missing Transaction Boundaries

**Status:** completed
**Priority:** P1 (CRITICAL - Blocks merge)
**Category:** Data Integrity
**Created:** 2026-02-04
**Completed:** 2026-02-04
**Source:** Code review PR #37 - data-integrity-guardian agent

## Problem

Thumbnail files are uploaded to R2 BEFORE the database record is created. If the database insert fails, the thumbnail remains orphaned in R2, wasting storage and creating inconsistent state.

**Failure Scenario:**
1. ✅ Fetch original image from R2
2. ✅ Generate thumbnail
3. ✅ Upload thumbnail to R2 (thumbnail now exists in storage)
4. ❌ Database insert fails (trial limit, validation error, network issue)
5. ⚠️ Orphaned thumbnail remains in R2 forever

**Impact:**
- Wasted storage costs (orphaned files accumulate)
- Inconsistent state (files exist but no database record)
- No way to clean up orphaned files
- Violates data integrity principles

## Current Code

`src/pages/api/upload/confirm.ts:153-206`
```typescript
if (type === 'image') {
  try {
    // ... fetch and generate thumbnail ...

    // ❌ Upload happens BEFORE database insert
    const uploadResult = await uploadFile(
      thumbnailKey,
      thumbnail.buffer,
      'image/webp',
      { ... }
    );

    thumbnailUrl = uploadResult.url;  // Thumbnail now exists in R2!

  } catch (thumbnailError) {
    console.error('[API] Failed to generate thumbnail:', thumbnailError);
  }
}

// Database insert happens AFTER thumbnail upload
const { data: media, error } = await adminClient
  .from('media')
  .insert({
    wedding_id: weddingId,
    type,
    original_url: publicUrl,
    thumbnail_url: thumbnailUrl,  // References already-uploaded file
    // ...
  })
  .select()
  .single();

// ❌ If this fails, thumbnail is orphaned in R2!
if (error || !media) {
  // Thumbnail upload already succeeded, but no cleanup!
  throw new Error('Failed to create media record');
}
```

## Solution

### Option 1: Reverse Order (Upload After DB Insert)

```typescript
let thumbnailBuffer: Buffer | null = null;
let thumbnailKey: string | null = null;

// Step 1: Generate thumbnail but DON'T upload yet
if (type === 'image') {
  try {
    const originalImageBuffer = await fetchFile(key);
    const thumbnail = await generateThumbnail(originalImageBuffer, {
      width: 400,
      quality: 85,
      format: 'webp',
    });
    thumbnailBuffer = thumbnail.buffer;
    thumbnailKey = generateThumbnailKey(key, '400w');
  } catch (thumbnailError) {
    console.error('[API] Failed to generate thumbnail:', thumbnailError);
  }
}

// Step 2: Create database record FIRST (with null thumbnail)
const { data: media, error } = await adminClient
  .from('media')
  .insert({
    wedding_id: weddingId,
    type,
    original_url: publicUrl,
    thumbnail_url: null,  // Initially null
    // ...
    status: 'ready',
  })
  .select()
  .single();

if (error || !media) {
  throw new Error('Failed to create media record');
}

// Step 3: Upload thumbnail and update record (safe because DB record exists)
if (thumbnailBuffer && thumbnailKey) {
  try {
    const uploadResult = await uploadFile(
      thumbnailKey,
      thumbnailBuffer,
      'image/webp',
      { 'media-id': media.id, 'wedding-id': weddingId }
    );

    // Update database with thumbnail URL
    await adminClient
      .from('media')
      .update({ thumbnail_url: uploadResult.url })
      .eq('id', media.id);

    // Update response object
    media.thumbnail_url = uploadResult.url;
  } catch (uploadError) {
    console.error('[API] Failed to upload thumbnail after DB insert:', uploadError);
    // Database record exists, thumbnail upload failed - acceptable
  }
}

return apiResponse.success({ media });
```

### Option 2: Cleanup on Failure (Keep Current Order)

```typescript
let thumbnailUrl: string | null = null;
let uploadedThumbnailKey: string | null = null;

if (type === 'image') {
  try {
    const originalImageBuffer = await fetchFile(key);
    const thumbnail = await generateThumbnail(originalImageBuffer, {
      width: 400,
      quality: 85,
      format: 'webp',
    });

    const thumbnailKey = generateThumbnailKey(key, '400w');
    const uploadResult = await uploadFile(thumbnailKey, thumbnail.buffer, 'image/webp', { ... });

    thumbnailUrl = uploadResult.url;
    uploadedThumbnailKey = thumbnailKey;  // Track what we uploaded
  } catch (thumbnailError) {
    console.error('[API] Failed to generate thumbnail:', thumbnailError);
  }
}

// Database insert
const { data: media, error } = await adminClient
  .from('media')
  .insert({
    wedding_id: weddingId,
    type,
    original_url: publicUrl,
    thumbnail_url: thumbnailUrl,
    // ...
  })
  .select()
  .single();

if (error || !media) {
  // ✅ CLEANUP: Delete orphaned thumbnail if upload succeeded
  if (uploadedThumbnailKey) {
    try {
      await deleteFile(uploadedThumbnailKey);
      console.log('[API] Cleaned up orphaned thumbnail:', uploadedThumbnailKey);
    } catch (cleanupError) {
      console.error('[API] Failed to cleanup orphaned thumbnail:', cleanupError);
      // Log for manual cleanup
    }
  }

  throw new Error('Failed to create media record');
}
```

### Option 3: Async Background Processing (Best Long-Term)

Combined with TODO #029, move all thumbnail operations to background:

```typescript
// No thumbnail processing during confirmation
const { data: media } = await adminClient
  .from('media')
  .insert({
    wedding_id: weddingId,
    type,
    original_url: publicUrl,
    thumbnail_url: null,
    status: type === 'image' ? 'processing' : 'ready',
  })
  .select()
  .single();

// Background job handles thumbnail generation + upload atomically
if (type === 'image') {
  await thumbnailQueue.add('generate-thumbnail', {
    mediaId: media.id,
    key,
    weddingId,
  });
}
```

## Recommendation

**Short-term (for this PR):** Implement Option 1 (Reverse Order)
- Prevents orphaned files
- No cleanup logic needed
- Simpler and safer

**Long-term:** Implement Option 3 (Background Processing)
- Solves both performance AND data integrity issues
- Requires queue infrastructure
- Defer to post-launch

## Testing

Add failure scenario tests:

```typescript
it('should not leave orphaned thumbnails if database insert fails', async () => {
  // Mock database insert to fail
  mockAdminClient.from('media').insert.mockReturnValueOnce({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    }),
  });

  await expect(POST({ request })).rejects.toThrow('Failed to create media record');

  // Verify thumbnail was NOT uploaded (Option 1)
  // OR verify thumbnail was deleted (Option 2)
  expect(mockUploadFile).not.toHaveBeenCalled(); // Option 1
  // OR
  expect(mockDeleteFile).toHaveBeenCalledWith('weddings/123/thumbnails/photo-400w.webp'); // Option 2
});
```

## Additional Cleanup Task

Create a background job to scan for and remove orphaned thumbnails:

```typescript
// tools/cleanup-orphaned-thumbnails.ts
async function cleanupOrphanedThumbnails() {
  // 1. List all thumbnails in R2
  // 2. Check if corresponding media record exists in database
  // 3. Delete thumbnails without database records
  // 4. Report cleanup statistics
}
```

## References

- Database transaction best practices
- Two-phase commit pattern
- Review finding: data-integrity-guardian

## Blockers

None

## Estimated Effort

- Option 1: 2-3 hours (reorder + tests)
- Option 2: 3-4 hours (cleanup logic + tests)
- Option 3: Tracked in TODO #029

**Recommendation:** Implement Option 1 now (2-3 hours)
