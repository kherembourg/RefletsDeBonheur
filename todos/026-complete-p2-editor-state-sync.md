---
status: complete
priority: p2
issue_id: "026"
tags: [code-review, react, state-management, pr-30]
dependencies: []
---

# Editor Subcomponents Don't Sync When Parent Resets

## Problem Statement

ColorPaletteEditor, ContentEditor, and ImageManager maintain local state that shadows their props. When the parent calls `resetToDefault()`, these components don't update because they don't sync with prop changes.

## Findings

**ColorPaletteEditor.tsx:92-94:**
```typescript
const [editingPalette, setEditingPalette] = useState<CustomPalette>(
  customPalette || {}
);
// No useEffect to sync when customPalette prop changes!
```

**ContentEditor.tsx:291-293:**
```typescript
const [editingContent, setEditingContent] = useState<CustomContent>(
  customContent || {}
);
// Same issue
```

**ImageManager.tsx:66:**
```typescript
const [editingImages, setEditingImages] = useState<CustomImages>(customImages || {});
// Same issue
```

**Impact:**
- Reset button doesn't visually reset the editors
- Stale data in UI after parent state changes
- Confusing user experience

## Proposed Solutions

### Option A: Add useEffect to Sync Props (Recommended)
**Pros:** Simple fix, maintains existing patterns
**Cons:** Extra re-render on prop change
**Effort:** Small
**Risk:** Low

```typescript
// In each editor component
useEffect(() => {
  setEditingPalette(customPalette || {});
}, [customPalette]);
```

### Option B: Remove Local State, Use Props Directly
**Pros:** Single source of truth
**Cons:** Larger refactor, may affect controlled/uncontrolled behavior
**Effort:** Medium
**Risk:** Medium

## Recommended Action

Option A - Add useEffect sync in each component

## Technical Details

**Affected files:**
- `src/components/admin/ColorPaletteEditor.tsx`
- `src/components/admin/ContentEditor.tsx`
- `src/components/admin/ImageManager.tsx`

## Acceptance Criteria

- [ ] Reset button visually resets all editor fields
- [ ] Theme change properly refreshes color palette display
- [ ] Parent state changes reflect in all child editors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Controlled components need to sync with prop changes |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
