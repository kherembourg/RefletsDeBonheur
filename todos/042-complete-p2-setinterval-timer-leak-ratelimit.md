---
status: complete
priority: p2
issue_id: "042"
tags: [code-review, performance, rate-limiting, pr-49]
dependencies: ["040"]
---

# setInterval Timer Leak in Rate Limiter

## Problem Statement

The `setInterval` at module load time in `rateLimit.ts` (lines 17-26) has no cleanup handle. The return value is discarded. This causes:
- Timer leaks in serverless/edge environments
- Duplicate intervals if module is re-imported
- Open handle warnings in Vitest tests

## Findings

**Source:** Performance oracle (MEDIUM)

## Proposed Solutions

Replace with lazy cleanup inside `checkRateLimit()` (see todo #040 which combines this fix).

## Acceptance Criteria

- [ ] No background setInterval in rateLimit.ts
- [ ] Cleanup happens lazily during checkRateLimit calls
- [ ] No open handle warnings in tests
