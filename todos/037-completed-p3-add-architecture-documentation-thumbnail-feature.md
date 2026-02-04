# ✅ Add Architecture Documentation for Thumbnail Feature

**Status:** completed
**Priority:** P3 (NICE-TO-HAVE)
**Category:** Documentation
**Created:** 2026-02-04
**Completed:** 2026-02-04
**Source:** Code review PR #37 - architecture-strategist agent

## Problem

The thumbnail generation feature has excellent architecture but lacks documentation. New developers need to understand:
- How thumbnail generation fits into the upload flow
- Storage structure and naming conventions
- Error handling and graceful degradation
- Performance characteristics
- Future optimization path (async processing)

## Current State

Documentation exists for:
- ✅ General upload flow
- ✅ R2 storage structure
- ✅ API endpoints

Missing documentation:
- ❌ Thumbnail generation workflow
- ❌ Sharp integration details
- ❌ Performance impact
- ❌ Async processing migration path

## Solution

Create comprehensive architecture documentation:

### 1. Create `docs/architecture/THUMBNAIL_GENERATION.md`

```markdown
# Thumbnail Generation Architecture

## Overview

Automatic thumbnail generation for uploaded images using Sharp library. Generates optimized 400px WEBP thumbnails for fast gallery loading.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Upload Flow                              │
└─────────────────────────────────────────────────────────────────┘

Client                  API Server              R2 Storage         Database
  │                         │                        │                │
  │ 1. Request presigned    │                        │                │
  │    upload URL           │                        │                │
  ├────────────────────────>│                        │                │
  │                         │                        │                │
  │ 2. Return presigned URL │                        │                │
  │<────────────────────────┤                        │                │
  │                         │                        │                │
  │ 3. Upload original      │                        │                │
  │    image directly       │                        │                │
  ├─────────────────────────┼───────────────────────>│                │
  │                         │                        │                │
  │ 4. Confirm upload       │                        │                │
  ├────────────────────────>│                        │                │
  │                         │                        │                │
  │                         │ 5. Fetch original      │                │
  │                         ├───────────────────────>│                │
  │                         │                        │                │
  │                         │ 6. Return buffer       │                │
  │                         │<───────────────────────┤                │
  │                         │                        │                │
  │                         │ 7. Generate thumbnail  │                │
  │                         │    (Sharp processing)  │                │
  │                         │                        │                │
  │                         │ 8. Upload thumbnail    │                │
  │                         ├───────────────────────>│                │
  │                         │                        │                │
  │                         │ 9. Create media record │                │
  │                         ├────────────────────────┼───────────────>│
  │                         │                        │                │
  │ 10. Return success      │                        │                │
  │<────────────────────────┤                        │                │
```

## Storage Structure

```
weddings/{wedding-id}/
├── media/
│   ├── {timestamp}-{random}-{filename}.jpg     # Original images
│   ├── {timestamp}-{random}-{filename}.png
│   └── {timestamp}-{random}-{filename}.mp4     # Videos (no thumbnail)
└── thumbnails/
    ├── {timestamp}-{random}-{filename}-400w.webp  # 400px thumbnails
    └── {timestamp}-{random}-{filename}-400w.webp
```

**Naming Convention:**
- Original: `{timestamp}-{random}-{sanitized-name}.{ext}`
- Thumbnail: `{same-name}-400w.webp`

## Components

### 1. Image Processing (`src/lib/imageProcessing.ts`)

**Purpose:** Sharp-based image processing utilities

**Key Function:**
```typescript
generateThumbnail(imageBuffer: Buffer, options?: ThumbnailOptions): Promise<ProcessedImage>
```

**Options:**
- `width`: Target width (default: 400px)
- `quality`: Compression quality 1-100 (default: 85)
- `format`: Output format (default: 'webp')

**Behavior:**
- Maintains aspect ratio
- Never enlarges images
- Converts to WEBP for optimal size/quality
- Returns buffer with metadata

### 2. R2 Client (`src/lib/r2/client.ts`)

**New Functions:**

```typescript
// Fetch file from R2 as buffer
fetchFile(key: string): Promise<Buffer>

// Generate thumbnail key from original key
generateThumbnailKey(originalKey: string, suffix?: string): string
```

### 3. Upload Confirm Endpoint (`src/pages/api/upload/confirm.ts`)

**Thumbnail Generation Logic:**

1. **Check media type:** Only process `type === 'image'`
2. **Fetch original:** Download from R2 using `fetchFile()`
3. **Generate thumbnail:** Process with Sharp
4. **Upload thumbnail:** Store in R2 under thumbnails/
5. **Update database:** Set `thumbnail_url` field
6. **Graceful degradation:** If thumbnail fails, upload still succeeds

**Error Handling:**
```typescript
try {
  // ... thumbnail generation ...
} catch (thumbnailError) {
  console.error('[API] Failed to generate thumbnail:', thumbnailError);
  // Continue without thumbnail - upload succeeds
}
```

## Performance Characteristics

### Current (Synchronous) Implementation

**Processing Time:**
- Fetch original: 200-400ms
- Sharp processing: 300-1000ms
- Upload thumbnail: 100-400ms
- **Total added latency: 500-1800ms per upload**

**Throughput:**
- Single upload: 500-1800ms
- 10 concurrent uploads: ~5-18 seconds total
- Bottleneck: Synchronous processing

### Future (Async) Implementation

See TODO #029 for async background processing plan.

**Expected Performance:**
- API response: 50-150ms (10-30x faster)
- Thumbnail generation: Happens in background
- Throughput: 100+ concurrent uploads

## Graceful Degradation

Thumbnail generation failures don't prevent uploads:

1. If Sharp processing fails → Continue with `thumbnail_url: null`
2. If R2 upload fails → Continue with `thumbnail_url: null`
3. Frontend displays original image when thumbnail missing
4. Thumbnails can be regenerated later (see TODO #036)

## Database Schema

```sql
-- media table
CREATE TABLE media (
  id UUID PRIMARY KEY,
  wedding_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,  -- NULL if generation failed or not applicable (videos)
  -- ... other fields
);

-- Thumbnails are NULL for:
-- 1. Videos (not supported yet)
-- 2. Images where generation failed
-- 3. Images uploaded before this feature
```

## Frontend Integration

### MediaCard Component

```typescript
// Uses thumbnail if available, falls back to original
<img
  src={item.thumbnailUrl || item.url}
  alt={item.caption}
  loading="lazy"
/>
```

### Placeholder Handling

While thumbnail loads:
1. Show pre-generated SVG placeholder (if available)
2. Fall back to gradient placeholder
3. Fade in thumbnail when loaded

## Testing Strategy

### Unit Tests
- `imageProcessing.test.ts`: Sharp processing
- `r2/client.test.ts`: Key generation, file operations

### Integration Tests
- `upload/confirm.test.ts`: End-to-end thumbnail flow
  - Successful generation
  - Dimensions and format validation
  - Video handling (no thumbnail)
  - Error handling and graceful degradation
  - Storage path patterns
  - Authorization

## Future Enhancements

### Short-term
1. **Async processing** (TODO #029) - Background job queue
2. **Validation** (TODO #028) - Magic number checks
3. **Rate limiting** (TODO #034) - Per-wedding limits

### Long-term
1. **Multiple sizes** - 400w, 800w, 1200w for responsive images
2. **Video thumbnails** - Extract first frame with FFmpeg
3. **Blurhash** - Generate for smoother placeholders
4. **WebP fallback** - JPEG thumbnails for old browsers
5. **CDN integration** - Cloudflare Images for transforms

## Security Considerations

See related security TODOs:
- TODO #026: Memory exhaustion prevention
- TODO #027: SSRF vulnerability in fetchFile
- TODO #028: Content-type validation
- TODO #035: Path traversal in generateThumbnailKey

## Monitoring & Debugging

### Logs

```
[API] Generating thumbnail for: weddings/abc/media/photo.jpg
[API] Thumbnail generated successfully: weddings/abc/thumbnails/photo-400w.webp
[API] Failed to generate thumbnail: <error>
```

### Metrics to Track
- Thumbnail generation success rate
- Average processing time
- Storage usage (thumbnails vs originals)
- Cache hit rate (if CDN added)

## References

- Sharp documentation: https://sharp.pixelplumbing.com/
- WEBP format: https://developers.google.com/speed/webp
- Cloudflare R2: https://developers.cloudflare.com/r2/
```

### 2. Update Main Architecture Documentation

Add thumbnail section to `docs/architecture/PAGES.md`:

```markdown
## Upload Flow with Thumbnails

1. User selects image
2. Client requests presigned upload URL from `/api/upload/presign`
3. Client uploads directly to R2 using presigned URL
4. Client confirms upload via `/api/upload/confirm`
5. **Server generates 400px WEBP thumbnail (if image)**
6. Server stores both URLs in database
7. Gallery displays thumbnails for fast loading
```

### 3. Add to README / CLAUDE.md

```markdown
## Features

- **Automatic Thumbnails:** 400px WEBP thumbnails generated for all uploaded images
  - Fast gallery loading
  - Graceful degradation if generation fails
  - See `docs/architecture/THUMBNAIL_GENERATION.md`
```

## Benefits

- **Onboarding:** New developers understand the feature quickly
- **Maintenance:** Clear documentation for future changes
- **Architecture:** Documents design decisions and trade-offs
- **Migration:** Clear path for async processing upgrade

## References

- Review finding: architecture-strategist (recommended documentation updates)
- Architecture-as-code principles

## Blockers

None

## Estimated Effort

2-3 hours (write documentation + diagrams + update existing docs)
