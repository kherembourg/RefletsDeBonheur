---
status: complete
priority: p2
issue_id: "044"
tags: [code-review, testing, rate-limiting, pr-49]
dependencies: []
---

# Self-Referential Rate Limit Tests

## Problem Statement

In `verify-payment.test.ts` (lines 26-106), rate limit tests re-mock the entire `RATE_LIMITS` object, then assert the mock values equal themselves. The test exercises the mock, not the real system. Example:

```typescript
it('verifyPayment rate limit config should have correct values', async () => {
  const { RATE_LIMITS } = await import('../../../lib/rateLimit');
  expect(RATE_LIMITS.verifyPayment).toEqual({
    limit: 10, windowSeconds: 3600, prefix: 'verify-payment',
  });
});
```

This asserts the mock set up 30 lines earlier. The `rateLimit.test.ts` file already properly tests the real rate limiter.

## Findings

**Source:** Pattern recognition (HIGH), Code simplicity reviewer

Also: the test uses `(checkRateLimit as any).mockReturnValue(...)` instead of `vi.mocked()`.

## Proposed Solutions

### Option A: Remove self-referential tests, add proper integration test
- Remove the mock-asserting-mock tests (~60 LOC)
- Add a test that mocks `checkRateLimit` to return `{allowed: false}` and verifies the endpoint returns 429
- Effort: Small

## Acceptance Criteria

- [ ] verify-payment.test.ts has a test that verifies 429 when rate limited
- [ ] No tests that assert mock values equal themselves
- [ ] Use `vi.mocked()` instead of `as any` for mock type safety
