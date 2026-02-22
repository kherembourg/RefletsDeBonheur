---
status: pending
priority: p2
issue_id: "051"
tags: [code-review, security, validation, signup, trial]
dependencies: []
---

# Missing Server-Side theme_id Validation

## Problem Statement

The `create-account.ts` endpoint accepts `theme_id` from the client without validating it against the list of allowed theme IDs. An attacker could submit an arbitrary string.

## Findings

- **Source:** Security Sentinel agent
- **Location:** `src/pages/api/signup/create-account.ts`
- **Related:** `src/lib/themes.ts` contains `themeList` with valid theme IDs

## Proposed Solutions

### Option A: Validate theme_id against themeList (Recommended)
```typescript
import { themeList } from '../../lib/themes';
const validThemeIds = themeList.map(t => t.id);
if (!validThemeIds.includes(theme_id)) {
  return apiResponse.error('Invalid theme', 400, 'theme_id');
}
```
- **Effort:** Small
- **Risk:** Low

## Acceptance Criteria

- [ ] theme_id is validated against allowed list server-side
- [ ] Invalid theme_id returns 400 error
- [ ] Test added for invalid theme_id
