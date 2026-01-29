---
title: "refactor: Website Editor Performance & Design Overhaul"
type: refactor
date: 2026-01-29
brainstorm: docs/brainstorms/2026-01-29-website-editor-refactoring-brainstorm.md
---

# refactor: Website Editor Performance & Design Overhaul

## Overview

Complete refactoring of the Website Editor to fix performance issues (full iframe reload on every change), align with admin interface design (dark → light theme), and implement missing features (R2 image upload).

**Current State:**
- 664 lines, 9 state variables, 8 useEffects
- Full iframe reload on every change (even with 500ms debounce)
- Dark theme (`#0f0f0f`) vs AdminPanel light theme (`#f3f0f4`)
- Image upload is a TODO (blob URLs lost on refresh)

**Target State:**
- ~200 lines main component + extracted hook
- Instant CSS injection via postMessage (reload only for theme changes)
- Unified light theme using AdminUI components
- Working R2 image upload

## Problem Statement

### Performance
The iframe preview reloads completely on every customization change, causing:
- 500ms+ delay for each color tweak
- Flash of unstyled content during reload
- Excessive network requests (Date.now() cache busting)

**Root cause:** The debounced `setPreviewKey` effect triggers a full reload even though `PreviewCustomizationProvider` already handles live CSS injection via postMessage.

### Design Inconsistency
The editor uses a dark theme while AdminPanel uses light:
- Editor: `#0f0f0f`, `#1a1a1a`, `#2a2a2a`
- Admin: `#f3f0f4`, white cards, burgundy accents

This creates jarring visual transitions when navigating between admin sections.

### Missing R2 Upload
ImageManager has a TODO placeholder returning blob URLs:
```typescript
onUpload={async (file, key) => {
  // TODO: Implement actual upload to R2
  return URL.createObjectURL(file); // Lost on refresh
}}
```

## Proposed Solution

### Phase 1: Extract `useWebsiteEditor` Hook ✅ COMPLETE

Created `src/hooks/useWebsiteEditor.ts` to centralize all state and logic:

```typescript
// src/hooks/useWebsiteEditor.ts
export interface UseWebsiteEditorOptions {
  weddingId: string;
  weddingSlug: string;
  demoMode?: boolean;
  initialCustomization?: WeddingCustomization;
}

export interface UseWebsiteEditorReturn {
  // State
  customization: WeddingCustomization;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  hasUnsavedChanges: boolean;

  // Actions
  updateTheme: (themeId: ThemeId) => void;
  updateColors: (palette: Partial<CustomPalette>) => void;
  updateContent: (content: Partial<CustomContent>) => void;
  updateImages: (images: Partial<CustomImages>) => void;
  resetToDefault: () => void;
  forceSave: () => Promise<void>;

  // Preview
  previewKey: number; // Only increments on theme change
  iframeRef: RefObject<HTMLIFrameElement>;
  sendPreviewUpdate: () => void;

  // Upload
  uploadImage: (file: File, key: keyof CustomImages) => Promise<string>;
  uploadProgress: number | null;
}
```

**Responsibilities:**
- Manage customization state
- Handle auto-save (2s debounce)
- Send postMessage to iframe
- Track save status
- Handle R2 image uploads
- Only increment `previewKey` for theme changes (not color/content)

### Phase 2: Fix Preview Performance ✅ COMPLETE (done in Phase 1)

**Remove iframe reload for non-structural changes:**

```typescript
// In useWebsiteEditor hook
const updateColors = useCallback((palette: Partial<CustomPalette>) => {
  setCustomization(prev => ({
    ...prev,
    customPalette: { ...prev.customPalette, ...palette }
  }));
  // Just postMessage - NO previewKey increment
  sendPreviewUpdate();
}, [sendPreviewUpdate]);

const updateTheme = useCallback((themeId: ThemeId) => {
  setCustomization(prev => ({ ...prev, themeId }));
  // Theme changes DO need iframe reload (structural HTML changes)
  setPreviewKey(prev => prev + 1);
}, []);
```

**PreviewCustomizationProvider already handles CSS injection** (`src/components/PreviewCustomizationProvider.tsx:61-98`):
- Listens for `CUSTOMIZATION_UPDATE` postMessage ✅
- Injects CSS variables into `:root` ✅
- Overrides Tailwind classes ✅
- Dispatches `customization-update` CustomEvent ✅

### Phase 3: Implement R2 Image Upload ✅ COMPLETE (done in Phase 1)

Created dedicated `/api/upload/website-image` endpoint. Using existing R2 upload infrastructure:

```typescript
// In useWebsiteEditor hook
const uploadImage = useCallback(async (file: File, key: keyof CustomImages): Promise<string> => {
  if (demoMode) {
    return URL.createObjectURL(file); // Demo mode: blob URL is acceptable
  }

  setUploadProgress(0);

  const result = await uploadToR2({
    file,
    weddingId,
    contentType: file.type,
    onProgress: (progress) => setUploadProgress(progress),
    // Use website-specific path to avoid mixing with gallery media
    customPath: `website/${key}`
  });

  setUploadProgress(null);

  // Update customization with permanent URL
  setCustomization(prev => ({
    ...prev,
    customImages: { ...prev.customImages, [key]: result.publicUrl }
  }));

  return result.publicUrl;
}, [weddingId, demoMode]);
```

**Note:** May need to modify `/api/upload/presign` to accept `customPath` parameter, or create dedicated `/api/upload/website-image` endpoint.

### Phase 4: Light Theme + AdminUI Components ✅ COMPLETE

Replaced dark theme with light theme matching AdminPanel. Updated colors:

**Color Mapping:**
| Current (Dark) | New (Light) | Usage |
|----------------|-------------|-------|
| `#0f0f0f` | `#f3f0f4` | Page background |
| `#1a1a1a` | `#ffffff` | Card/sidebar background |
| `#2a2a2a` | `#e5e5e5` | Borders, dividers |
| `text-white` | `text-charcoal` | Primary text |
| `text-gray-400` | `text-charcoal-light` | Secondary text |
| `text-gray-500` | `text-muted` | Muted text |
| `burgundy` | `burgundy` | Accent (keep) |

**Component Replacements:**

```tsx
// Before (inline dark styles)
<div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
  <button className="bg-burgundy hover:bg-burgundy-light text-white px-4 py-2 rounded">
    Save
  </button>
</div>

// After (AdminUI components)
<AdminCard>
  <AdminButton variant="primary">Save</AdminButton>
</AdminCard>
```

### Phase 5: Component Extraction

Split monolithic WebsiteEditor into focused components:

```
src/
├── components/admin/
│   ├── WebsiteEditor.tsx           # Main layout (~150 lines)
│   ├── WebsiteEditorToolbar.tsx    # Top bar with device/zoom controls
│   ├── WebsiteEditorSidebar.tsx    # Left panel with tabs
│   ├── WebsiteEditorPreview.tsx    # Right panel with iframe
│   ├── ColorPaletteEditor.tsx      # Keep (already separate)
│   ├── ContentEditor.tsx           # Keep (already separate)
│   └── ImageManager.tsx            # Update with R2 upload
├── hooks/
│   └── useWebsiteEditor.ts         # All state & logic
```

## Technical Considerations

### Architecture

**Hook Pattern:** Follow existing `useDataService` pattern from `src/lib/services/dataService.ts`:
- Lazy initialization with useState
- Cleanup on unmount
- Return object with state + actions

**PostMessage Security:** Add origin validation in `PreviewCustomizationProvider`:
```typescript
const handleMessage = (event: MessageEvent) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === 'CUSTOMIZATION_UPDATE') {
    // ... handle
  }
};
```

### Performance

**Debounce Strategy:**
- CSS injection: Immediate (no debounce needed)
- Auto-save: 2000ms debounce (keep current)
- Theme reload: Immediate (user expects feedback)

**Remove cache busting:** Change iframe src from:
```tsx
src={`/${weddingSlug}?preview=true&t=${Date.now()}`}
```
to:
```tsx
src={`/${weddingSlug}?preview=true&v=${previewKey}`}
```

### Security

**R2 Upload Validation:**
- File type: image/jpeg, image/png, image/webp only
- File size: Max 5MB for website images (smaller than gallery 10MB)
- Sanitize filename before presign

**CSRF:** Existing middleware handles API protection.

## Acceptance Criteria

### Functional Requirements

- [ ] **F1:** Color changes reflect in preview within 100ms (no iframe reload)
- [ ] **F2:** Theme changes trigger iframe reload with loading indicator
- [ ] **F3:** Content text changes reflect in preview within 100ms
- [ ] **F4:** Image upload persists to R2 and survives page refresh
- [ ] **F5:** Upload progress indicator shown during R2 upload
- [ ] **F6:** Auto-save triggers 2 seconds after last change
- [ ] **F7:** Save status indicator shows idle/saving/saved/error states
- [ ] **F8:** "Retour" navigation warns if unsaved changes exist
- [ ] **F9:** All existing functionality preserved (device preview, zoom, reset)

### Non-Functional Requirements

- [ ] **NF1:** Main WebsiteEditor component ≤ 200 lines
- [ ] **NF2:** useWebsiteEditor hook encapsulates all business logic
- [ ] **NF3:** Editor uses AdminUI components (AdminCard, AdminButton, etc.)
- [ ] **NF4:** Visual consistency with AdminPanel (light theme)
- [ ] **NF5:** No console errors or warnings in development

### Quality Gates

- [ ] Unit tests for `useWebsiteEditor` hook (save logic, state transitions)
- [ ] Manual testing of all 6 image slots
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Performance verification: color change < 100ms

## Implementation Phases

### Phase 1: Hook Extraction (Foundation)
**Files:**
- Create `src/hooks/useWebsiteEditor.ts`
- Modify `src/components/admin/WebsiteEditor.tsx`

**Tasks:**
1. Create hook with current state variables
2. Move save logic to hook
3. Move postMessage logic to hook
4. Update WebsiteEditor to use hook
5. Verify no regression

**Success:** All existing functionality works, code is cleaner

### Phase 2: Performance Fix (Preview)
**Files:**
- Modify `src/hooks/useWebsiteEditor.ts`

**Tasks:**
1. Separate `updateTheme` from `updateColors`/`updateContent`/`updateImages`
2. Only increment `previewKey` in `updateTheme`
3. Remove 500ms debounced reload effect
4. Add origin validation to PostMessage listener
5. Test color changes are instant

**Success:** Color changes < 100ms, theme changes still reload

### Phase 3: R2 Upload (Feature)
**Files:**
- Modify `src/hooks/useWebsiteEditor.ts`
- Modify `src/components/admin/ImageManager.tsx`
- Possibly modify `/api/upload/presign.ts`

**Tasks:**
1. Add `uploadImage` function to hook
2. Add progress state to hook
3. Wire ImageManager `onUpload` to hook
4. Add upload progress UI in ImageManager
5. Test all 6 image slots

**Success:** Images persist after refresh

### Phase 4: Light Theme (Design)
**Files:**
- Modify `src/components/admin/WebsiteEditor.tsx`
- Modify `src/components/admin/WebsiteEditorToolbar.tsx` (new)
- Modify `src/components/admin/WebsiteEditorSidebar.tsx` (new)
- Modify `src/components/admin/WebsiteEditorPreview.tsx` (new)

**Tasks:**
1. Replace dark colors with light theme tokens
2. Replace inline styles with AdminUI components
3. Extract Toolbar component
4. Extract Sidebar component
5. Extract Preview component
6. Visual QA against AdminPanel

**Success:** Editor looks consistent with AdminPanel

### Phase 5: Polish (UX)
**Files:**
- Modify `src/hooks/useWebsiteEditor.ts`
- Modify `src/components/admin/WebsiteEditor.tsx`

**Tasks:**
1. Add `beforeunload` handler for unsaved changes
2. Intercept "Retour" link click
3. Add offline detection with friendly message
4. Improve error messages

**Success:** No data loss scenarios

## Dependencies & Risks

### Dependencies
- AdminUI components already exist and tested
- R2 upload infrastructure exists (`src/lib/r2/upload.ts`)
- PreviewCustomizationProvider already handles postMessage

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regression in preview | High | Keep existing code until hook is verified |
| R2 presign API needs modification | Medium | May need new endpoint or parameter |
| Light theme breaks readability | Medium | Test color contrast, use admin-theme tokens |
| Performance degrades on slow connections | Low | Add loading states, offline indicator |

## Success Metrics

1. **Performance:** Color change → preview update < 100ms (currently ~600ms)
2. **Code Quality:** Main component < 200 lines (currently 664)
3. **Design:** Zero visual inconsistencies with AdminPanel
4. **Features:** 100% image upload success rate to R2

## References

### Internal References
- Brainstorm: `docs/brainstorms/2026-01-29-website-editor-refactoring-brainstorm.md`
- Current Editor: `src/components/admin/WebsiteEditor.tsx`
- Preview Provider: `src/components/PreviewCustomizationProvider.tsx`
- Admin Theme: `src/styles/admin-theme.ts`
- AdminUI Components: `src/components/admin/ui/*.tsx`
- R2 Upload: `src/lib/r2/upload.ts`
- Upload API: `src/pages/api/upload/presign.ts`

### External References
- postMessage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- React Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks

### Related Work
- Previous PR: #29 (Live preview debounce fix)
- Previous fix: `d583493` (iframe embedding fix)
