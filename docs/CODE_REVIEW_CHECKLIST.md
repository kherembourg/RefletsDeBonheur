# Code Review Checklist

**Quick reference for PR reviews based on resolved issues**

Use this checklist for every pull request. Check ✅ or mark 🔴 if action needed.

---

## Security

### Authentication & Passwords
- [ ] No plaintext passwords stored (even temporarily)
- [ ] All passwords hashed with bcrypt (cost >= 10)
- [ ] Column names match contents (`password_hash` contains hash, not plaintext)
- [ ] Temporary sensitive data has documented TTL + cleanup
- [ ] GDPR Article 32 compliance considered
- [ ] Backup retention implications documented

**Red flags:**
- 🔴 `password_hash: password` without bcrypt
- 🔴 Storing passwords "temporarily" (use magic links instead)
- 🔴 Comments that lie about column contents

---

## Data Integrity

### Race Conditions
- [ ] No check-then-act patterns with time gaps (TOCTOU)
- [ ] Unique constraints enforce atomicity for reservations
- [ ] Concurrent access scenarios tested
- [ ] Idempotency for financial/critical operations
- [ ] Database constraints used instead of application-level checks

**Questions to ask:**
- What if two users do this simultaneously?
- Can this resource be claimed by both?
- Is there a time gap between validation and creation?

**Red flags:**
- 🔴 `if (await exists(x)) { ... } await create(x)`
- 🔴 Payment before verification (financial risk)
- 🔴 No unique constraint on exclusive resources

### Transactions
- [ ] Multi-step operations wrapped in database transaction
- [ ] Automatic rollback on any failure (no manual cleanup)
- [ ] Cleanup logic tested (verify rollback works)
- [ ] Transaction scope minimized (< 100ms ideal)
- [ ] No external API calls inside transactions

**Decision tree:**
```
2+ database writes?
├─ YES: Rollback critical?
│   ├─ YES: Use transaction (stored procedure or BEGIN/COMMIT)
│   └─ NO: Consider compensating transactions
└─ NO: No transaction needed
```

**Red flags:**
- 🔴 Manual cleanup with retry loops
- 🔴 Sequential operations without transaction wrapper
- 🔴 User pays but account creation can fail
- 🔴 `try { create() } catch { delete() }` patterns

---

## Code Quality

### DRY Principle
- [ ] No code duplicated 3+ times
- [ ] Validation logic extracted to shared utilities
- [ ] Regex patterns centralized in constants
- [ ] API middleware used for cross-cutting concerns
- [ ] Error response format consistent across endpoints

**Thresholds:**
- 3 repetitions → Create shared utility
- 5+ repetitions → Critical tech debt
- 10+ repetitions → Architectural problem

**Red flags:**
- 🔴 Same regex in multiple files
- 🔴 Copy-pasted validation logic
- 🔴 Identical error handling in 5+ endpoints
- 🔴 Magic numbers hardcoded everywhere

### Maintainability
- [ ] Magic numbers extracted to named constants
- [ ] Types defined once and reused
- [ ] Functions < 50 lines (ideally < 30)
- [ ] Complexity reasonable (cyclomatic < 10)
- [ ] Clear separation of concerns

---

## Documentation

### API Documentation
- [ ] Endpoint documented in CLAUDE.md (agent-native)
- [ ] Request schema defined (TypeScript interface)
- [ ] Response schema defined (all success + error cases)
- [ ] Error codes listed with descriptions
- [ ] Authentication requirements specified
- [ ] Rate limits documented (if applicable)
- [ ] Idempotency behavior specified
- [ ] Side effects listed (DB changes, external calls)

**Required sections:**
```markdown
### Endpoint: [Name]

**URL:** `POST /api/path`
**Auth:** Required | None
**Rate Limit:** X per hour

**Request Schema:**
\`\`\`typescript
interface Request { ... }
\`\`\`

**Response Schema:**
\`\`\`typescript
interface Response { ... }
\`\`\`

**Error Codes:**
| Code | Status | Scenario |
|------|--------|----------|

**Example:**
\`\`\`typescript
// Usage example
\`\`\`
```

**Red flags:**
- 🔴 New API endpoint without documentation
- 🔴 Error codes not defined
- 🔴 No example usage provided

### Database Maintenance
- [ ] Scheduled jobs documented (what, when, why)
- [ ] Cleanup logic tested and scheduled
- [ ] Monitoring queries provided
- [ ] Troubleshooting guide for common issues
- [ ] Manual intervention steps documented

**Required for scheduled jobs:**
- Job schedule (cron expression)
- Function it calls
- Purpose and impact
- Monitoring query
- What to do if it fails

**Red flags:**
- 🔴 Cleanup function exists but not scheduled
- 🔴 No monitoring for job status
- 🔴 Temporary table without TTL/cleanup

---

## Testing

### Coverage
- [ ] Critical paths have tests (auth, payment, data integrity)
- [ ] Edge cases covered (concurrent access, failures)
- [ ] Error handling tested (network failures, invalid input)
- [ ] Transaction rollback verified
- [ ] Race conditions tested (concurrent test helper)

**Minimum coverage targets:**
- Critical paths (auth, payment): 90%+
- Business logic: 80%+
- Overall: 70%+

### Test Quality
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests clean up after themselves
- [ ] Tests don't depend on order
- [ ] Concurrent scenarios tested where relevant
- [ ] Mocks used appropriately (not over-mocked)

---

## Common Patterns

### API Endpoint Template

```typescript
import { apiGuards, errorResponse, successResponse } from '@/lib/api/middleware';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  // 1. Configuration guards
  const dbCheck = apiGuards.requireSupabase();
  if (dbCheck) return dbCheck;

  // 2. Parse and validate request
  const body = await request.json();
  const validation = validateRequest(body);
  if (!validation.valid) {
    return errorResponse(validation.error, 400, 'VALIDATION_ERROR');
  }

  // 3. Business logic (use transactions for multi-step)
  try {
    const result = await performOperation(body);
    return successResponse(result);
  } catch (error) {
    return errorResponse(
      'Operation failed',
      500,
      'INTERNAL_ERROR'
    );
  }
};
```

### Transaction Pattern

```sql
-- Stored procedure for multi-step operations
CREATE OR REPLACE FUNCTION operation_transaction(
  p_param1 TEXT,
  p_param2 TEXT
) RETURNS JSON AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Step 1
  INSERT INTO table1 (...) VALUES (...) RETURNING id INTO v_id;

  -- Step 2
  INSERT INTO table2 (...) VALUES (...);

  -- Step 3
  UPDATE table3 SET ... WHERE ...;

  -- All succeed or all fail
  RETURN json_build_object('id', v_id);

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback
  RAISE EXCEPTION 'Operation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Validation Utility Pattern

```typescript
// src/lib/validation/[field]Validation.ts

export const [FIELD]_PATTERN = /regex/;

export function isValid[Field](value: string): boolean {
  return [FIELD]_PATTERN.test(value);
}

export function validate[Field](
  value: string,
  lang: string
): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: t(lang, 'errors.[field]Required') };
  }
  if (!isValid[Field](value)) {
    return { valid: false, error: t(lang, 'errors.[field]Invalid') };
  }
  return { valid: true };
}
```

---

## Priority Matrix

**Issues to BLOCK merge:**
- 🔴 Plaintext password storage
- 🔴 Payment without verification (financial risk)
- 🔴 No transaction for multi-step critical operations
- 🔴 Race condition in financial flows

**Issues to fix before production:**
- 🟡 Missing cleanup for temporary data
- 🟡 No monitoring for scheduled jobs
- 🟡 API endpoints undocumented

**Issues to address in follow-up PR:**
- 🟢 Code duplication (3-5 instances)
- 🟢 Missing test coverage (non-critical paths)
- 🟢 Suboptimal performance

---

## Automated Checks

### Pre-commit
- Plaintext password detection
- Migration linting
- TypeScript type errors
- Linting (ESLint)

### CI Pipeline
- All tests pass
- Code coverage >= 70%
- Code duplication < 5%
- Build succeeds
- Migration validation

### Pre-merge
- All checklist items ✅
- No 🔴 blocking issues
- Documentation updated
- Tests added for new features

---

## Review Workflow

1. **Automated checks** - CI must pass
2. **Self-review** - Author checks this list
3. **Peer review** - Team checks critical items
4. **Security review** - For auth/payment changes
5. **Approval** - 2+ approvals for production code

**Estimated time:**
- Small PR (< 100 lines): 15-30 min
- Medium PR (100-500 lines): 30-60 min
- Large PR (500+ lines): 1-2 hours
- Critical PR (auth/payment): 2+ hours + security review

---

## Questions?

See detailed prevention strategies in `docs/PREVENTION_STRATEGIES.md`

See original issues in `todos/032-038-complete-*.md`
