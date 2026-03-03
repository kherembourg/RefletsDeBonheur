---
title: "Simplify Project for Gallery + QR Code First Test"
type: feat
date: 2026-03-02
enhanced: 2026-03-02 (via `/deepen-plan`)
phase1_completed: 2026-03-02
phase2_completed: 2026-03-03
completed: 2026-03-02
pr: "#56"
---

# Simplify Project for Gallery + QR Code First Test

## Enhancement Summary

**Deepened on:** 2026-03-02
**Research agents used:** TypeScript reviewer, Performance oracle, Security sentinel, Architecture strategist, Code simplicity reviewer, Pattern recognition specialist, Frontend races reviewer, Best practices researcher, Supabase expert, Learnings researcher
**Sections enhanced:** All

### Key Improvements from Research
1. **Drastically simplified scope** — Simplicity reviewer identified that only ~3-5 code changes are needed for a working test vs. the original 25+ tasks
2. **Critical bug found: uploaded photos invisible** — Gallery filters `status: 'ready'` but uploads start as `status: 'processing'` with no polling. Photos vanish after upload.
3. **Replace external QR API with client-side `qrcode.react`** — Eliminates CSP issue, privacy concern, and reliability risk in one change (~30 min)
4. **Double-tap upload race condition** — No synchronous mutex on upload button
5. **QR code URL bug** — Points to `/gallery` instead of `/{slug}/photos`

### Architecture Decisions
- **Feature flags in JSONB**: Confirmed correct pattern by Supabase expert — no migration to separate columns needed
- **Page-level SSR guards**: Correct layer per architecture reviewer — middleware would duplicate wedding data fetching
- **Demo pages**: Keep showing all features (they showcase the full product vision)
- **Naming inconsistency** (`gallery` vs `photoGallery`): Document but do NOT fix now — too much risk for zero user-facing benefit

---

## Overview

Strip the product down to its core for a first real-world test: **photo gallery** and **QR code sharing** only. Disable (without deleting) the website editor and livre d'or/guestbook. Then verify QR code generation actually works, gallery loads fast, and uploads succeed.

**Goal:** Get to a testable state ASAP. No new features — just hide what's not ready and fix what's broken.

---

## Blockers Found During Research

### 🔴 Uploaded Photos Invisible After Upload (CRITICAL — NEW)
**Found by:** Frontend races reviewer

`dataService.ts:248` filters gallery by `status: 'ready'`, but `confirm.ts` creates records with `status: 'processing'`. Thumbnail generation runs async and sets `'ready'` when done. **No polling exists.** Result: user uploads a photo, upload succeeds, modal closes, photo is NOT in the gallery. User thinks upload failed.

**Fix:** Include `'processing'` items in the gallery query. `MediaCard.tsx:183` already has a processing overlay — it's built but filtered out.

### 🔴 QR Code Points to Wrong URL (CRITICAL)
**Found by:** TypeScript reviewer

Two separate bugs:
1. `AdminPanel.tsx:204` generates a relative path (`/julie-thomas/photos`) — useless for printed QR codes
2. `QRCodeGenerator.tsx:14` hardcodes `/gallery` instead of `/{slug}/photos` — ignores wedding slug entirely

### 🔴 QR Code CSP Block (CRITICAL)
CSP in `src/middleware.ts:27` blocks `api.qrserver.com`. But instead of whitelisting it, **replace with client-side generation** (`qrcode.react`) to eliminate the issue entirely.

### 🟡 Double-Tap Upload Race Condition
**Found by:** Frontend races reviewer

`UploadForm.tsx:86` — `setUploading(true)` is async. Two rapid taps both see `uploading === false` and trigger duplicate uploads. Need a `useRef` mutex.

### 🟡 Batch Upload Aborts on First Failure
**Found by:** Frontend races reviewer

`upload.ts:194` — Comment says "continue with other files" but code re-throws, aborting files 4-10 when file 3 fails.

---

## Phase 1: MVP — Minimum Changes for Working Test

> **Philosophy (from simplicity review):** You are the only admin. QR-scanning guests only see `LuxeNav`. Fix what's broken, hide what's visible to guests, skip everything else.

### 1.1 ~~Replace external QR API with client-side generation (~30 min)~~ DONE

**Why now (not deferred):** Architecture strategist + best practices researcher both recommend this. It eliminates 3 problems at once: CSP block, privacy leak to third party, and reliability risk on wedding day. `qrcode.react` v4.2+ supports React 19, renders SVG (no external requests), and is 115KB.

```bash
npm install qrcode.react
```

**Files to change:**

| File | Change |
|------|--------|
| `src/components/admin/QRCodeGenerator.tsx` | Replace `<img src="api.qrserver.com/...">` with `<QRCodeSVG>` from `qrcode.react`. Accept `weddingSlug` as required prop. Build URL as `${window.location.origin}/${weddingSlug}/photos`. |
| `src/components/admin/AdminPanel.tsx:397` | Replace inline `<img>` QR code with `<QRCodeSVG>`. Fix `shareUrl` to use absolute URL with `window.location.origin`. |
| `src/components/admin/AdminPanel.tsx:204` | Fix: `const shareUrl = typeof window !== 'undefined' ? \`${window.location.origin}/${weddingSlug}/photos\` : \`/${weddingSlug}/photos\`;` |

**Implementation pattern:**
```typescript
import { QRCodeSVG } from 'qrcode.react';

// In QRCodeGenerator.tsx
interface QRCodeGeneratorProps {
  weddingSlug: string;  // required, not optional
  galleryUrl?: string;
}

const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
const currentUrl = galleryUrl || `${baseUrl}/${weddingSlug}/photos`;

<QRCodeSVG
  value={currentUrl}
  size={size}
  bgColor="#FFFFF0"
  fgColor="#2D2D2D"
  level="M"
/>
```

**Print function:** Replace `<img src="${qrCodeUrl}">` with SVG data URI:
```typescript
const svgElement = document.querySelector('.qr-code-svg');
const svgData = new XMLSerializer().serializeToString(svgElement);
const svgDataUri = `data:image/svg+xml;base64,${btoa(svgData)}`;
// Use in print window: <img src="${svgDataUri}" />
```

**Download function:** SVG → Canvas → PNG:
```typescript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.onload = () => { ctx.drawImage(img, 0, 0); /* trigger download */ };
img.src = svgDataUri;
```

**Note:** Also HTML-escape `accessCode` in print function (`QRCodeGenerator.tsx:120`) to prevent self-XSS.

**CSP:** No changes needed — SVG is inline DOM, not an image request. Can REMOVE `api.qrserver.com` references entirely.

### 1.2 ~~Fix uploaded photos invisible (~5 min)~~ DONE

**File:** `src/lib/services/dataService.ts:248`

Include `processing` items in the gallery query:
```typescript
const media = await mediaApi.getByWeddingId(this.weddingId, {
  status: ['ready', 'processing'],  // was: 'ready' only
  moderation: 'approved',
});
```

`MediaCard.tsx:183` already renders a "Processing..." overlay for `status === 'processing'` items. This code is currently dead because processing items are filtered out. Unfiltering makes it work.

### 1.3 ~~Remove guestbook from LuxeNav (~1 min)~~ DONE

**File:** `src/components/wedding/LuxeNav.tsx:12-17`

This is the ONLY navigation a QR-scanning guest sees. Remove or filter the guestbook item:

```typescript
const navItems = [
  { id: 'home', label: 'Info', icon: Home, href: `/${slug}` },
  { id: 'photos', label: 'Photos', icon: Camera, href: `/${slug}/photos` },
  { id: 'live', label: 'Live', icon: Radio, href: `/${slug}/photos?live=true` },
  // guestbook removed for MVP test
];
```

Or better — accept a `features` prop and filter:
```typescript
const allNavItems = [
  { id: 'home', ..., enabled: true },
  { id: 'photos', ..., enabled: features.photoGallery },
  { id: 'live', ..., enabled: features.liveWall },
  { id: 'guestbook', ..., enabled: features.guestbook },
];
const navItems = allNavItems.filter(item => item.enabled);
```

### 1.4 ~~Fix double-tap upload race condition (~2 min)~~ DONE

**File:** `src/components/gallery/UploadForm.tsx:86`

Add a ref-based synchronous mutex:
```typescript
const uploadingRef = useRef(false);

const handleUploadAll = async () => {
  if (uploadingRef.current) return;
  uploadingRef.current = true;
  setUploading(true);
  try {
    // ... existing upload code
  } finally {
    uploadingRef.current = false;
    setUploading(false);
  }
};
```

### 1.5 ~~Run existing tests~~ DONE (2230 pass, 0 fail)

Run `npm test` to verify nothing is broken. Do NOT write new tests for this MVP phase.

---

## Phase 2: Should Fix — Before Real Wedding Day

> These are real bugs and improvements that should be done before a real event, but can come after the initial test.

### 2.1 Fix batch upload abort-on-failure

**File:** `src/lib/r2/upload.ts:194-198`

Change from re-throwing (aborts all remaining files) to continuing:
```typescript
} catch (error) {
  console.error(`Failed to upload file ${file.name}:`, error);
  // Continue with remaining files instead of re-throwing
  onFileProgress?.(i, { loaded: 0, total: 0, percentage: 0 });
}
```

Mark individual failed items in the queue, not all of them.

### 2.2 Add server-side file size validation

**Found by:** Security sentinel (HIGH) + Performance oracle (P0)

**File:** `src/pages/api/upload/presign.ts`

Client-side validation alone is trivially bypassed. Add `fileSize` to the presign request and validate server-side:

```typescript
const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

if (contentType.startsWith('image/') && fileSize > MAX_IMAGE_SIZE) {
  return apiResponse.error('File too large', 413);
}
```

Also add client-side validation in `UploadForm.tsx` for UX (instant feedback).

### 2.3 Add `websiteEditor` feature flag + navigation cleanup (all 8 locations)

For a real launch (not just your personal test), properly add the flag:

**Type changes:**
- Add `websiteEditor: boolean` to `WeddingFeatures` in `src/lib/types.ts`
- Add `websiteEditor: boolean` to `FeaturesConfig` in `src/lib/supabase/types.ts`
- Set defaults: `guestbook: false`, `websiteEditor: false` in `DEFAULT_WEDDING_CONFIG`
- Add mapper line in `weddingData.ts`: `websiteEditor: wedding.config?.features?.websiteEditor ?? false`
- **Fix mapper defaults** — use `DEFAULT_WEDDING_CONFIG.features` as fallback source instead of hardcoded `?? true` values (found by TypeScript reviewer)

**Supabase migration** (`supabase/migrations/011_add_website_editor_feature_flag.sql`):
- Update column DEFAULT to include `websiteEditor: false`
- Update `create_account_from_payment` function to include new flag
- Backfill existing rows: `jsonb_set(config, '{features,websiteEditor}', 'false'::jsonb)` (do NOT change existing `guestbook` values)

**Navigation (all 8 locations):**

| Navigation | File | Change |
|------------|------|--------|
| LuxeNav | `src/components/wedding/LuxeNav.tsx` | Accept `features` prop, filter nav items |
| AdminPanel sidebar | `src/components/admin/AdminPanel.tsx:206-237` | Filter `navItems` by feature flags |
| AdminPanel dashboard | `src/components/admin/AdminPanel.tsx:304-318` | Hide "Editeur de site" card |
| Header.astro (app nav) | `src/components/layout/Header.astro:124-183` | Conditionally render guestbook link |
| Header.astro (demo nav) | `src/components/layout/Header.astro:83-123` | Hide livre d'or from demo section |
| DemoLayout | `src/layouts/DemoLayout.astro:31-36` | Filter out `livre-or` |
| account/gallery | `src/pages/account/gallery.astro:35-39` | Hide guestbook link |
| demo_website | `src/pages/demo_website.astro` | Hide guestbook card |

**Consider:** Create a shared `getActiveNavItems(features, slug)` utility in `src/lib/navigation.ts` to centralize filtering logic (recommended by pattern recognition specialist and architecture strategist).

### 2.4 Add page-level guards

| Page | File | Guard |
|------|------|-------|
| Livre d'or | `src/pages/[slug]/livre-or.astro` | `if (!config.features.guestbook) return Astro.redirect(\`/${slug}\`)` |
| Guestbook (account) | `src/pages/guestbook.astro` | Redirect to `/account/gallery` |
| Website editor | `src/pages/[slug]/admin/website-editor.astro` | `if (!config.features.websiteEditor) return Astro.redirect(\`/${slug}/admin\`)` |
| Website editor (standalone) | `src/pages/admin/website-editor.astro` | Redirect to `/admin` |

### 2.5 Tests

- Update tests asserting guestbook/website-editor nav items are present
- Add tests for page-level guards (redirect when disabled)
- Add tests for filtered navigation

---

## Phase 3: Deferred — Post-Launch Improvements

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Gallery pagination / infinite scroll | P1 | 2-3h | Required before 200+ photos. `mediaApi` already supports `limit`/`offset`. Wire through `DataService.getMedia()` + IntersectionObserver sentinel. |
| Concurrent uploads (3 parallel) | P2 | 1h | ~3x throughput. Bounded concurrency in `uploadMultipleToR2`. |
| XHR abort on upload modal close | P2 | 20min | Store XHR ref, abort on unmount. Prevents React state-on-unmounted warnings. |
| Server-side admin auth | P0 | 3-4h | Pre-existing HIGH vulnerability: `reflets_is_admin` localStorage check is trivially bypassable. Move to server-side session validation. |
| Responsive images for R2 | P3 | 3-4h | Multi-size thumbnails or Cloudflare Image Resizing for mobile. |
| Naming consistency (`gallery` vs `photoGallery`) | P3 | 2h | Document mapping table now. Fix in dedicated refactor when test coverage is higher. |
| Slideshow spacebar toggle fix | P4 | 2min | `setIsPlaying(prev => !prev)` — stale closure in keyboard handler. |
| Auto-save timeout leak | P4 | 5min | Clear `setTimeout` IDs on unmount in `useWebsiteEditor.ts`. |

---

## Acceptance Criteria

### Phase 1 (MVP Test)
- [ ] QR code renders client-side (no external API dependency)
- [ ] QR code contains absolute URL with `/{slug}/photos` (scannable from print)
- [ ] Uploaded photos appear in gallery immediately (with processing indicator)
- [ ] Guestbook link removed from LuxeNav (guest-facing nav)
- [ ] Upload button protected against double-tap
- [ ] All existing tests pass

### Phase 2 (Pre-Launch)
- [ ] Guestbook links hidden from ALL 8 navigation locations
- [ ] Website editor links hidden from admin panel
- [ ] Direct URL to `/[slug]/livre-or` redirects to wedding home
- [ ] Direct URL to `/[slug]/admin/website-editor` redirects to admin
- [ ] Server-side file size validation on presign endpoint
- [ ] Client-side file size validation with clear error message
- [ ] New tests for guards and nav filtering

### Manual Test Checklist
- [ ] Generate QR code from admin panel → Download/print PNG
- [ ] Scan QR code with phone camera → Opens correct gallery page
- [ ] Upload single photo from phone → Appears in gallery (possibly with processing indicator)
- [ ] Upload 5-10 photos → All appear, no duplicates
- [ ] Gallery loads on mobile with good performance
- [ ] Thumbnails display (400px WEBP fallback to originals)

---

## Out of Scope (Resume Later)

- Guestbook feature development
- Website editor improvements
- Gallery pagination / infinite scroll (OK for <200 photos)
- RSVP feature (keeping as-is, not disabling)
- Demo page restructuring (demos keep showing full product)
- Fix naming inconsistency (`gallery` vs `photoGallery`)
- Server-side admin authentication (pre-existing issue)

---

## Security Notes (from Security Sentinel)

| Finding | Severity | Action |
|---------|----------|--------|
| No server-side file size enforcement | HIGH | Phase 2.2 |
| Client-side-only admin auth (`reflets_is_admin` localStorage) | HIGH | Pre-existing, deferred to Phase 3 |
| Self-XSS in QR print function (`accessCode` not escaped) | LOW | Fix in Phase 1.1 (HTML-escape before `document.write`) |
| Gallery URLs sent to `api.qrserver.com` | MEDIUM | Eliminated by Phase 1.1 (client-side QR) |
| Feature APIs remain active when feature disabled | MEDIUM | Phase 2 consideration |

---

## References

- Feature flags: `src/lib/types.ts:37-45` (WeddingFeatures interface)
- Default config: `src/lib/types.ts:219-227` (DEFAULT_WEDDING_CONFIG)
- Supabase types: `src/lib/supabase/types.ts:36-42` (FeaturesConfig)
- QR component: `src/components/admin/QRCodeGenerator.tsx`
- Admin panel: `src/components/admin/AdminPanel.tsx`
- CSP middleware: `src/middleware.ts:27`
- Thumbnail architecture: `docs/architecture/THUMBNAIL_GENERATION.md`
- Upload flow: `src/lib/r2/upload.ts`, `src/pages/api/upload/presign.ts`, `src/pages/api/upload/confirm.ts`
- DataService: `src/lib/services/dataService.ts`
- LuxeNav: `src/components/wedding/LuxeNav.tsx`
- Gallery: `src/components/gallery/GalleryGrid.tsx`, `src/components/gallery/MediaCard.tsx`
- Upload form: `src/components/gallery/UploadForm.tsx`
- Library: `qrcode.react` v4.2+ — [npm](https://www.npmjs.com/package/qrcode.react), [GitHub](https://github.com/zpao/qrcode.react)
