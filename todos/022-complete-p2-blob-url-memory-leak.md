---
status: complete
priority: p2
issue_id: "022"
tags: [code-review, performance, memory-leak, pr-30]
dependencies: []
---

# Memory Leak: Blob URLs Not Revoked in Demo Mode

## Problem Statement

Blob URLs created with `URL.createObjectURL()` in demo mode are never revoked with `URL.revokeObjectURL()`. Each image upload creates a blob URL that persists in memory until the page is closed.

## Findings

**Location:** `src/hooks/useWebsiteEditor.ts:320-325`

```typescript
if (demoMode) {
  const blobUrl = URL.createObjectURL(file);
  updateImages({ [key]: blobUrl });
  return blobUrl;
}
```

**Impact:**
- Memory grows with each upload during a session
- With 6 image slots and experimentation, could accumulate 50MB+ in extended sessions
- Browser may become sluggish

## Proposed Solutions

### Option A: Track and Revoke Blob URLs (Recommended)
**Pros:** Proper cleanup, no memory leak
**Cons:** Slightly more complex
**Effort:** Small (15 lines)
**Risk:** Low

```typescript
const blobUrlsRef = useRef<Set<string>>(new Set());

// In uploadImage:
if (demoMode) {
  // Revoke previous blob URL for this key if exists
  const prevUrl = customizationRef.current.customImages?.[key];
  if (prevUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(prevUrl);
    blobUrlsRef.current.delete(prevUrl);
  }

  const blobUrl = URL.createObjectURL(file);
  blobUrlsRef.current.add(blobUrl);
  updateImages({ [key]: blobUrl });
  return blobUrl;
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
  };
}, []);
```

## Recommended Action

Option A - Track blob URLs in a ref and revoke on replacement or unmount

## Technical Details

**Affected files:**
- `src/hooks/useWebsiteEditor.ts`

## Acceptance Criteria

- [ ] Blob URLs are revoked when replaced with new upload
- [ ] All blob URLs are revoked on component unmount
- [ ] No memory accumulation in extended editing sessions

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Always pair createObjectURL with revokeObjectURL |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
- MDN URL.revokeObjectURL: https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL
