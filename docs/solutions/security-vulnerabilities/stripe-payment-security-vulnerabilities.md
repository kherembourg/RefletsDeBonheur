---
title: "Stripe Payment Endpoint Security Vulnerabilities"
date: 2026-02-01
category: security-vulnerabilities
tags:
  - stripe
  - payment
  - IDOR
  - TOCTOU
  - race-condition
  - open-redirect
  - webhook
  - idempotency
  - authorization
module: api/stripe
severity: critical
status: resolved
resolution_pr: 32
symptoms:
  - "Checkout endpoint accepts any profileId without ownership verification"
  - "Webhook processes duplicate events causing data corruption"
  - "Success/cancel URLs can redirect to external malicious domains"
  - "Users can pay twice if already subscribed"
  - "Race condition in webhook event processing"
---

# Stripe Payment Endpoint Security Vulnerabilities

## Problem Summary

During code review of PR #32 (Stripe payment flow), four critical security vulnerabilities were identified in the payment API endpoints. These vulnerabilities could allow attackers to access other users' payment data, cause duplicate processing, or redirect users to malicious sites.

## Vulnerabilities Identified

| Vulnerability | Type | Severity | Affected Files |
|--------------|------|----------|----------------|
| IDOR | Authorization bypass | Critical | `checkout.ts`, `portal.ts`, `subscription.ts` |
| TOCTOU Race Condition | Data integrity | Critical | `webhook.ts` |
| Open Redirect | URL injection | High | `portal.ts` |
| Missing Auth Token | Frontend security | Medium | `SubscriptionStatus.tsx` |

---

## 1. IDOR (Insecure Direct Object Reference)

### Symptom
API endpoints accepted a `profileId` parameter without verifying the authenticated user owns that profile.

### Root Cause
The endpoints trusted user-provided `profileId` values from the request body/URL without validating ownership against the authenticated session.

### Vulnerable Code
```typescript
// checkout.ts - No authorization check
const { profileId, successUrl, cancelUrl } = await request.json();
// Immediately uses profileId without verifying ownership
```

### Solution
Created `src/lib/stripe/apiAuth.ts` with `verifyProfileOwnership()` function:

```typescript
export async function verifyProfileOwnership(
  request: Request,
  requestedProfileId: string,
  adminClient: SupabaseClient<Database>
): Promise<AuthResult> {
  const token = request.headers.get('x-client-token');

  if (!token) {
    return { authorized: false, error: 'Missing authentication token' };
  }

  const { data: session } = await adminClient
    .from('auth_sessions')
    .select('user_id')
    .eq('token', token)
    .eq('user_type', 'client')
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session || session.user_id !== requestedProfileId) {
    return { authorized: false, error: 'Unauthorized access to profile' };
  }

  return { authorized: true, profileId: session.user_id };
}
```

### Usage in Endpoints
```typescript
const authResult = await verifyProfileOwnership(request, profileId, adminClient);
if (!authResult.authorized) {
  return errorResponse(authResult.error || 'Unauthorized', 403);
}
```

---

## 2. TOCTOU (Time-of-Check-Time-of-Use) Race Condition

### Symptom
Under concurrent webhook deliveries, duplicate events could be processed because the idempotency check wasn't atomic.

### Root Cause
The original pattern was SELECT-then-INSERT:
1. SELECT to check if event exists → Returns false
2. Another request does same SELECT → Also returns false
3. Both requests process the event → Duplicate processing!

### Vulnerable Code
```typescript
// Check if event exists
const { data: existing } = await adminClient
  .from('stripe_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single();

if (existing) return; // Skip

// GAP: Another request could pass the check here!

// Process the event...
await handleCheckoutCompleted(session);

// Insert event record
await adminClient.from('stripe_events').insert({ ... });
```

### Solution
Changed to INSERT-first atomic pattern:

```typescript
// Atomic idempotency: try to insert first
const { error: insertError } = await adminClient
  .from('stripe_events')
  .insert({
    stripe_event_id: event.id,
    type: event.type,
    status: 'processing',
  });

if (insertError?.code === '23505') { // unique_violation
  console.log(`Event ${event.id} already processed, skipping`);
  return new Response('Already processed', { status: 200 });
}

// Safe to process - we own this event
try {
  await handleCheckoutCompleted(session);
  await adminClient
    .from('stripe_events')
    .update({ status: 'completed', processed_at: new Date().toISOString() })
    .eq('stripe_event_id', event.id);
} catch (error) {
  await adminClient
    .from('stripe_events')
    .update({ status: 'failed', error_message: error.message })
    .eq('stripe_event_id', event.id);
  throw error;
}
```

### Database Migration
```sql
ALTER TABLE stripe_events
ADD COLUMN status TEXT DEFAULT 'processing'
  CHECK (status IN ('processing', 'completed', 'failed'));
ADD COLUMN error_message TEXT;
```

---

## 3. Open Redirect Vulnerability

### Symptom
The `portal.ts` endpoint accepted a `returnUrl` parameter that was passed directly to Stripe without validation.

### Root Cause
Unlike `checkout.ts` which had URL validation, `portal.ts` was missing the same-origin check.

### Vulnerable Code
```typescript
// portal.ts - No validation!
const { profileId, returnUrl } = await request.json();
const portalSession = await stripe.billingPortal.sessions.create({
  return_url: returnUrl, // Could be https://evil-site.com
});
```

### Solution
Created shared `validateSameOrigin()` function:

```typescript
export function validateSameOrigin(url: string, siteUrl: string): boolean {
  try {
    const parsed = new URL(url);
    const allowed = new URL(siteUrl);
    return parsed.origin === allowed.origin;
  } catch {
    return false;
  }
}
```

### Usage
```typescript
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
if (!validateSameOrigin(returnUrl, siteUrl)) {
  return errorResponse('Invalid return URL', 400, 'INVALID_URL');
}
```

---

## 4. Missing Auth Token in Frontend

### Symptom
The `SubscriptionStatus.tsx` component made API requests without including the authentication token, causing all requests to fail with the new authorization checks.

### Solution
Updated component to include `x-client-token` header:

```typescript
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('reflets_client_token');
};

const fetchSubscriptionStatus = async () => {
  const token = getAuthToken();
  const response = await fetch(`/api/stripe/subscription?profileId=${profileId}`, {
    headers: token ? { 'x-client-token': token } : {},
  });
};
```

---

## Prevention Strategies

### For IDOR Vulnerabilities
1. **Always verify ownership** - Never trust user-provided IDs
2. **Use `verifyProfileOwnership()`** - Centralized authorization check
3. **Prefer deriving IDs from session** - Get profileId from authenticated user, not request

### For TOCTOU Race Conditions
1. **Use INSERT-first pattern** - Let database enforce uniqueness atomically
2. **Handle error code 23505** - PostgreSQL unique violation is expected
3. **Never SELECT-then-INSERT** - This pattern is inherently racy

### For Open Redirects
1. **Always validate URLs** - Use `validateSameOrigin()` for all redirects
2. **Prefer relative paths** - Use `/account` instead of full URLs
3. **Log blocked attempts** - Track potential phishing attacks

---

## Files Changed

| File | Changes |
|------|---------|
| `src/lib/stripe/apiAuth.ts` | New - Authorization utilities |
| `src/pages/api/stripe/checkout.ts` | Added IDOR check + URL validation |
| `src/pages/api/stripe/portal.ts` | Added IDOR check + URL validation |
| `src/pages/api/stripe/subscription.ts` | Added IDOR check |
| `src/pages/api/stripe/webhook.ts` | INSERT-first idempotency |
| `src/components/admin/SubscriptionStatus.tsx` | Added auth token header |
| `supabase/migrations/007_stripe_events_status.sql` | Status tracking columns |

---

## Tests Added

| Test File | Coverage |
|-----------|----------|
| `src/lib/stripe/apiAuth.test.ts` | 13 tests for authorization utilities |
| `src/pages/api/stripe/checkout.test.ts` | 10 tests for checkout security |
| `src/pages/api/stripe/webhook.test.ts` | 15 tests for webhook idempotency |

---

## Related Documentation

- [Stripe Setup Guide](../../stripe-setup.md)
- [Authentication Architecture](../../architecture/authentication.md)
- [Payment Flow Plan](../../plans/2026-01-30-feat-complete-stripe-payment-flow-plan.md)

---

## Security Checklist

Use this checklist when implementing payment-related features:

- [ ] All user-provided IDs verified against authenticated session
- [ ] `verifyProfileOwnership()` called before sensitive operations
- [ ] INSERT-first pattern used for creating records
- [ ] Unique constraints exist in database schema
- [ ] Error code 23505 handled as expected duplicate
- [ ] All redirect URLs validated with `validateSameOrigin()`
- [ ] Stripe signature verified before webhook processing
- [ ] Unit tests cover all vulnerability types
