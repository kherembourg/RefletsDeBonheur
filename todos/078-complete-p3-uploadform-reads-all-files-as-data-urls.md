---
status: pending
priority: p3
issue_id: "078"
tags: [code-review, performance]
dependencies: []
---

# UploadForm Reads ALL Files as Data URLs Into Memory

## Problem Statement

`UploadForm.tsx` calls `reader.readAsDataURL(file)` for every selected file (line 73), converting the entire file content into a base64 string stored in React state. For a 50MB video, this creates a ~67MB base64 string in memory. With 10 files selected, this could use 500MB+ of browser memory.

## Findings

**File:** `src/components/gallery/UploadForm.tsx` lines 60-74

```typescript
const reader = new FileReader();
reader.onload = (event) => {
  const newItem: UploadItem = {
    ...
    preview: event.target?.result as string, // Full base64 data URL
  };
  setQueue(prev => [...prev, newItem]);
};
reader.readAsDataURL(file);
```

For previews, `URL.createObjectURL(file)` would be far more memory-efficient — it creates a reference to the file blob without copying its content.

## Proposed Solutions

### Option A: Use URL.createObjectURL for previews (Recommended)
- Replace `readAsDataURL` with `URL.createObjectURL(file)`
- Add cleanup with `URL.revokeObjectURL()` when items are removed
- **Effort:** Small | **Risk:** None

## Acceptance Criteria

- [ ] File previews use object URLs instead of data URLs
- [ ] Object URLs are revoked when files are removed from queue
