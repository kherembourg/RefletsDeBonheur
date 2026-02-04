# 🔴 CRITICAL: Synchronous Thumbnail Generation Creates 500-1800ms Latency

**Status:** completed
**Priority:** P1 (CRITICAL - Blocks merge)
**Category:** Performance
**Created:** 2026-02-04
**Completed:** 2026-02-04
**Source:** Code review PR #37 - performance-oracle agent
**Solution:** Implemented Option 1 (Simple Async Fire-and-Forget)

## Problem

Thumbnail generation runs synchronously during upload confirmation, adding 500-1800ms of latency to every image upload. This creates a poor user experience and limits upload throughput.

**Current Flow:**
1. Client uploads image to R2 (direct upload)
2. Client calls `/api/upload/confirm`
3. **Server fetches image from R2** (200-400ms)
4. **Server generates thumbnail with Sharp** (300-1000ms)
5. **Server uploads thumbnail to R2** (100-400ms)
6. Server creates database record
7. Response returned to client

**Total Added Latency:** 500-1800ms per upload

**Impact:**
- Poor UX (users wait for each upload)
- Low throughput (can't upload multiple images efficiently)
- Server resources tied up during processing
- Doesn't scale with concurrent uploads

## Current Code

`src/pages/api/upload/confirm.ts:153-188`
```typescript
// Synchronous processing blocks the response
if (type === 'image') {
  try {
    console.log('[API] Generating thumbnail for:', key);

    // ❌ Blocking I/O operations
    const originalImageBuffer = await fetchFile(key);  // 200-400ms
    const thumbnail = await generateThumbnail(originalImageBuffer, { // 300-1000ms
      width: 400,
      quality: 85,
      format: 'webp',
    });
    const uploadResult = await uploadFile(...);  // 100-400ms

    thumbnailUrl = uploadResult.url;
  } catch (thumbnailError) {
    console.error('[API] Failed to generate thumbnail:', thumbnailError);
  }
}

// Only now can we create the database record and respond
const { data: media, error } = await adminClient
  .from('media')
  .insert({ ... })
```

## Solution

Move thumbnail generation to an async background job:

### Option 1: Simple Async Fire-and-Forget (Quick Fix)

```typescript
// In confirm.ts
if (type === 'image') {
  // Create media record immediately WITHOUT thumbnail
  const { data: media, error } = await adminClient
    .from('media')
    .insert({
      wedding_id: weddingId,
      type,
      original_url: publicUrl,
      thumbnail_url: null,  // Initially null
      // ... other fields
      status: 'processing',  // New status
    })
    .select()
    .single();

  // Fire off async thumbnail generation (don't await)
  generateThumbnailAsync(media.id, key, weddingId).catch(err => {
    console.error('[API] Background thumbnail generation failed:', err);
  });

  return apiResponse.success({ media });
}

// New background function
async function generateThumbnailAsync(
  mediaId: string,
  key: string,
  weddingId: string
): Promise<void> {
  try {
    const originalImageBuffer = await fetchFile(key);
    const thumbnail = await generateThumbnail(originalImageBuffer, {
      width: 400,
      quality: 85,
      format: 'webp',
    });

    const thumbnailKey = generateThumbnailKey(key, '400w');
    const uploadResult = await uploadFile(thumbnailKey, thumbnail.buffer, 'image/webp', {
      'wedding-id': weddingId,
      'original-key': key,
      'thumbnail-size': '400w',
    });

    // Update database with thumbnail URL
    await adminClient
      .from('media')
      .update({
        thumbnail_url: uploadResult.url,
        status: 'ready',
      })
      .eq('id', mediaId);

    console.log('[API] Background thumbnail generated:', uploadResult.url);
  } catch (error) {
    console.error('[API] Background thumbnail generation failed:', error);
    // Update status to ready even if thumbnail failed (graceful degradation)
    await adminClient
      .from('media')
      .update({ status: 'ready' })
      .eq('id', mediaId);
  }
}
```

### Option 2: Proper Background Queue (Production-Ready)

Use a background job system like BullMQ, Inngest, or Cloudflare Queues:

```typescript
// In confirm.ts
if (type === 'image') {
  const { data: media } = await adminClient
    .from('media')
    .insert({
      wedding_id: weddingId,
      type,
      original_url: publicUrl,
      thumbnail_url: null,
      status: 'processing',
    })
    .select()
    .single();

  // Enqueue background job
  await thumbnailQueue.add('generate-thumbnail', {
    mediaId: media.id,
    key,
    weddingId,
  });

  return apiResponse.success({ media });
}
```

## Expected Performance Improvement

**Before:** 500-1800ms response time
**After (Option 1):** 50-150ms response time (10-30x faster)
**After (Option 2):** 50-150ms + reliable processing

## Frontend Changes Required

Update gallery to handle `status: 'processing'`:

```typescript
// In MediaCard.tsx
{item.status === 'processing' && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
    <Spinner size="sm" />
    <span className="ml-2 text-xs text-white">Generating thumbnail...</span>
  </div>
)}
```

## Database Migration

Add status column if not exists:

```sql
ALTER TABLE media
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready'
CHECK (status IN ('processing', 'ready', 'failed'));
```

## Testing

Update tests to verify async behavior:

```typescript
it('should return immediately without waiting for thumbnail', async () => {
  const start = Date.now();
  const response = await POST({ request });
  const duration = Date.now() - start;

  expect(response.status).toBe(200);
  expect(duration).toBeLessThan(200); // Should be fast!

  const data = await response.json();
  expect(data.media.status).toBe('processing');
  expect(data.media.thumbnail_url).toBeNull();
});

it('should eventually update thumbnail in background', async () => {
  const response = await POST({ request });
  const data = await response.json();

  // Wait for background processing
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: updatedMedia } = await adminClient
    .from('media')
    .select('thumbnail_url, status')
    .eq('id', data.media.id)
    .single();

  expect(updatedMedia.status).toBe('ready');
  expect(updatedMedia.thumbnail_url).toBeTruthy();
});
```

## References

- Review finding: performance-oracle
- Background Jobs Best Practices
- Async Processing Patterns

## Blockers

- Decision needed: Option 1 (quick fix) or Option 2 (proper queue)?
- Frontend changes for `processing` status

## Estimated Effort

- Option 1: 3-4 hours (async function + frontend + tests)
- Option 2: 8-12 hours (queue setup + worker + monitoring)

**Recommendation:** Start with Option 1, migrate to Option 2 post-launch
