# Vercel React Best Practices - Fix Plan

**Review Date:** January 26, 2026
**Branch:** fix/vercel_best_practices
**Status:** ✅ COMPLETED

## Completed Fixes Summary

All 8 fixes have been implemented:

| # | Fix | Status |
|---|-----|--------|
| 1 | lucide-react Vite optimization | ✅ Complete |
| 2 | Dynamic imports for Lightbox/Slideshow | ✅ Complete |
| 3 | CSS content-visibility for gallery | ✅ Complete |
| 4 | React.memo on MediaCard | ✅ Complete |
| 5 | Lightbox effect dependencies | ✅ Complete |
| 6 | Parallelize auth/data loading | ✅ Complete |
| 7 | Wrap animated SVGs in divs | ✅ Complete |
| 8 | Use toSorted() for immutability | ✅ Complete |
| 9 | Limit gallery animation to first 12 items | ✅ Complete |
| 10 | Passive touch event listeners in Lightbox | ✅ Complete |

**Tests:** 800/800 passing
**Build:** Successful

---

## Overview

This document tracks fixes identified from a comprehensive review against [Vercel's React Best Practices](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast). Fixes are organized by priority level based on performance impact.

---

## Critical Priority (Bundle Size & Waterfalls)

### 1. Fix lucide-react Barrel Imports

**Impact:** 200-800ms cold start improvement
**Effort:** Medium
**Files Affected:**
- `src/components/gallery/GalleryGrid.tsx:2`
- `src/components/gallery/MediaCard.tsx:2`
- `src/components/gallery/Lightbox.tsx:2`
- `src/components/gallery/Slideshow.tsx` (check)
- `src/components/gallery/SearchFilters.tsx` (check)
- `src/components/gallery/BulkActions.tsx` (check)
- `src/components/gallery/UploadModal.tsx` (check)
- `src/components/gallery/ReactionsPanel.tsx` (check)
- `src/components/admin/*.tsx` (multiple files)
- `src/components/ui/Toast.tsx:2`

**Current Pattern:**
```typescript
import { Upload, Lock, ImageIcon, Play } from 'lucide-react';
```

**Fix Option A - Direct Imports:**
```typescript
import Upload from 'lucide-react/dist/esm/icons/upload';
import Lock from 'lucide-react/dist/esm/icons/lock';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Play from 'lucide-react/dist/esm/icons/play';
```

**Fix Option B - Vite Optimization (Preferred):**
```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    optimizeDeps: {
      include: ['lucide-react']
    },
    ssr: {
      noExternal: ['lucide-react']
    }
  }
});
```

**Verification:**
- [ ] Check bundle size before/after
- [ ] Measure cold start time
- [ ] Run `npm run build` and check output

---

### 2. Dynamic Imports for Heavy Components

**Impact:** Reduced initial bundle size
**Effort:** Low
**Files Affected:**
- `src/components/gallery/GalleryGrid.tsx:5-6`

**Current Pattern:**
```typescript
import { Lightbox } from './Lightbox';
import { Slideshow } from './Slideshow';
```

**Fix:**
```typescript
import { lazy, Suspense } from 'react';

const Lightbox = lazy(() => import('./Lightbox').then(m => ({ default: m.Lightbox })));
const Slideshow = lazy(() => import('./Slideshow').then(m => ({ default: m.Slideshow })));

// In render (around line 410-425):
{lightboxIndex !== null && (
  <Suspense fallback={<div className="fixed inset-0 bg-black/80 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}>
    <Lightbox
      media={filteredMedia}
      initialIndex={lightboxIndex}
      onClose={() => setLightboxIndex(null)}
    />
  </Suspense>
)}

{showSlideshow && (
  <Suspense fallback={<div className="fixed inset-0 bg-black/80 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}>
    <Slideshow
      media={filteredMedia.length > 0 ? filteredMedia : media}
      initialIndex={0}
      onClose={() => setShowSlideshow(false)}
    />
  </Suspense>
)}
```

**Verification:**
- [ ] Check that Lightbox/Slideshow load on demand
- [ ] Verify fallback UI displays during load
- [ ] Test on slow network (DevTools throttling)

---

### 3. Add CSS content-visibility for Gallery

**Impact:** Up to 10x faster initial render for large galleries
**Effort:** Low
**Files Affected:**
- `src/styles/global.css` (or create new file)
- `src/components/gallery/GalleryGrid.tsx:370`

**Fix - Add CSS:**
```css
/* src/styles/gallery.css or global.css */
.gallery-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 350px; /* Approximate height of a media card */
}
```

**Fix - Ensure class is applied:**
```typescript
// GalleryGrid.tsx:370
<div
  key={item.id}
  className={`gallery-item ${gridStyle === 'masonry' ? 'mb-6 break-inside-avoid' : ''}`}
  // ...
>
```

**Verification:**
- [ ] Test with 100+ items in gallery
- [ ] Check Chrome DevTools Performance tab
- [ ] Verify no layout shift issues

---

## High Priority (Re-render Optimization)

### 4. Add React.memo to MediaCard

**Impact:** Prevent unnecessary re-renders in list
**Effort:** Low
**Files Affected:**
- `src/components/gallery/MediaCard.tsx`

**Current Pattern:**
```typescript
export function MediaCard({ ... }: MediaCardProps) {
```

**Fix:**
```typescript
import { memo } from 'react';

export const MediaCard = memo(function MediaCard({
  item,
  isAdmin,
  onDelete,
  onClick,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
  isFavorited: isFavoritedProp = false,
  onToggleFavorite,
  dataService
}: MediaCardProps) {
  // ... component body unchanged
});
```

**Verification:**
- [ ] Use React DevTools Profiler
- [ ] Check that MediaCards don't re-render when sibling changes
- [ ] Verify favorites/selection still work correctly

---

### 5. Fix Lightbox Effect Dependencies

**Impact:** Prevent effect re-runs when callbacks change
**Effort:** Medium
**Files Affected:**
- `src/components/gallery/Lightbox.tsx:57-74`

**Current Pattern:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      // ...
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentIndex, onClose]); // onClose causes re-subscription
```

**Fix:**
```typescript
import { useEffect, useState, useRef, useLayoutEffect } from 'react';

// Add near top of component:
const onCloseRef = useRef(onClose);
useLayoutEffect(() => {
  onCloseRef.current = onClose;
}, [onClose]);

// Update effect:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onCloseRef.current();
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          setIsZoomed(false);
        }
        break;
      case 'ArrowRight':
        if (currentIndex < media.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setIsZoomed(false);
        }
        break;
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentIndex, media.length]); // Removed onClose dependency
```

**Verification:**
- [ ] Keyboard navigation still works
- [ ] Effect doesn't re-run when parent re-renders
- [ ] No stale closure issues

---

### 6. Parallelize Auth and Data Loading

**Impact:** Faster initial load
**Effort:** Low
**Files Affected:**
- `src/components/gallery/GalleryGrid.tsx:82-93`

**Current Pattern:**
```typescript
useEffect(() => {
  if (!demoMode) {
    requireAuth();
  }
  setIsAdmin(demoMode || checkIsAdmin());
  dataService.getFavorites().then(setUserFavorites);
}, [demoMode, dataService]);
```

**Fix:**
```typescript
useEffect(() => {
  const init = async () => {
    // Run auth check and favorites load in parallel
    const [, favorites] = await Promise.all([
      !demoMode ? requireAuth() : Promise.resolve(),
      dataService.getFavorites()
    ]);
    setIsAdmin(demoMode || checkIsAdmin());
    setUserFavorites(favorites);
  };
  init();
}, [demoMode, dataService]);
```

**Verification:**
- [ ] Auth still works correctly
- [ ] Favorites load in parallel
- [ ] No race conditions

---

## Medium Priority (Rendering Performance)

### 7. Wrap Animated SVGs in Divs

**Impact:** Enable hardware acceleration for animations
**Effort:** Low
**Files Affected:**
- `src/components/gallery/GalleryGrid.tsx:304`
- Search for other `animate-spin` on SVG elements

**Current Pattern:**
```typescript
<Loader2 className="w-8 h-8 mx-auto mb-4 text-burgundy-old animate-spin" />
```

**Fix:**
```typescript
<div className="w-8 h-8 mx-auto mb-4 animate-spin">
  <Loader2 className="w-full h-full text-burgundy-old" />
</div>
```

**Verification:**
- [ ] Animation still works
- [ ] Check Chrome DevTools Layers panel for GPU acceleration

---

### 8. Use toSorted() Instead of sort()

**Impact:** Cleaner immutable pattern, prevents accidental mutations
**Effort:** Low
**Files Affected:**
- `src/components/gallery/GalleryGrid.tsx:124-135`

**Current Pattern:**
```typescript
const filteredMedia = useMemo(() => {
  let result = [...media];
  // ... filtering
  result.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.createdAt.getTime() - a.createdAt.getTime();
      // ...
    }
  });
  return result;
}, [/* deps */]);
```

**Fix:**
```typescript
const filteredMedia = useMemo(() => {
  let result = [...media];
  // ... filtering

  return result.toSorted((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'oldest':
        return a.createdAt.getTime() - b.createdAt.getTime();
      case 'author':
        return (a.author || '').localeCompare(b.author || '');
      default:
        return 0;
    }
  });
}, [/* deps */]);
```

**Verification:**
- [ ] Sorting still works correctly
- [ ] No TypeScript errors (check tsconfig target)

---

## Low Priority (Micro-optimizations)

### 9. Memoize Inline Style Objects

**Impact:** Reduced object creation per render
**Effort:** Low
**Files Affected:**
- `src/components/gallery/GalleryGrid.tsx:371-373`

**Current Pattern:**
```typescript
{filteredMedia.map((item, index) => (
  <div
    style={{
      animationDelay: `${Math.min(index * 0.05, 0.5)}s`
    }}
  >
```

**Fix Option A - CSS Custom Properties:**
```typescript
{filteredMedia.map((item, index) => (
  <div
    style={{ '--animation-delay': `${Math.min(index * 0.05, 0.5)}s` } as React.CSSProperties}
  >
```

**Fix Option B - Limit animation to first N items:**
```typescript
{filteredMedia.map((item, index) => (
  <div
    className={`gallery-item ${index < 12 ? 'animate-fade-in' : ''}`}
    style={index < 12 ? { animationDelay: `${index * 0.05}s` } : undefined}
  >
```

**Verification:**
- [ ] Animation still looks smooth
- [ ] Performance improvement measurable for large lists

---

### 10. Consider SWR for Data Fetching (Future)

**Impact:** Automatic deduplication, caching, revalidation
**Effort:** High (architectural change)
**Files Affected:**
- `src/lib/services/dataService.ts`
- All components using DataService

**This is a larger refactor - document for future consideration:**

```typescript
// Example future pattern
import useSWR from 'swr';

export function useMedia(weddingId: string, demoMode: boolean) {
  const key = demoMode ? 'demo-media' : `media-${weddingId}`;
  return useSWR(key, async () => {
    const service = new DataService({ demoMode, weddingId });
    return service.getMedia();
  });
}

// Usage in component:
function GalleryGrid({ weddingId, demoMode }) {
  const { data: media, isLoading, mutate } = useMedia(weddingId, demoMode);
  // ...
}
```

**Benefits:**
- Automatic request deduplication
- Built-in caching
- Stale-while-revalidate pattern
- Optimistic updates

---

## Implementation Order

1. **Phase 1 - Quick Wins (1-2 hours)**
   - [ ] Fix 3: Add content-visibility CSS
   - [ ] Fix 4: Add React.memo to MediaCard
   - [ ] Fix 7: Wrap animated SVGs
   - [ ] Fix 8: Use toSorted()

2. **Phase 2 - Bundle Optimization (2-3 hours)**
   - [ ] Fix 1: lucide-react imports (try Vite config first)
   - [ ] Fix 2: Dynamic imports for Lightbox/Slideshow

3. **Phase 3 - Effect Optimization (1-2 hours)**
   - [ ] Fix 5: Lightbox effect dependencies
   - [ ] Fix 6: Parallelize auth/data loading

4. **Phase 4 - Polish (1 hour)**
   - [ ] Fix 9: Memoize inline styles
   - [ ] General code review for other barrel imports

---

## Testing Checklist

Before merging:
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] Manual testing of gallery (load, filter, sort)
- [ ] Manual testing of Lightbox (keyboard nav, swipe)
- [ ] Manual testing of Slideshow
- [ ] Check bundle size with `npm run build -- --analyze` (if available)
- [ ] Test on mobile device
- [ ] Test offline/PWA functionality still works

---

## Metrics to Track

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Bundle size (main) | TBD | TBD | -20% |
| Cold start time | TBD | TBD | <500ms |
| LCP (gallery page) | TBD | TBD | <2.5s |
| FID | TBD | TBD | <100ms |

---

## References

- [Vercel Blog: How We Made the Dashboard Twice as Fast](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast)
- [Vercel Blog: Optimizing Package Imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)
- [React.memo Documentation](https://react.dev/reference/react/memo)
- [CSS content-visibility](https://web.dev/content-visibility/)
