---
title: "Website Editor Preview Not Updating in Real-Time"
date: 2026-01-29
category: ui-bugs
tags: [react, iframe, debounce, loading-state, preview]
module: admin/WebsiteEditor
severity: medium
symptoms:
  - Preview iframe doesn't update when changing theme/colors/content
  - Must click Save to see preview changes
  - No visual feedback during preview updates
---

# Website Editor Preview Not Updating in Real-Time

## Problem Statement

The Website Editor's preview panel did not update in real-time when users changed customizations (theme, colors, content, images). Users had to manually click "Save" to see their changes reflected in the preview iframe.

**Impact**: Poor UX - users couldn't see immediate feedback when customizing their wedding website.

## Symptoms

- Preview stays static while editing theme/colors/content
- Changes only visible after clicking Save button
- No loading indicator when preview should be refreshing
- Documented as "Known Issue" in CLAUDE.md

## Root Cause

The `previewKey` state (used to force iframe reload via React's `key` prop) was only incremented after a successful save operation (`performSave()` at line 157). There was no mechanism to trigger preview updates during editing.

```typescript
// BEFORE: previewKey only changed on save
const refreshPreview = () => {
  setPreviewKey((prev) => prev + 1);
};

// Called only after save completed
```

## Solution

Implemented **debounced iframe reload** (500ms) that triggers automatically when customization changes.

### Key Changes

**1. Add loading state** (line 60):
```typescript
const [isPreviewLoading, setIsPreviewLoading] = useState(false);
```

**2. Add debounced preview reload effect** (lines 197-211):
```typescript
const isInitialMount = useRef(true);
useEffect(() => {
  // Skip initial render
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return;
  }

  const timer = setTimeout(() => {
    setPreviewKey((prev) => prev + 1);
  }, 500);

  return () => clearTimeout(timer);
}, [customization]);
```

**3. Set loading when preview key changes** (lines 214-218):
```typescript
useEffect(() => {
  if (previewKey > 0) {
    setIsPreviewLoading(true);
  }
}, [previewKey]);
```

**4. Handle iframe load** (lines 221-223):
```typescript
const handleIframeLoad = useCallback(() => {
  setIsPreviewLoading(false);
}, []);
```

**5. Add loading overlay to iframe** (lines 481-498):
```tsx
<div className="relative w-full" style={{ height: '...' }}>
  <iframe
    key={previewKey}
    ref={iframeRef}
    src={`/${weddingSlug}?preview=true&t=${Date.now()}`}
    onLoad={handleIframeLoad}
    // ... other props
  />

  {isPreviewLoading && (
    <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )}
</div>
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| 500ms debounce | Balance between responsivity and preventing reload spam |
| Iframe reload (not CSS injection) | Simple, handles ALL customization types (theme + colors + content + images) |
| Loading overlay | Visual feedback during update |
| Skip initial mount | Prevent unnecessary reload on component mount |

### Alternatives Considered

1. **CSS-only updates via postMessage**: Would only work for colors, not theme structure or content
2. **Full React conversion**: Overkill complexity for the problem
3. **No debounce (immediate reload)**: Would cause excessive iframe reloads and flickering

## Prevention

- When implementing preview functionality, always consider live updates
- Debounce user-triggered state changes that affect resource-intensive operations (iframe reload)
- Provide visual feedback during loading states

## Testing

Tests added in `WebsiteEditor.test.tsx`:

```typescript
describe('Live Preview', () => {
  it('does not show loading overlay before debounce timeout');
  it('shows loading overlay after 500ms debounce when customization changes');
  it('hides loading overlay when iframe loads');
  it('resets debounce timer when customization changes again');
});
```

## Files Changed

- `src/components/admin/WebsiteEditor.tsx` (+35 lines)
- `src/components/admin/WebsiteEditor.test.tsx` (new file, 7 tests)
- `CLAUDE.md` (marked issue as resolved)

## Related

- PR #29: fix(website-editor): Live preview with debounced reload
- Architecture doc: `docs/architecture/website-editor.md`
- Brainstorm: `docs/brainstorms/2026-01-29-website-editor-live-preview-brainstorm.md`
- Plan: `docs/plans/2026-01-29-fix-website-editor-live-preview-plan.md`

## Keywords

iframe preview, debounce, live preview, real-time updates, loading overlay, React useEffect, setTimeout cleanup
