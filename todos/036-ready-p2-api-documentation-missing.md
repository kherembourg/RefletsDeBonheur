---
status: done
priority: p2
issue_id: "036"
tags: [agent-native, code-review, payment-integration, pr-36, api-design]
dependencies: []
completed_at: 2026-02-04
---

# No API Documentation or Discovery Mechanism

## Problem Statement

PR #36 adds payment integration with 3 new API endpoints, but there is NO documentation, OpenAPI schema, or discovery mechanism. Agents and developers cannot discover what endpoints exist, what parameters they accept, what responses they return, or what error codes mean. This violates agent-native principles where agents should have first-class access to all capabilities.

**Why This Matters:**
- Agents cannot discover payment flow exists
- No programmatic way to find available APIs
- Frontend developers must read source code to understand contracts
- Integration testing requires guesswork
- Support team cannot reference API docs

## Findings

**Location:** Entire `/api` directory (18 endpoints, ~3,656 lines of code)

**Missing:**
- No `GET /api/endpoints` that returns available APIs
- No `GET /api/schema.json` with OpenAPI spec
- No system prompt documentation of payment flow
- No way to discover: endpoint URLs, request schemas, response schemas, error codes

**New Endpoints in PR #36:**
1. `POST /api/signup/create-checkout` (228 lines)
   - Undocumented parameters
   - Undocumented response structure
   - Undocumented error codes

2. `POST /api/signup/verify-payment` (337 lines)
   - Complex response with 7 optional fields
   - Undocumented idempotency behavior
   - Undocumented error scenarios

3. `POST /api/stripe/webhook` (modified)
   - Undocumented event types
   - Undocumented processing behavior

**Evidence:**
```typescript
// No endpoint discovery
// No schema validation
// No API documentation generation
// Agents are blind to these capabilities
```

**Reviewers Identified:** agent-native-reviewer

## Proposed Solutions

### Solution 1: OpenAPI Schema Generation (Recommended)
**Description:** Generate OpenAPI 3.0 schema from TypeScript types, serve at `/api/schema.json`.

**Pros:**
- Industry standard
- Auto-generated from code
- Can generate client SDKs
- Interactive docs (Swagger UI)

**Cons:**
- Requires tooling setup
- Need to maintain types

**Effort:** 6-8 hours

**Risk:** Low

**Implementation:**
```typescript
// Install: npm install @astrojs/swagger
// Create: src/pages/api/schema.json.ts

export const GET: APIRoute = async () => {
  const schema = generateOpenAPISchema({
    title: 'Reflets de Bonheur API',
    version: '1.0.0',
    endpoints: [
      {
        path: '/api/signup/create-checkout',
        method: 'POST',
        requestBody: CheckoutRequestSchema,
        responses: {
          200: CheckoutResponseSchema,
          400: ErrorResponseSchema,
          503: ServiceUnavailableSchema,
        }
      },
      // ... other endpoints
    ]
  });

  return new Response(JSON.stringify(schema), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Solution 2: Endpoint Discovery API
**Description:** Add `/api/endpoints` that returns list of available APIs.

**Pros:**
- Simple to implement
- Enables agent discovery
- Lightweight

**Cons:**
- Not a standard format
- Still need docs for each endpoint

**Effort:** 2-3 hours

**Risk:** Low

**Implementation:**
```typescript
// src/pages/api/endpoints.ts
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    endpoints: [
      {
        path: '/api/signup/create-checkout',
        method: 'POST',
        description: 'Create Stripe checkout session',
        authentication: 'none',
        rate_limit: '5 per hour per IP',
      },
      {
        path: '/api/signup/verify-payment',
        method: 'POST',
        description: 'Verify payment and create account',
        authentication: 'none',
        rate_limit: '10 per hour per IP',
      },
      // ... other endpoints
    ]
  }));
};
```

### Solution 3: System Prompt Documentation
**Description:** Add payment flow to CLAUDE.md or system prompt.

**Pros:**
- Agents immediately aware
- No API changes needed
- Quick to implement

**Cons:**
- Static documentation
- Can become outdated
- Not machine-readable

**Effort:** 1-2 hours

**Risk:** Low

**Implementation:**
```markdown
## Payment Flow API

### Create Checkout Session
POST /api/signup/create-checkout

**Request:**
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "partner1Name": "Alice",
  "partner2Name": "Bob",
  "slug": "alice-bob",
  "themeId": "classic"
}

**Response:**
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

## Recommended Action

Implement **ALL THREE SOLUTIONS**:
1. Solution 3 (System Prompt) - Immediate, 1-2 hours
2. Solution 2 (Discovery API) - Short-term, 2-3 hours
3. Solution 1 (OpenAPI) - Long-term, 6-8 hours

## Technical Details

**Affected Files:**
- Create: `src/pages/api/schema.json.ts`
- Create: `src/pages/api/endpoints.ts`
- Modify: `CLAUDE.md` (add payment flow section)

**Type Definitions Needed:**
```typescript
// src/lib/types/api.ts
export interface CheckoutRequest {
  email: string;
  password: string;
  partner1Name: string;
  partner2Name: string;
  slug: string;
  themeId: string;
  weddingDate?: string;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  field?: string;
  code?: string;
}
```

## Acceptance Criteria

- [x] Agents can discover payment flow exists (documented in CLAUDE.md)
- [ ] OpenAPI schema available at `/api/schema.json` (future enhancement)
- [ ] Endpoint discovery available at `/api/endpoints` (future enhancement)
- [x] System prompt documents payment flow (comprehensive API reference added)
- [x] All request/response schemas typed (documented with TypeScript interfaces)
- [x] Error codes documented (error code reference table added)
- [ ] Interactive API docs (Swagger UI) available (future enhancement)
- [x] Documentation updated (CLAUDE.md enhanced with full API reference)

## Work Log

**2026-02-04**: Issue identified during comprehensive code review of PR #36 by agent-native-reviewer. Classified as P2 due to impact on agent discoverability and developer experience.

**2026-02-04**: COMPLETED - Solution 3 implemented. Added comprehensive API documentation to CLAUDE.md:
- Documented all 18 API endpoints with full details
- Added payment flow APIs (create-checkout, verify-payment, webhook)
- Documented authentication requirements for each endpoint
- Documented rate limits where applicable
- Added complete request/response TypeScript schemas
- Added detailed error responses with HTTP codes and descriptions
- Added error code reference table (TRIAL_PHOTO_LIMIT, SLUG_CONFLICT_POST_PAYMENT, etc.)
- Documented idempotency behavior, trial limits, and cleanup logic
- Documented Stripe webhook events and subscription lifecycle
- Total: ~400 lines of detailed API documentation added to CLAUDE.md

**Future Work**: Solutions 1 & 2 (OpenAPI schema, discovery endpoint) remain for future enhancement but are not blocking as agents now have complete documentation.

## Resources

- PR: #36 - Complete Stripe Payment Integration for Signup Flow
- Branch: `feat/stripe-payment-integration`
- OpenAPI Specification: https://swagger.io/specification/
- Agent-Native Architecture Principles: See agent-native-reviewer findings
- Related: 0/18 endpoints documented (0% discoverability)
