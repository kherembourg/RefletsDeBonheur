# Thumbnail Generation Architecture

## Overview

Automatic thumbnail generation for uploaded images using the Sharp library. The system generates optimized 400px WEBP thumbnails for fast gallery loading while maintaining high image quality. Thumbnail generation runs asynchronously in the background to minimize upload latency.

**Key Features:**
- Automatic generation for all uploaded images
- 400px width with maintained aspect ratio
- WEBP format for optimal compression (85% quality)
- Asynchronous processing (non-blocking)
- Graceful degradation on failures
- Magic number validation for security

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Upload Flow with Thumbnails                     │
└──────────────────────────────────────────────────────────────────────┘

Client              API Server             R2 Storage           Database
  │                      │                       │                   │
  │ 1. Request presigned │                       │                   │
  │    upload URL        │                       │                   │
  ├─────────────────────>│                       │                   │
  │                      │                       │                   │
  │ 2. Return presigned  │                       │                   │
  │    URL + key         │                       │                   │
  │<─────────────────────┤                       │                   │
  │                      │                       │                   │
  │ 3. Upload original   │                       │                   │
  │    image directly    │                       │                   │
  ├──────────────────────┼──────────────────────>│                   │
  │                      │                       │                   │
  │ 4. Confirm upload    │                       │                   │
  ├─────────────────────>│                       │                   │
  │                      │                       │                   │
  │                      │ 5. Create media       │                   │
  │                      │    record (processing)│                   │
  │                      ├───────────────────────┼──────────────────>│
  │                      │                       │                   │
  │ 6. Return success    │                       │                   │
  │    (status=processing│                       │                   │
  │<─────────────────────┤                       │                   │
  │                      │                       │                   │
  │                      │ ╔═══════════════════════════════════════╗ │
  │                      │ ║   ASYNC BACKGROUND PROCESSING         ║ │
  │                      │ ╚═══════════════════════════════════════╝ │
  │                      │                       │                   │
  │                      │ 7. Fetch original     │                   │
  │                      ├──────────────────────>│                   │
  │                      │                       │                   │
  │                      │ 8. Return buffer      │                   │
  │                      │<──────────────────────┤                   │
  │                      │                       │                   │
  │                      │ 9. Generate thumbnail │                   │
  │                      │    (Sharp processing) │                   │
  │                      │    • Validate buffer  │                   │
  │                      │    • Resize to 400px  │                   │
  │                      │    • Convert to WEBP  │                   │
  │                      │                       │                   │
  │                      │ 10. Upload thumbnail  │                   │
  │                      ├──────────────────────>│                   │
  │                      │                       │                   │
  │                      │ 11. Update media      │                   │
  │                      │     (thumbnail_url +  │                   │
  │                      │      status=ready)    │                   │
  │                      ├───────────────────────┼──────────────────>│
```

## Storage Structure

```
R2 Bucket Root
└── weddings/
    └── {wedding-id}/
        ├── media/
        │   ├── {timestamp}-{random}-{filename}.jpg     # Original images
        │   ├── {timestamp}-{random}-{filename}.png
        │   └── {timestamp}-{random}-{filename}.mp4     # Videos (no thumbnail yet)
        └── thumbnails/
            ├── {timestamp}-{random}-{filename}-400w.webp  # 400px thumbnails
            └── {timestamp}-{random}-{filename}-400w.webp
```

**Naming Convention:**
- **Original:** `{timestamp}-{random}-{sanitized-name}.{ext}`
  - Example: `1738681234567-a3f8k2-wedding-photo.jpg`
- **Thumbnail:** `{same-base-name}-400w.webp`
  - Example: `1738681234567-a3f8k2-wedding-photo-400w.webp`

**Path Pattern:**
- Original: `weddings/{wedding-id}/media/{filename}`
- Thumbnail: `weddings/{wedding-id}/thumbnails/{filename-without-ext}-400w.webp`

## Components

### 1. Image Processing (`src/lib/imageProcessing.ts`)

**Purpose:** Sharp-based image processing utilities with security validation.

**Key Function:**
```typescript
generateThumbnail(
  imageBuffer: Buffer,
  options?: ThumbnailOptions
): Promise<ProcessedImage>
```

**Options:**
```typescript
interface ThumbnailOptions {
  width?: number;        // Target width (default: 400px)
  quality?: number;      // Compression quality 1-100 (default: 85)
  format?: 'webp' | 'jpeg' | 'png';  // Output format (default: 'webp')
}
```

**Behavior:**
- Validates buffer using magic numbers (JPEG, PNG, GIF, WEBP)
- Maintains aspect ratio automatically
- Never enlarges images (`withoutEnlargement: true`)
- Converts to WEBP for optimal size/quality ratio
- Applies pixel limit (268,402,689 pixels = 16384×16384 max)
- Returns buffer with metadata (width, height, size, format)

**Error Handling:**
- Throws detailed errors for invalid inputs
- Validates magic numbers before processing
- Handles Sharp processing errors with context
- Re-throws validation errors directly

### 2. R2 Client (`src/lib/r2/client.ts`)

**New Functions:**

```typescript
// Fetch file from R2 as buffer
fetchFile(key: string): Promise<Buffer>
```
- Validates storage key pattern
- Fetches file from R2 using GetObjectCommand
- Converts stream to buffer
- Throws error if file not found

```typescript
// Generate thumbnail key from original key
generateThumbnailKey(
  originalKey: string,
  suffix?: string
): string
```
- Validates input key format
- Extracts wedding ID and filename
- Validates suffix (alphanumeric + hyphens only)
- Returns thumbnail path with suffix and .webp extension
- Prevents path traversal attacks

**Security Validation:**
```typescript
function validateStorageKey(key: string): void
```
- Must start with `weddings/` prefix
- No path traversal (`..` or `//`)
- Matches pattern: `weddings/{id}/(media|thumbnails)/{filename}`
- Maximum length: 500 characters

### 3. Upload Confirm Endpoint (`src/pages/api/upload/confirm.ts`)

**Thumbnail Generation Logic:**

1. **Create media record:** Insert with `status: 'processing'`
2. **Return immediately:** Don't wait for thumbnail
3. **Background processing:** Fire async thumbnail generation
4. **Update status:** Set to `ready` when complete (or if failed)

**Background Processing Function:**
```typescript
async function generateThumbnailAsync(
  mediaId: string,
  key: string,
  weddingId: string
): Promise<void>
```

**Steps:**
1. Fetch original image from R2 (`fetchFile()`)
2. Check file size (max 10MB for thumbnail generation)
3. Generate thumbnail using Sharp (400px, 85% quality, WEBP)
4. Upload thumbnail to R2 under `thumbnails/` directory
5. Update database with `thumbnail_url` and `status: 'ready'`

**Error Handling:**
```typescript
try {
  // ... thumbnail generation ...
} catch (thumbnailError) {
  console.error('[API] Failed to generate thumbnail:', thumbnailError);
  // Update status to ready without thumbnail (graceful degradation)
  await adminClient
    .from('media')
    .update({ status: 'ready' })
    .eq('id', mediaId);
}
```

**Size Limits:**
- Maximum image size for thumbnail generation: 10MB
- Larger images skip thumbnail generation (graceful degradation)
- Prevents memory exhaustion DoS attacks

## Performance Characteristics

### Current (Asynchronous) Implementation

**Upload Response Time:**
- Create media record: 50-150ms
- **Total API latency: 50-150ms** (non-blocking)

**Background Processing Time:**
- Fetch original: 200-400ms
- Sharp processing: 300-1000ms (depends on image size)
- Upload thumbnail: 100-400ms
- Database update: 50-100ms
- **Total background time: 650-1900ms per image**

**Throughput:**
- API can handle 100+ requests/second
- Background processing happens independently
- No blocking on upload confirmation

**Metrics:**
```
[API] Starting background thumbnail generation for: weddings/abc/media/photo.jpg
[API] Fetched image buffer: { key: '...', size: 2048576, sizeKB: 2000 }
[API] Thumbnail generated: {
  originalSize: 2048576,
  thumbnailSize: 45678,
  compressionRatio: '2.2%',
  dimensions: '400x300'
}
[API] Thumbnail uploaded successfully: https://...
[API] Background thumbnail generation complete: abc-123-def
```

### Performance Comparison

| Metric | Synchronous (Old) | Asynchronous (Current) |
|--------|-------------------|------------------------|
| Upload API response | 1500-3000ms | 50-150ms |
| User-facing latency | High | Low |
| Concurrent uploads | Limited | 100+ |
| Error impact | Blocks upload | Graceful degradation |

## Graceful Degradation

Thumbnail generation failures don't prevent uploads or break the user experience:

### Failure Scenarios

1. **Sharp processing fails** → Continue with `thumbnail_url: null`
2. **R2 upload fails** → Continue with `thumbnail_url: null`
3. **Image too large (>10MB)** → Skip thumbnail, set `status: 'ready'`
4. **Invalid image format** → Skip thumbnail, set `status: 'ready'`

### Frontend Handling

```typescript
// MediaCard Component
<img
  src={item.thumbnailUrl || item.url}
  alt={item.caption}
  loading="lazy"
/>
```

**Fallback Strategy:**
1. Try to load thumbnail (fast, optimized)
2. If `thumbnail_url` is null, load original
3. Show placeholder while loading
4. Lazy load for performance

### Status Transitions

```
Upload → processing → ready (with thumbnail)
Upload → processing → ready (without thumbnail, if failed)
Upload → ready (for videos, no thumbnail yet)
```

## Database Schema

```sql
-- media table
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  original_url TEXT NOT NULL,
  optimized_url TEXT,  -- Reserved for future optimization
  thumbnail_url TEXT,  -- Generated thumbnail URL (NULL if not available)
  caption TEXT,
  guest_name TEXT,
  guest_identifier TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'failed')),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for queries
CREATE INDEX idx_media_wedding_id ON media(wedding_id);
CREATE INDEX idx_media_status ON media(status);
```

**Field Notes:**
- `thumbnail_url` is NULL for:
  1. Videos (video thumbnails not implemented yet)
  2. Images where generation failed
  3. Images uploaded before this feature
  4. Images > 10MB (skipped for performance)
- `status` tracks processing state:
  - `processing`: Thumbnail generation in progress
  - `ready`: Available for display (with or without thumbnail)
  - `failed`: Processing failed (rare, usually falls back to ready)

## Frontend Integration

### MediaCard Component

**Pattern:**
```typescript
<img
  src={item.thumbnailUrl || item.url}
  alt={item.caption || 'Wedding photo'}
  loading="lazy"
  onError={(e) => {
    // Fallback to original if thumbnail fails to load
    e.currentTarget.src = item.url;
  }}
/>
```

### Status Display

```typescript
{item.status === 'processing' && (
  <div className="status-badge">
    Processing...
  </div>
)}
```

### Placeholder Handling

While thumbnail loads:
1. Show pre-generated SVG placeholder (if available)
2. Fall back to gradient placeholder
3. Fade in thumbnail when loaded
4. Use `loading="lazy"` for performance

## Testing Strategy

### Unit Tests

**`src/lib/imageProcessing.test.ts`:**
- Sharp processing logic
- Magic number validation
- Dimension handling
- Format conversion
- Error handling

**`src/lib/r2/client.test.ts`:**
- Key generation patterns
- Path validation
- Security checks (path traversal)
- Thumbnail key format

### Integration Tests

**`src/pages/api/upload/confirm.test.ts`:**
- End-to-end thumbnail flow
- Successful generation and upload
- Dimensions and format validation (400px WEBP)
- Video handling (no thumbnail)
- Error handling and graceful degradation
- Storage path patterns
- Authorization checks
- Idempotency handling
- Rate limiting

**Coverage:**
- Image processing: ~95%
- R2 client: ~90%
- Upload confirm: ~85%

## Future Enhancements

### Short-term (TODOs)

1. **Validation Enhancement** (TODO #028)
   - Additional content-type validation
   - Enhanced magic number checks

2. **Rate Limiting** (TODO #034)
   - Per-wedding upload limits
   - Thumbnail generation throttling

3. **Regeneration Tool** (TODO #036)
   - Admin endpoint to regenerate failed thumbnails
   - Bulk regeneration for existing media

### Medium-term

1. **Video Thumbnails**
   - Extract first frame using FFmpeg
   - Generate WEBP thumbnail from video frame
   - Similar async processing pattern

2. **Progressive Enhancement**
   - Multiple thumbnail sizes (400w, 800w, 1200w)
   - Responsive images with srcset
   - Automatic size selection based on viewport

3. **Blurhash Integration**
   - Generate blurhash during thumbnail creation
   - Store in database for instant placeholders
   - Smooth loading transitions

### Long-term

1. **CDN Integration**
   - Cloudflare Images for on-the-fly transforms
   - Dynamic resizing and optimization
   - Edge caching for global performance

2. **Advanced Compression**
   - AVIF format support for better compression
   - Automatic format selection based on browser
   - Quality presets based on image type

3. **Smart Optimization**
   - Content-aware cropping
   - Face detection for better thumbnails
   - Automatic orientation correction

## Security Considerations

### Implemented Protections

1. **Magic Number Validation** (TODO #028 - Implemented)
   - Validates JPEG, PNG, GIF, WEBP file signatures
   - Prevents malicious file uploads
   - Checked before Sharp processing

2. **Path Validation** (TODO #035 - Implemented)
   - Validates storage key patterns
   - Prevents path traversal attacks
   - Enforces `weddings/` prefix

3. **Size Limits**
   - 10MB max for thumbnail generation
   - Prevents memory exhaustion DoS
   - Sharp pixel limit: 16384×16384

4. **Input Validation**
   - Buffer validation before processing
   - Suffix validation (alphanumeric + hyphens)
   - Key format validation

### Related Security TODOs

- **TODO #026:** Memory exhaustion prevention (partially addressed)
- **TODO #027:** SSRF vulnerability in fetchFile (needs review)
- **TODO #028:** Content-type validation (implemented)
- **TODO #035:** Path traversal protection (implemented)

## Monitoring & Debugging

### Logs

**Successful Flow:**
```
[API] Starting background thumbnail generation for: weddings/abc/media/photo.jpg
[API] Fetched image buffer: { key: 'weddings/...', size: 2048576, sizeKB: 2000 }
[API] Thumbnail generated: { originalSize: 2048576, thumbnailSize: 45678, compressionRatio: '2.2%', dimensions: '400x300' }
[API] Thumbnail uploaded successfully: https://...
[API] Background thumbnail generation complete: abc-123-def
```

**Failure Flow:**
```
[API] Starting background thumbnail generation for: weddings/abc/media/photo.jpg
[API] Background thumbnail generation failed: { error: 'Image too large: exceeds maximum pixel limit', stack: '...' }
```

### Metrics to Track

**Performance:**
- Average thumbnail generation time
- P50, P95, P99 latency
- Success rate (%)
- Background processing queue depth

**Storage:**
- Thumbnail storage usage vs originals
- Compression ratio (thumbnail/original)
- Failed generation count

**User Experience:**
- Upload success rate
- Time to display (with vs without thumbnail)
- Fallback usage rate

### Debugging Tools

**Check thumbnail status:**
```sql
-- Count media by status
SELECT status, COUNT(*)
FROM media
WHERE wedding_id = 'abc-123'
GROUP BY status;

-- Find media without thumbnails
SELECT id, original_url, status, created_at
FROM media
WHERE wedding_id = 'abc-123'
  AND type = 'image'
  AND thumbnail_url IS NULL
ORDER BY created_at DESC;
```

**Regenerate thumbnails:**
```bash
# Admin endpoint (future)
POST /api/admin/media/{id}/regenerate-thumbnail
POST /api/admin/weddings/{id}/regenerate-thumbnails
```

## References

**External Documentation:**
- [Sharp Documentation](https://sharp.pixelplumbing.com/) - Image processing library
- [WEBP Format](https://developers.google.com/speed/webp) - Modern image format
- [Cloudflare R2](https://developers.cloudflare.com/r2/) - Object storage
- [File Signatures (Magic Numbers)](https://en.wikipedia.org/wiki/List_of_file_signatures)

**Related Documentation:**
- `docs/architecture/DATA_FLOW.md` - Upload flow and data handling
- `docs/architecture/PAGES.md` - API endpoints
- `docs/PREVENTION_STRATEGIES_SUMMARY.md` - Security guidelines

**Related Code:**
- `src/lib/imageProcessing.ts` - Thumbnail generation logic
- `src/lib/r2/client.ts` - R2 storage operations
- `src/pages/api/upload/confirm.ts` - Upload confirmation endpoint

**Related TODOs:**
- TODO #028: Content-type validation (completed)
- TODO #029: Async processing (completed)
- TODO #036: Thumbnail regeneration tool (planned)

---

**Created:** February 4, 2026
**Last Updated:** February 4, 2026
