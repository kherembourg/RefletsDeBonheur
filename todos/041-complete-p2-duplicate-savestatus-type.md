---
status: complete
priority: p2
issue_id: "041"
tags: [code-review, typescript, architecture, pr-48]
dependencies: []
---

# Duplicate SaveStatus Type Definition

## Problem Statement

`SaveStatus` type is declared identically in two locations:
- `src/hooks/useWebsiteEditor.ts` line 22
- `src/components/admin/website-editor/types.ts` line 14

Both define `'idle' | 'saving' | 'saved' | 'error'`. If either changes, they will silently diverge since TypeScript uses structural typing.

## Findings

**Source:** TypeScript reviewer, Pattern recognition specialist

## Proposed Solutions

### Option A: Re-export from hook (Recommended)
In `website-editor/types.ts`:
```typescript
export type { SaveStatus } from '../../../hooks/useWebsiteEditor';
```
- Pros: Single source of truth, minimal change
- Effort: Small

### Option B: Move canonical type to types.ts, update hook
- Pros: Types file becomes the authority
- Effort: Small

## Acceptance Criteria

- [ ] `SaveStatus` is defined in exactly one location
- [ ] Both the hook and the component import from the same source
