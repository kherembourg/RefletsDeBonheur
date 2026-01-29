# Website Editor Refactoring Brainstorm

**Date:** 2026-01-29
**Status:** Ready for Planning
**Author:** Kevin + Claude

---

## What We're Building

A complete refactoring of the Website Editor to fix performance issues and align with the admin interface design.

### Current Problems

1. **Performance:** Full iframe reload on every change (even with 500ms debounce)
   - postMessage exists but iframe doesn't handle live updates
   - `Date.now()` cache busting prevents resource reuse
   - 8 overlapping useEffects create complex timing issues

2. **Design Mismatch:**
   - Editor uses dark theme (`#0f0f0f`, `#1a1a1a`)
   - AdminPanel uses light theme (`#f3f0f4`, white cards)
   - Editor doesn't use reusable AdminUI components

3. **Missing Features:**
   - Image upload to R2 not implemented (TODO in code)

### Target State

- **Instant preview updates** for color/content changes (no iframe reload)
- **Unified light theme** matching AdminPanel aesthetic
- **Clean architecture** with extracted hook and AdminUI components
- **Working R2 upload** for custom images

---

## Why This Approach

**Approach Chosen:** Refonte Modulaire Complète (Option A)

We chose a complete refactoring over incremental patches because:

1. The current code has 9 state variables and 8 useEffects tightly coupled
2. Patching would add more complexity to already complex code
3. A clean hook extraction isolates business logic from UI
4. AdminUI components are already built and tested - just need to use them

---

## Key Decisions

### 1. Performance: Live CSS Injection via postMessage

**Decision:** Use postMessage to inject CSS variables in real-time. Only reload iframe for theme changes.

**Implementation:**
- Editor sends `{ type: 'CUSTOMIZATION_UPDATE', customization }` on every change
- `PreviewCustomizationProvider` (already in iframe) listens and updates CSS variables
- Remove the `previewKey` increment logic for non-structural changes
- Keep iframe reload only for `themeId` changes (structural)

### 2. Design: Unified Light Theme

**Decision:** Adopt AdminPanel light theme for the entire editor.

**Changes:**
- Background: `#f3f0f4` instead of `#0f0f0f`
- Cards: White with `border-charcoal/5` shadows
- Accent: Keep burgundy (`#ae1725`) for consistency with wedding brand
- Replace inline Tailwind with `AdminCard`, `AdminButton`, `AdminInput`, etc.

### 3. Architecture: Extract `useWebsiteEditor()` Hook

**Decision:** Create a custom hook to centralize all state and logic.

**Hook responsibilities:**
```typescript
function useWebsiteEditor(weddingId: string, weddingSlug: string, options: {
  demoMode?: boolean;
  initialCustomization?: WeddingCustomization;
}) {
  // State
  customization, setCustomization
  saveStatus
  hasUnsavedChanges

  // Actions
  updateTheme(themeId)
  updateColors(palette)
  updateContent(content)
  updateImages(images)
  resetToDefault()

  // Preview control
  previewKey  // Only for structural changes
  refreshPreview()

  // Auto-save logic encapsulated
}
```

**Benefits:**
- WebsiteEditor component becomes pure UI
- Easy to test hook in isolation
- Clear separation of concerns

### 4. Features: Implement R2 Upload

**Decision:** Connect ImageManager to existing R2 upload API.

**Flow:**
1. User selects image in ImageManager
2. Call `/api/upload/presign` to get presigned URL
3. Upload directly to R2
4. Call `/api/upload/confirm` (or just use the URL directly for customization)
5. Store URL in `customization.customImages`

---

## Open Questions

1. **Backwards compatibility:** Should we migrate existing customizations or start fresh?
   - Recommendation: Migrate - the data structure doesn't change, only the UI

2. **Mobile editor:** The current editor is desktop-only. Should we address mobile?
   - Recommendation: Out of scope for this refactoring. Add later.

3. **Undo/Redo:** Should we add undo functionality?
   - Recommendation: Nice-to-have. Consider for Phase 2.

---

## Component Structure (Proposed)

```
src/
├── components/admin/
│   ├── WebsiteEditor.tsx          # Main component (UI only, ~200 lines)
│   ├── WebsiteEditorSidebar.tsx   # Left panel with tabs
│   ├── WebsiteEditorPreview.tsx   # Right panel with iframe
│   ├── WebsiteEditorToolbar.tsx   # Top toolbar
│   ├── ColorPaletteEditor.tsx     # Keep, update to AdminUI
│   ├── ContentEditor.tsx          # Keep, update to AdminUI
│   └── ImageManager.tsx           # Keep, add R2 upload
├── hooks/
│   └── useWebsiteEditor.ts        # All state & logic
└── components/
    └── PreviewCustomizationProvider.tsx  # Update to handle live CSS injection
```

---

## Success Criteria

- [ ] Color changes reflect in preview within 50ms (no visible delay)
- [ ] Theme changes reload iframe (acceptable delay)
- [ ] Editor visually matches AdminPanel (same cards, buttons, colors)
- [ ] Image upload works and persists to R2
- [ ] Code is simpler: <300 lines in main component, hook handles complexity
- [ ] All existing functionality preserved

---

## Next Steps

Run `/workflows:plan` to create detailed implementation tasks.
