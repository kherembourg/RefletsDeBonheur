# 🟡 Add Agent-Accessible Thumbnail Regeneration Tool

**Status:** pending
**Priority:** P2 (IMPORTANT)
**Category:** Agent-Native Architecture
**Created:** 2026-02-04
**Source:** Code review PR #37 - agent-native-reviewer

## Problem

The thumbnail generation feature is not agent-accessible. Agents cannot:
- Regenerate failed thumbnails
- Generate thumbnails for existing media without them
- Optimize thumbnails with different settings
- Diagnose thumbnail generation failures

**Agent-Native Principle Violated:** Action Parity
> "Anything a user can do, an agent can do"

Currently, users can upload and trigger thumbnail generation, but agents have no way to retry or regenerate thumbnails programmatically.

## Current State

**User Actions:**
- ✅ Upload photo → triggers thumbnail generation
- ✅ View thumbnail in gallery
- ❌ Regenerate thumbnail (no UI or API)

**Agent Actions:**
- ❌ No API endpoint for thumbnail regeneration
- ❌ No way to query which media lacks thumbnails
- ❌ No way to retry failed thumbnail generation

## Solution

### 1. Create Admin API Endpoint

```typescript
// src/pages/api/admin/media/[id]/regenerate-thumbnail.ts

/**
 * POST /api/admin/media/{id}/regenerate-thumbnail
 *
 * Regenerates thumbnail for a media item
 *
 * Authorization: Requires admin access to the wedding
 *
 * Response:
 * {
 *   media: Media,
 *   thumbnail: {
 *     url: string,
 *     size: number,
 *     width: number,
 *     height: number
 *   }
 * }
 */
import type { APIRoute } from 'astro';
import { getSupabaseAdminClient } from '../../../../lib/supabase/server';
import { supabase } from '../../../../lib/supabase/client';
import { generateThumbnail } from '../../../../lib/imageProcessing';
import { fetchFile, uploadFile, generateThumbnailKey, extractKeyFromUrl } from '../../../../lib/r2';
import { apiGuards, apiResponse } from '../../../../lib/api/middleware';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  // Guards
  const supabaseGuard = apiGuards.requireSupabase();
  if (supabaseGuard) return supabaseGuard;

  const serviceRoleGuard = apiGuards.requireServiceRole();
  if (serviceRoleGuard) return serviceRoleGuard;

  const mediaId = params.id;
  if (!mediaId) {
    return new Response(JSON.stringify({ error: 'Missing media ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const adminClient = getSupabaseAdminClient();

    // Get media record
    const { data: media, error: mediaError } = await adminClient
      .from('media')
      .select('id, wedding_id, type, original_url, thumbnail_url')
      .eq('id', mediaId)
      .single();

    if (mediaError || !media) {
      return new Response(JSON.stringify({ error: 'Media not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this wedding
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        const { data: wedding } = await adminClient
          .from('weddings')
          .select('owner_id')
          .eq('id', media.wedding_id)
          .single();

        if (!wedding || wedding.owner_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Only regenerate for images
    if (media.type !== 'image') {
      return new Response(
        JSON.stringify({
          error: 'Cannot generate thumbnail for non-image media',
          message: 'Thumbnails can only be generated for images, not videos',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract key from original URL
    const key = extractKeyFromUrl(media.original_url);
    if (!key) {
      return new Response(
        JSON.stringify({ error: 'Invalid original URL' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[API] Regenerating thumbnail for media:', mediaId);

    // Fetch original image
    const originalImageBuffer = await fetchFile(key);

    // Generate thumbnail
    const thumbnail = await generateThumbnail(originalImageBuffer, {
      width: 400,
      quality: 85,
      format: 'webp',
    });

    // Upload thumbnail
    const thumbnailKey = generateThumbnailKey(key, '400w');
    const uploadResult = await uploadFile(
      thumbnailKey,
      thumbnail.buffer,
      'image/webp',
      {
        'wedding-id': media.wedding_id,
        'media-id': mediaId,
        'original-key': key,
        'thumbnail-size': '400w',
        'regenerated-at': new Date().toISOString(),
      }
    );

    // Update database
    const { data: updatedMedia, error: updateError } = await adminClient
      .from('media')
      .update({ thumbnail_url: uploadResult.url })
      .eq('id', mediaId)
      .select()
      .single();

    if (updateError || !updatedMedia) {
      throw new Error('Failed to update media record');
    }

    console.log('[API] Thumbnail regenerated successfully:', uploadResult.url);

    return apiResponse.success({
      media: updatedMedia,
      thumbnail: {
        url: uploadResult.url,
        size: thumbnail.size,
        width: thumbnail.width,
        height: thumbnail.height,
      },
      message: 'Thumbnail regenerated successfully',
    });
  } catch (error) {
    console.error('[API] Thumbnail regeneration failed:', error);

    return new Response(
      JSON.stringify({
        error: 'Thumbnail regeneration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
```

### 2. Create Batch Regeneration Endpoint

```typescript
// src/pages/api/admin/weddings/[id]/regenerate-thumbnails.ts

/**
 * POST /api/admin/weddings/{id}/regenerate-thumbnails
 *
 * Regenerates thumbnails for all images in a wedding
 * Optional query params:
 * - missingOnly=true: Only regenerate for media without thumbnails
 * - limit=10: Limit number of regenerations
 *
 * Response:
 * {
 *   processed: number,
 *   succeeded: number,
 *   failed: number,
 *   results: Array<{ mediaId: string, success: boolean, error?: string }>
 * }
 */
export const POST: APIRoute = async ({ params, request, url }) => {
  const weddingId = params.id;
  const missingOnly = url.searchParams.get('missingOnly') === 'true';
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  // ... authorization checks ...

  const adminClient = getSupabaseAdminClient();

  // Query media items
  let query = adminClient
    .from('media')
    .select('id, type, original_url, thumbnail_url')
    .eq('wedding_id', weddingId)
    .eq('type', 'image');

  if (missingOnly) {
    query = query.is('thumbnail_url', null);
  }

  query = query.limit(limit);

  const { data: mediaItems, error } = await query;

  if (error || !mediaItems) {
    return new Response(JSON.stringify({ error: 'Failed to fetch media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Process each media item
  const results = await Promise.allSettled(
    mediaItems.map(async (item) => {
      const key = extractKeyFromUrl(item.original_url);
      if (!key) throw new Error('Invalid URL');

      const buffer = await fetchFile(key);
      const thumbnail = await generateThumbnail(buffer, {
        width: 400,
        quality: 85,
        format: 'webp',
      });

      const thumbnailKey = generateThumbnailKey(key, '400w');
      const uploadResult = await uploadFile(thumbnailKey, thumbnail.buffer, 'image/webp', {
        'wedding-id': weddingId,
        'media-id': item.id,
      });

      await adminClient
        .from('media')
        .update({ thumbnail_url: uploadResult.url })
        .eq('id', item.id);

      return { mediaId: item.id, success: true };
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return apiResponse.success({
    processed: mediaItems.length,
    succeeded,
    failed,
    results: results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : {
            mediaId: mediaItems[i].id,
            success: false,
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          }
    ),
  });
};
```

### 3. Add Query Endpoint for Missing Thumbnails

```typescript
// src/pages/api/admin/weddings/[id]/media-without-thumbnails.ts

/**
 * GET /api/admin/weddings/{id}/media-without-thumbnails
 *
 * Lists all images without thumbnails
 *
 * Response:
 * {
 *   count: number,
 *   media: Array<Media>
 * }
 */
export const GET: APIRoute = async ({ params, request }) => {
  // ... authorization ...

  const { data: media, error } = await adminClient
    .from('media')
    .select('*')
    .eq('wedding_id', params.id)
    .eq('type', 'image')
    .is('thumbnail_url', null)
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: 'Query failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return apiResponse.success({
    count: media.length,
    media,
  });
};
```

## Usage Examples

```bash
# Agent can regenerate a single thumbnail
curl -X POST https://app.com/api/admin/media/abc123/regenerate-thumbnail \
  -H "Authorization: Bearer $TOKEN"

# Agent can find media without thumbnails
curl https://app.com/api/admin/weddings/wedding-123/media-without-thumbnails \
  -H "Authorization: Bearer $TOKEN"

# Agent can batch regenerate missing thumbnails
curl -X POST "https://app.com/api/admin/weddings/wedding-123/regenerate-thumbnails?missingOnly=true" \
  -H "Authorization: Bearer $TOKEN"

# Agent can regenerate all thumbnails (with limit)
curl -X POST "https://app.com/api/admin/weddings/wedding-123/regenerate-thumbnails?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

## Testing

```typescript
describe('Thumbnail Regeneration API', () => {
  it('should regenerate thumbnail for a single media item', async () => {
    const response = await fetch('/api/admin/media/abc123/regenerate-thumbnail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.media.thumbnail_url).toBeTruthy();
    expect(data.thumbnail.width).toBeLessThanOrEqual(400);
  });

  it('should list media without thumbnails', async () => {
    const response = await fetch('/api/admin/weddings/wedding-123/media-without-thumbnails', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    expect(data.count).toBeGreaterThanOrEqual(0);
    expect(data.media).toBeInstanceOf(Array);
  });

  it('should batch regenerate missing thumbnails', async () => {
    const response = await fetch(
      '/api/admin/weddings/wedding-123/regenerate-thumbnails?missingOnly=true',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await response.json();
    expect(data.processed).toBeGreaterThan(0);
    expect(data.succeeded + data.failed).toBe(data.processed);
  });
});
```

## Benefits

- **Agent Parity:** Agents can now manage thumbnails like users
- **Recovery:** Can fix failed thumbnail generations
- **Maintenance:** Can regenerate thumbnails with updated settings
- **Diagnostics:** Can query and analyze thumbnail coverage

## References

- Agent-Native Architecture principles
- Review finding: agent-native-reviewer
- TODO #029 (Async processing) - complements this feature

## Blockers

None

## Estimated Effort

4-6 hours (3 endpoints + tests + documentation)
