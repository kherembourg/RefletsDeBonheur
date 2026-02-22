---
status: complete
priority: p3
issue_id: "047"
tags: [code-review, documentation, rate-limiting, pr-49]
dependencies: []
---

# Rate Limiter Doc Comment Says "Sliding Window" But Is Fixed Window

## Problem Statement

`rateLimit.ts` line 4 says "In-memory rate limiter using sliding window algorithm" but the implementation is a fixed-window counter. With fixed windows, an attacker can send `limit` requests at end of window N, then `limit` more at start of window N+1, achieving `2 * limit` in a short burst.

## Findings

**Source:** Performance oracle (LOW)

## Proposed Solutions

Correct the doc comment to "fixed window algorithm" and document the burst vulnerability for future consideration.

## Acceptance Criteria

- [ ] Doc comment accurately describes the algorithm
