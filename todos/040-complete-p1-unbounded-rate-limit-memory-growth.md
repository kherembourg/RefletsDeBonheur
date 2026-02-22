---
status: complete
priority: p1
issue_id: "040"
tags: [code-review, security, performance, rate-limiting, pr-49]
dependencies: []
---

# Unbounded Rate Limit Map Memory Growth

## Problem Statement

The in-memory `rateLimitStore` Map has no maximum size cap. Under a botnet attack with unique IPs, entries accumulate unboundedly between the 5-minute cleanup intervals. With 1-hour windows for financial endpoints, entries persist far longer than cleanup cycles.

**Worst-case estimate:** 10K unique IPs/sec * 300s cleanup interval = 3M entries * ~100 bytes = ~300MB per cycle.

## Findings

**Source:** Security sentinel (MEDIUM-2), Performance oracle (HIGH)

- File: `src/lib/rateLimit.ts` line 14 (`new Map()`) and lines 17-26 (cleanup)
- Cleanup runs every 5 minutes but windows are 60 minutes for financial endpoints
- No upper bound on Map size
- Each entry: key string (~30B) + record (~16B) + Map overhead (~50B)

## Proposed Solutions

### Option A: Add max store size with eviction (Recommended)
```typescript
const MAX_STORE_SIZE = 100_000;

export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt < now) rateLimitStore.delete(key);
    }
    // If still over limit after cleaning expired, evict oldest
    if (rateLimitStore.size > MAX_STORE_SIZE) {
      const entriesToDelete = rateLimitStore.size - MAX_STORE_SIZE + 1000;
      let deleted = 0;
      for (const key of rateLimitStore.keys()) {
        if (deleted >= entriesToDelete) break;
        rateLimitStore.delete(key);
        deleted++;
      }
    }
  }
  // ... existing logic
}
```
- Pros: Simple, bounded memory usage
- Cons: Under extreme attack, some legitimate users may lose rate limit history
- Effort: Small
- Risk: Low

### Option B: Replace setInterval with lazy cleanup
```typescript
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Inside checkRateLimit:
if (now - lastCleanup > CLEANUP_INTERVAL) {
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) rateLimitStore.delete(key);
  }
}
```
- Pros: No background timer, works in serverless, deterministic
- Cons: Cleanup only happens when requests arrive
- Effort: Small
- Risk: Low

## Recommended Action

Combine both: lazy cleanup + max store size cap.

## Technical Details

- **Affected files:** `src/lib/rateLimit.ts`
- **PR:** #49

## Acceptance Criteria

- [ ] Rate limit Map has a configurable maximum size (e.g., 100K entries)
- [ ] Expired entries are cleaned on-demand, not just on timer
- [ ] setInterval is removed or made optional
- [ ] Tests verify memory bounds under simulated load

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-22 | Created from code review of PRs #46-51 | Both Security + Performance agents flagged this |

## Resources

- PR #49: feat/rate-limiting-signup
