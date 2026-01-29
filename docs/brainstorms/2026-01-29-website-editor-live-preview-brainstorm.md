# Website Editor Live Preview Fix

**Date**: 2026-01-29
**Status**: Ready for Planning

---

## What We're Building

Fix the Website Editor so the preview updates in real-time when users change theme, colors, content, or images.

**Current behavior**: Preview only updates after clicking "Save" (iframe reloads via `previewKey++`)

**Target behavior**: Preview updates automatically 500ms after any change, with a loading indicator during reload

---

## Why This Approach

We chose **debounced iframe reload** over alternatives:

| Approach | Complexity | UX | Chosen |
|----------|------------|-----|--------|
| Debounced reload | Low | Good (500ms delay) | ✅ |
| CSS + Content hybrid | Medium | Better for colors | ❌ |
| Full React conversion | High | Best | ❌ |

**Rationale**: YAGNI - the simple approach solves the problem without over-engineering. The 500ms delay is acceptable UX and avoids:
- Converting Astro pages to React
- Managing complex state sync between editor and preview
- Potential bugs from partial updates

---

## Key Decisions

### 1. Debounce timing: **500ms**
- Good balance between reactivity and stability
- Prevents excessive reloads while typing
- Still feels responsive

### 2. Loading indicator: **Semi-transparent overlay with spinner**
- Shows user that preview is updating
- Prevents confusion during brief reload
- Overlay on iframe area only

### 3. Implementation location: **WebsiteEditor.tsx only**
- No changes to preview page needed
- Self-contained fix
- Uses existing `previewKey` mechanism

---

## Technical Approach

### Changes to `WebsiteEditor.tsx`:

1. **Add debounced reload effect**:
```typescript
// Debounce customization changes → trigger preview reload
useEffect(() => {
  const timer = setTimeout(() => {
    setPreviewKey((prev) => prev + 1);
  }, 500);
  return () => clearTimeout(timer);
}, [customization]);
```

2. **Add loading state**:
```typescript
const [isPreviewLoading, setIsPreviewLoading] = useState(false);

// Set loading when key changes
useEffect(() => {
  setIsPreviewLoading(true);
}, [previewKey]);

// Clear loading when iframe loads
const handleIframeLoad = () => setIsPreviewLoading(false);
```

3. **Add overlay UI**:
```tsx
<div className="relative">
  <iframe
    ref={iframeRef}
    key={previewKey}
    onLoad={handleIframeLoad}
    // ... existing props
  />
  {isPreviewLoading && (
    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )}
</div>
```

### Files to modify:
- `src/components/admin/WebsiteEditor.tsx` - Add debounce + loading state

### Files unchanged:
- `PreviewCustomizationProvider.tsx` - Keep existing (useful for future CSS-only improvements)
- `[slug]/index.astro` - No changes needed

---

## Open Questions

None - approach is straightforward.

---

## Success Criteria

- [ ] Preview updates within ~500ms of any customization change
- [ ] Loading overlay appears during iframe reload
- [ ] No flickering or jarring transitions
- [ ] Works for all customization types: theme, colors, content, images
- [ ] Existing "Save" functionality unchanged
- [ ] No performance regression (debounce prevents excessive reloads)

---

## Next Steps

Run `/workflows:plan` to create implementation tasks.
