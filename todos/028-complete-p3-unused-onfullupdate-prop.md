---
status: complete
priority: p3
issue_id: "028"
tags: [code-review, code-quality, cleanup, pr-30]
dependencies: []
---

# Unused onFullUpdate Prop

## Problem Statement

The `onFullUpdate` prop is defined in EditorContentProps, passed to EditorContent, but never used in the function body. This is dead code that adds confusion.

## Findings

**Location:** `src/components/admin/WebsiteEditor.tsx:403, 414`

```typescript
interface EditorContentProps {
  // ...
  onFullUpdate: (customization: WeddingCustomization) => void;  // line 403
}

function EditorContent({
  // ...
  onFullUpdate,  // line 414 - DESTRUCTURED BUT NEVER USED
```

Also related: The hook exports `setCustomization` which is only used for this unused prop.

**Impact:**
- Dead code clutters the codebase
- Confusing for developers
- Unused exports increase bundle size slightly

## Proposed Solutions

### Option A: Remove Unused Prop (Recommended)
**Pros:** Cleaner code
**Cons:** None
**Effort:** Very small (2 minutes)
**Risk:** None

1. Remove `onFullUpdate` from EditorContentProps
2. Remove from EditorContent destructuring
3. Remove `setCustomization` from hook return if not needed elsewhere

## Recommended Action

Option A - Remove the unused prop

## Technical Details

**Affected files:**
- `src/components/admin/WebsiteEditor.tsx`
- `src/hooks/useWebsiteEditor.ts` (if removing setCustomization)

## Acceptance Criteria

- [ ] No unused props in EditorContent
- [ ] No TypeScript errors
- [ ] Functionality unchanged

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Remove dead code promptly |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
