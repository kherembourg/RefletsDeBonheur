---
status: complete
priority: p1
issue_id: "020"
tags: [code-review, security, xss, pr-30]
dependencies: []
---

# Missing postMessage Origin Validation

## Problem Statement

The `PreviewCustomizationProvider` component accepts postMessage events without validating the origin of the sender. This allows any malicious website to potentially inject customization data into the preview iframe.

## Findings

**Location:** `src/components/PreviewCustomizationProvider.tsx:59-69`

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'CUSTOMIZATION_UPDATE') {
      setCustomization(event.data.customization);  // No origin check!
    }
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

**Note:** The sender (`useWebsiteEditor.ts:140-146`) does validate origin when sending, but the receiver must also validate.

**Impact:**
- Potential XSS via injected CSS/content
- Preview defacement
- Could be escalated if customization data expands

## Proposed Solutions

### Option A: Add Origin Validation (Recommended)
**Pros:** Simple, follows security best practices
**Cons:** None
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
const handleMessage = (event: MessageEvent) => {
  // Validate origin
  if (event.origin !== window.location.origin) {
    console.warn('Rejected postMessage from untrusted origin:', event.origin);
    return;
  }
  if (event.data?.type === 'CUSTOMIZATION_UPDATE') {
    setCustomization(event.data.customization);
  }
};
```

## Recommended Action

Option A - Add origin validation to the message receiver

## Technical Details

**Affected files:**
- `src/components/PreviewCustomizationProvider.tsx`

## Acceptance Criteria

- [ ] postMessage handler validates `event.origin` matches `window.location.origin`
- [ ] Console warning logged for rejected messages (development only)
- [ ] Live preview continues to work normally

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-30 | Created from PR #30 code review | Both sender AND receiver should validate origin |

## Resources

- PR: https://github.com/kherembourg/RefletsDeBonheur/pull/30
- MDN postMessage security: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns
