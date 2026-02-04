# ✅ Add Per-Wedding Rate Limiting for Upload Confirmation

**Status:** completed
**Priority:** P2 (IMPORTANT)
**Category:** Security / Performance
**Created:** 2026-02-04
**Completed:** 2026-02-04
**Source:** Code review PR #37 - security-sentinel agent
**Commit:** ad1caf6

## Problem

The upload confirmation endpoint only has IP-based rate limiting (20 req/min per IP). This doesn't protect against:

1. **Abuse from multiple IPs:** Attacker uses VPN/proxies to bypass IP limits
2. **Legitimate users affected:** Multiple users behind same NAT/proxy share limit
3. **Per-wedding spam:** Can upload unlimited photos to different weddings

**Current Rate Limit:** 20 requests per IP per minute
**Missing:** Per-wedding rate limits

## Current Code

`src/pages/api/upload/confirm.ts:91-96`
```typescript
// Rate limit check - 20 requests per IP per minute
const clientIP = getClientIP(request);
const rateLimitResult = checkRateLimit(clientIP, RATE_LIMITS.upload);
if (!rateLimitResult.allowed) {
  return createRateLimitResponse(rateLimitResult);
}
```

## Solution

Add two-tier rate limiting: IP-based AND per-wedding:

```typescript
// In rateLimit.ts - add wedding rate limit configuration
export const RATE_LIMITS = {
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per IP
  },
  uploadPerWedding: {
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 uploads per wedding per minute
  },
  uploadPerWeddingDaily: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 500, // 500 uploads per wedding per day
  },
};

// New function for wedding-scoped rate limiting
export function checkWeddingRateLimit(
  weddingId: string,
  limit: RateLimitConfig
): RateLimitResult {
  const key = `wedding:${weddingId}`;
  return checkRateLimit(key, limit);
}
```

```typescript
// In confirm.ts - apply both rate limits
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { weddingId } = body;

  // Validate weddingId early
  if (!weddingId || typeof weddingId !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Invalid weddingId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Rate limit check 1: IP-based (protects against single-IP abuse)
  const clientIP = getClientIP(request);
  const ipRateLimit = checkRateLimit(clientIP, RATE_LIMITS.upload);
  if (!ipRateLimit.allowed) {
    return createRateLimitResponse(ipRateLimit);
  }

  // Rate limit check 2: Per-wedding per-minute (protects against distributed abuse)
  const weddingRateLimit = checkWeddingRateLimit(
    weddingId,
    RATE_LIMITS.uploadPerWedding
  );
  if (!weddingRateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded for this wedding',
        message: `Maximum ${RATE_LIMITS.uploadPerWedding.max} uploads per minute per wedding. Try again in ${Math.ceil(weddingRateLimit.retryAfter / 1000)} seconds.`,
        retryAfter: weddingRateLimit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(weddingRateLimit.retryAfter / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMITS.uploadPerWedding.max),
          'X-RateLimit-Remaining': String(weddingRateLimit.remaining),
          'X-RateLimit-Reset': String(weddingRateLimit.resetAt),
        },
      }
    );
  }

  // Rate limit check 3: Per-wedding daily (prevents long-term abuse)
  const dailyRateLimit = checkWeddingRateLimit(
    weddingId,
    RATE_LIMITS.uploadPerWeddingDaily
  );
  if (!dailyRateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Daily upload limit exceeded',
        message: `Maximum ${RATE_LIMITS.uploadPerWeddingDaily.max} uploads per day per wedding. Contact support if you need more capacity.`,
        retryAfter: dailyRateLimit.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(dailyRateLimit.retryAfter / 1000)),
        },
      }
    );
  }

  // ... rest of endpoint logic
};
```

## Configuration

Make limits configurable per subscription tier:

```typescript
// Database: weddings table
// Add columns: max_uploads_per_minute, max_uploads_per_day

// Fetch wedding settings
const { data: wedding } = await adminClient
  .from('weddings')
  .select('max_uploads_per_minute, max_uploads_per_day, subscription_tier')
  .eq('id', weddingId)
  .single();

// Use wedding-specific limits if set
const perMinuteLimit = wedding.max_uploads_per_minute || RATE_LIMITS.uploadPerWedding.max;
const dailyLimit = wedding.max_uploads_per_day || RATE_LIMITS.uploadPerWeddingDaily.max;

// Apply custom limits
const weddingRateLimit = checkRateLimit(
  `wedding:${weddingId}:minute`,
  { ...RATE_LIMITS.uploadPerWedding, max: perMinuteLimit }
);
```

## Testing

Add rate limit tests:

```typescript
describe('Wedding Rate Limiting', () => {
  it('should enforce per-wedding per-minute rate limit', async () => {
    const requests = Array(51).fill(null).map(() =>
      POST({
        request: new Request('http://localhost/api/upload/confirm', {
          method: 'POST',
          body: JSON.stringify({ weddingId: 'wedding-123', /* ... */ }),
        }),
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should not affect other weddings', async () => {
    // Exhaust limit for wedding-123
    await Promise.all(
      Array(50).fill(null).map(() =>
        POST({ request: createRequest('wedding-123') })
      )
    );

    // Wedding-456 should still work
    const response = await POST({ request: createRequest('wedding-456') });
    expect(response.status).toBe(200);
  });

  it('should reset after time window', async () => {
    // Exhaust limit
    await Promise.all(
      Array(50).fill(null).map(() => POST({ request }))
    );

    // Should be rate limited
    const blocked = await POST({ request });
    expect(blocked.status).toBe(429);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 61000));

    // Should work again
    const allowed = await POST({ request });
    expect(allowed.status).toBe(200);
  });
});
```

## Monitoring

Add metrics for rate limit hits:

```typescript
// Track rate limit violations
if (!weddingRateLimit.allowed) {
  console.warn('[API] Wedding rate limit exceeded:', {
    weddingId,
    clientIP,
    limit: RATE_LIMITS.uploadPerWedding.max,
    window: RATE_LIMITS.uploadPerWedding.windowMs,
    timestamp: new Date().toISOString(),
  });

  // Could integrate with monitoring service (e.g., Sentry, DataDog)
  // trackMetric('rate_limit.exceeded', { wedding_id: weddingId });
}
```

## Recommended Limits

Based on typical wedding photo upload patterns:

| Tier | Per Minute | Per Day | Notes |
|------|------------|---------|-------|
| Trial | 30 | 300 | Limited to 50 photos total anyway |
| Basic | 50 | 1000 | ~17 guests uploading simultaneously |
| Premium | 100 | 5000 | Large weddings, multiple uploaders |
| Enterprise | Custom | Custom | Set based on needs |

## References

- Rate limiting best practices
- OWASP: API Rate Limiting
- Review finding: security-sentinel (HIGH severity)

## Blockers

None

## Estimated Effort

3-4 hours (implementation + tests + documentation)
