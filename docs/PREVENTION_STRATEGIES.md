# Prevention Strategies for Code Review Issues

**Created:** February 4, 2026
**Based on:** PR #36 Code Review Findings (7 Issues Resolved)
**Purpose:** Prevent recurrence of security, data integrity, and code quality issues

---

## Overview

This document provides actionable prevention strategies based on 7 critical issues identified and resolved during the Stripe payment integration code review. Each category includes:

1. **Prevention strategies** (how to avoid in future)
2. **Code review checklist items**
3. **Automated checks** that could catch this
4. **Best practices** to follow

---

## Category 1: Security Issues

### Issues Resolved
- **#032 (P1)**: Plaintext password storage in `pending_signups` table
- **Related**: GDPR Article 32 compliance violation

### Prevention Strategies

#### 1.1 Database Security Audit Protocol

**Strategy:** Never store sensitive data in plaintext, even temporarily.

**Implementation:**
```sql
-- Pre-merge checklist for ANY table with password/token columns
-- 1. Check column names vs actual data
SELECT column_name,
       CASE
         WHEN column_name LIKE '%password%' THEN 'MUST be hashed'
         WHEN column_name LIKE '%token%' THEN 'MUST be random + hashed'
         WHEN column_name LIKE '%key%' THEN 'MUST be encrypted'
       END as requirement
FROM information_schema.columns
WHERE table_name = 'your_table';

-- 2. Audit comments match reality
SELECT column_name, col_description(
  (table_schema||'.'||table_name)::regclass::oid,
  ordinal_position
) as comment
FROM information_schema.columns
WHERE table_name = 'your_table';
```

**When to apply:**
- Before creating ANY table with authentication data
- Before creating ANY temporary/staging table
- During migration reviews
- Weekly security audits

#### 1.2 Secure Temporary Data Pattern

**Strategy:** Use magic links instead of storing passwords.

**Best practice implementation:**
```typescript
// ✅ GOOD: Post-payment password setup
async function handlePaymentSuccess(email: string) {
  // 1. Create auth user with cryptographically secure temp password
  const tempPassword = crypto.randomBytes(32).toString('base64');

  const { data: user } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword, // Never stored in our DB
    email_confirm: true,
  });

  // 2. Immediately send magic link for password setup
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/set-password`,
  });

  // 3. No password in our database - security achieved
  return { userId: user.id };
}

// ❌ BAD: Storing password for later use
await db.pending_signups.insert({
  email,
  password_hash: password, // Even for 24h is unacceptable
});
```

**Automation:**
```bash
#!/bin/bash
# Git pre-commit hook: Detect potential plaintext password storage

# Check for suspicious patterns in migrations
if git diff --cached --name-only | grep -q "supabase/migrations"; then
  # Look for password columns without hashing
  if git diff --cached | grep -iE "(password|secret|token).*TEXT|VARCHAR" | grep -vE "(hashed|encrypted|bcrypt)"; then
    echo "ERROR: Potential plaintext password storage detected in migration"
    echo "All password/secret fields must be hashed or encrypted"
    exit 1
  fi
fi
```

### Code Review Checklist

**Security: Authentication & Data Protection**

- [ ] **No plaintext passwords** - All passwords hashed with bcrypt (cost >= 10)
- [ ] **No plaintext tokens** - All tokens cryptographically random (>= 32 bytes) + hashed
- [ ] **Column comments accurate** - `password_hash` actually contains hashed password
- [ ] **GDPR Article 32 compliance** - Security of processing verified
- [ ] **Temporary data justified** - TTL documented, cleanup scheduled
- [ ] **Backup implications considered** - Sensitive data may persist in backups beyond TTL

**Questions to ask:**
1. Why does this data need to be stored at all?
2. Can we use a token exchange pattern instead?
3. What happens if backup is restored 1 week later?
4. Is there a more secure architecture?

### Automated Checks

#### 1.3.1 Static Analysis (ESLint Rule)

```javascript
// .eslintrc.js - Custom rule to detect password storage
module.exports = {
  rules: {
    'no-plaintext-password-storage': {
      create(context) {
        return {
          // Detect: password_hash: password (without bcrypt)
          Property(node) {
            if (node.key.name === 'password_hash' ||
                node.key.name === 'password') {
              const value = node.value;
              // Check if value is not a bcrypt.hash() call
              if (!isHashingCall(value)) {
                context.report({
                  node,
                  message: 'Password must be hashed with bcrypt before storage',
                });
              }
            }
          },
        };
      },
    },
  },
};
```

#### 1.3.2 Database Migration Linter

```bash
# Add to CI pipeline (.github/workflows/ci.yml)

- name: Lint Migrations for Security
  run: |
    # Check for plaintext password columns
    if grep -rE "password.*TEXT|password.*VARCHAR" supabase/migrations/ | \
       grep -v "hashed\|bcrypt\|encrypted"; then
      echo "::error::Migration contains plaintext password column"
      exit 1
    fi

    # Check for missing cleanup jobs on temporary tables
    if grep -rE "pending_|temp_|staging_" supabase/migrations/*.sql; then
      if ! grep -q "pg_cron.schedule\|CREATE TRIGGER.*cleanup" supabase/migrations/*.sql; then
        echo "::warning::Temporary table without cleanup schedule detected"
      fi
    fi
```

#### 1.3.3 Runtime Monitoring

```typescript
// src/lib/monitoring/securityAudit.ts

export async function auditPasswordStorage() {
  const { data: tables } = await adminClient.rpc('get_password_columns');

  for (const table of tables) {
    // Sample 10 random rows to verify hashing
    const { data: samples } = await adminClient
      .from(table.table_name)
      .select(table.column_name)
      .limit(10);

    for (const row of samples) {
      const value = row[table.column_name];

      // bcrypt hashes start with $2a$, $2b$, or $2y$
      if (value && !value.match(/^\$2[aby]\$/)) {
        await alert({
          severity: 'CRITICAL',
          message: `Plaintext password in ${table.table_name}.${table.column_name}`,
          value: value.substring(0, 10) + '...', // Partial for debugging
        });
      }
    }
  }
}
```

### Best Practices

#### 1.4.1 Security-First Architecture Principles

1. **Never store what you don't need to verify**
   - Passwords: Use auth provider (Supabase Auth)
   - Credit cards: Use payment provider (Stripe)
   - PII: Minimize collection, encrypt at rest

2. **Temporary != Insecure**
   - Even 1-second exposure requires encryption
   - Backups may retain data beyond TTL
   - Logs may capture sensitive data

3. **Defense in depth**
   - Service-role-only access is NOT sufficient justification for plaintext
   - Assume database will be compromised eventually
   - Layer security: encryption + access control + audit logs

#### 1.4.2 GDPR Compliance Checklist

- [ ] **Article 32: Security of Processing**
  - Pseudonymization and encryption of personal data
  - Ability to ensure ongoing confidentiality
  - Regular security testing and evaluation

- [ ] **Article 25: Data Protection by Design**
  - Minimize data collection (only what's needed)
  - Minimize storage duration (shortest TTL possible)
  - Maximize security (encryption, hashing, access control)

#### 1.4.3 Password Storage Guidelines (OWASP)

**Required:**
- ✅ Use bcrypt, scrypt, or Argon2 (NEVER plain SHA/MD5)
- ✅ Minimum cost factor: 10 (bcrypt)
- ✅ Use password hashing library, not custom implementation
- ✅ Store hash + salt (library handles this)

**Recommended:**
- ✅ Consider rate limiting password attempts
- ✅ Implement account lockout after N failures
- ✅ Use multi-factor authentication for sensitive accounts

**Reference:** https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

## Category 2: Data Integrity Issues

### Issues Resolved
- **#033 (P1)**: Slug race condition after payment (financial risk)
- **#034 (P1)**: No transaction wrapper for account creation

### Prevention Strategies

#### 2.1 Race Condition Detection Protocol

**Strategy:** Identify TOCTOU (Time-of-Check-Time-of-Use) vulnerabilities.

**Pattern to detect:**
```typescript
// ❌ RACE CONDITION: Check → ... → Use
// Time    Action              Database State
// T0      Check available     ✓ available
// T1      User pays           ✓ still available
// T2      Another user        ✓ claims it
// T3      Create with slug    ❌ CONFLICT

async function dangerousFlow() {
  // Check
  const exists = await db.slug.findUnique({ slug });
  if (exists) return error('Taken');

  // ... time passes (user at Stripe for 2-5 minutes) ...

  // Use (may now be taken!)
  await db.wedding.create({ slug });
}

// ✅ SAFE: Reserve atomically with constraint
async function safeFlow() {
  // Unique constraint ensures atomicity
  const { error } = await db.pending_signups.insert({ slug });

  // Database enforces uniqueness, no race condition possible
  if (error?.code === '23505') {
    return error('Slug reserved by another signup');
  }
}
```

**Implementation:**
```sql
-- Pattern: Partial unique index for "active" reservations
CREATE UNIQUE INDEX idx_pending_signups_slug_active
ON pending_signups(slug)
WHERE completed_at IS NULL AND expires_at > now();

-- This prevents:
-- 1. Two concurrent checkouts with same slug
-- 2. Race condition between check and create
-- 3. Payment for unavailable resource
```

#### 2.2 Database Transaction Patterns

**Strategy:** Wrap multi-step operations in atomic transactions.

**Decision tree:**
```
Does operation involve 2+ database writes?
├─ YES: Is rollback critical?
│   ├─ YES: Use database transaction (stored procedure or BEGIN/COMMIT)
│   └─ NO: Consider compensating transactions
└─ NO: No transaction needed
```

**Best practice implementation:**
```sql
-- ✅ GOOD: Atomic transaction via stored procedure
CREATE OR REPLACE FUNCTION create_account_transaction(
  p_email TEXT,
  p_slug TEXT
  -- ... other params
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_wedding_id UUID;
BEGIN
  -- Step 1: Create profile
  INSERT INTO profiles (user_id, email)
  VALUES (p_user_id, p_email)
  RETURNING id INTO v_profile_id;

  -- Step 2: Create wedding
  INSERT INTO weddings (owner_id, slug)
  VALUES (v_profile_id, p_slug)
  RETURNING id INTO v_wedding_id;

  -- Step 3: Mark signup complete
  UPDATE pending_signups
  SET completed_at = now(),
      wedding_id = v_wedding_id
  WHERE id = p_pending_signup_id;

  -- All succeed or all fail (automatic rollback)
  RETURN json_build_object(
    'profile_id', v_profile_id,
    'wedding_id', v_wedding_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Account creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// ❌ BAD: Manual cleanup with retries
async function unreliableFlow() {
  const user = await createUser(); // Step 1

  try {
    const profile = await createProfile(user.id); // Step 2
  } catch (error) {
    // Manual cleanup may fail!
    for (let i = 0; i < 3; i++) {
      try {
        await deleteUser(user.id);
        break;
      } catch (cleanupError) {
        // What if all 3 attempts fail?
        // Orphaned user remains!
      }
    }
  }
}

// ✅ GOOD: Database transaction
async function reliableFlow() {
  const { data, error } = await supabase.rpc(
    'create_account_transaction',
    params
  );

  // Either both created or neither created
  // No manual cleanup needed
  if (error) return handleError(error);
  return data;
}
```

### Code Review Checklist

**Data Integrity: Transactions & Race Conditions**

- [ ] **Multi-step operations wrapped in transaction** - All-or-nothing guarantee
- [ ] **No TOCTOU vulnerabilities** - Check-then-act patterns identified and fixed
- [ ] **Unique constraints for reservations** - Database enforces atomicity
- [ ] **Idempotency for financial operations** - Safe to retry without double-charging
- [ ] **Cleanup logic tested** - Verify rollback works correctly
- [ ] **Concurrent access tested** - Simulate race conditions in tests

**Questions to ask:**
1. What if two users do this simultaneously?
2. What if step N fails - are steps 1..N-1 reversed?
3. Can this be retried safely?
4. What if the network times out mid-operation?

**Red flags:**
- Manual cleanup with retry loops
- Sequential database operations without transactions
- Check-then-act patterns with time gap
- Financial operations without idempotency

### Automated Checks

#### 2.3.1 Race Condition Linter

```javascript
// .eslintrc.js - Detect TOCTOU patterns
module.exports = {
  rules: {
    'no-toctou-race-condition': {
      create(context) {
        const checkCalls = new Map(); // Track check calls

        return {
          // Detect: if (await exists()) ... await create()
          IfStatement(node) {
            const test = node.test;

            // Check if condition is an existence check
            if (isExistenceCheck(test)) {
              const consequent = node.consequent;

              // Look for create/insert in consequence
              if (hasCreateOperation(consequent)) {
                context.report({
                  node,
                  message: 'Potential TOCTOU race condition: check-then-create pattern detected. ' +
                           'Consider using database unique constraint or INSERT...ON CONFLICT.',
                });
              }
            }
          },
        };
      },
    },
  },
};
```

#### 2.3.2 Transaction Verification

```bash
#!/bin/bash
# CI check: Verify multi-step operations use transactions

# Find functions with multiple await db.* calls
rg "async.*function.*\{" --files-with-matches | while read file; do
  # Count sequential database operations
  db_ops=$(grep -c "await.*\(supabase\|adminClient\)\." "$file")

  # Check if transaction pattern used
  has_transaction=$(grep -c "\.rpc\|BEGIN\|COMMIT\|transaction" "$file")

  if [ "$db_ops" -ge 3 ] && [ "$has_transaction" -eq 0 ]; then
    echo "::warning file=$file::Multiple DB operations without transaction"
  fi
done
```

#### 2.3.3 Concurrent Test Runner

```typescript
// src/test/helpers/concurrentTest.ts

/**
 * Run test function N times concurrently and verify only 1 succeeds
 */
export async function testRaceCondition<T>(
  fn: () => Promise<T>,
  concurrency: number = 10,
  expectSuccesses: number = 1
): Promise<void> {
  const results = await Promise.allSettled(
    Array(concurrency).fill(null).map(() => fn())
  );

  const successes = results.filter(r => r.status === 'fulfilled');
  const failures = results.filter(r => r.status === 'rejected');

  expect(successes.length).toBe(expectSuccesses);
  expect(failures.length).toBe(concurrency - expectSuccesses);

  // Verify failed with unique constraint error
  for (const failure of failures) {
    expect(failure.reason.code).toBe('23505'); // Postgres unique violation
  }
}

// Usage in tests:
test('slug reservation prevents race condition', async () => {
  await testRaceCondition(
    () => createCheckout({ slug: 'alice-bob', email: 'unique@test.com' }),
    concurrency: 10,
    expectSuccesses: 1 // Only first request succeeds
  );
});
```

### Best Practices

#### 2.4.1 Transaction Design Principles

1. **ACID Properties**
   - **Atomicity**: All steps succeed or all fail
   - **Consistency**: Database constraints always enforced
   - **Isolation**: Concurrent transactions don't interfere
   - **Durability**: Committed changes survive crashes

2. **When to use transactions**
   - ✅ Creating related records (user + profile + wedding)
   - ✅ Transferring money between accounts
   - ✅ Decrementing inventory + creating order
   - ❌ Reading data (unless you need isolation)
   - ❌ Single INSERT/UPDATE (already atomic)

3. **Transaction scope**
   - Keep transactions SHORT (< 100ms ideal)
   - Minimize external API calls inside transactions
   - Don't wait for user input inside transaction
   - Release locks ASAP

#### 2.4.2 Idempotency Patterns

```typescript
// Pattern 1: Insert-first idempotency
async function processWebhook(event: StripeEvent) {
  // Try to insert event ID
  const { error } = await db.stripe_events.insert({
    stripe_event_id: event.id, // Unique constraint
    status: 'processing',
  });

  // If duplicate, already processed
  if (error?.code === '23505') {
    return { status: 'already_processed' };
  }

  // Process event...
  await handleEvent(event);

  // Mark complete
  await db.stripe_events.update({
    status: 'completed',
    where: { stripe_event_id: event.id },
  });
}

// Pattern 2: Idempotency key (Stripe style)
async function createPayment(idempotencyKey: string, amount: number) {
  // Check if already processed
  const existing = await db.payments.findUnique({
    where: { idempotency_key: idempotencyKey },
  });

  if (existing) {
    return existing; // Return previous result
  }

  // Create new payment
  return db.payments.create({
    idempotency_key: idempotencyKey,
    amount,
  });
}
```

#### 2.4.3 Race Condition Prevention

**Architectural patterns:**

1. **Database constraints** (best)
   - Unique indexes
   - Foreign key constraints
   - Check constraints

2. **Optimistic locking** (version numbers)
   ```sql
   UPDATE users
   SET balance = balance - 100,
       version = version + 1
   WHERE id = $1 AND version = $2;
   -- If version changed, UPDATE fails (retry)
   ```

3. **Pessimistic locking** (use sparingly)
   ```sql
   SELECT * FROM accounts WHERE id = $1 FOR UPDATE;
   -- Locks row until transaction completes
   ```

4. **Distributed locks** (Redis, when needed)
   ```typescript
   const lock = await redis.lock('slug:alice-bob', ttl: 60000);
   try {
     await createWedding({ slug: 'alice-bob' });
   } finally {
     await lock.release();
   }
   ```

---

## Category 3: Code Quality Issues

### Issues Resolved
- **#037 (P3)**: Email validation duplicated across 4 files
- **#038 (P3)**: Configuration checks duplicated across 18 files

### Prevention Strategies

#### 3.1 DRY Principle Enforcement

**Strategy:** Extract reusable logic into shared utilities at 3+ repetitions.

**Detection pattern:**
```bash
# Find duplicated code blocks
npx jscpd src/ --min-lines 5 --min-tokens 50 --format "typescript"

# Find duplicated regex patterns
rg -o "\/\^[^\/]+\$\/" src/ | sort | uniq -c | sort -rn | head -20

# Find duplicated function signatures
ast-grep --pattern 'function $FUNC($$$) { $$$ }' | \
  awk '{print $2}' | sort | uniq -c | sort -rn
```

**Refactoring threshold:**
- **3 repetitions** → Create shared utility
- **5+ repetitions** → Critical technical debt
- **10+ repetitions** → Architectural problem

**Implementation:**
```typescript
// ❌ BAD: Duplicated 4 times
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailPattern.test(email)) {
  return { error: 'Invalid email' };
}

// ✅ GOOD: Shared utility
// src/lib/validation/emailValidation.ts
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export function validateEmail(email: string, lang: string) {
  if (!email) return { valid: false, error: t(lang, 'emailRequired') };
  if (!isValidEmail(email)) return { valid: false, error: t(lang, 'emailInvalid') };
  return { valid: true };
}

// Usage everywhere:
import { validateEmail } from '@/lib/validation/emailValidation';
```

#### 3.2 Middleware Pattern for Cross-Cutting Concerns

**Strategy:** Extract common API logic into reusable middleware.

**Common patterns to extract:**
- Configuration checks (Supabase, Stripe)
- Authentication verification
- Rate limiting
- Error response formatting
- Request validation

**Implementation:**
```typescript
// src/lib/api/middleware.ts

export const apiGuards = {
  requireSupabase() {
    if (!isSupabaseConfigured()) {
      return errorResponse('Database not configured', 503);
    }
    return null; // No error
  },

  requireStripe() {
    if (!isStripeConfigured()) {
      return errorResponse('Stripe not configured', 503);
    }
    return null;
  },

  requireAuth(request: Request) {
    const token = request.headers.get('x-client-token');
    if (!token) {
      return errorResponse('Unauthorized', 401);
    }
    return null;
  },
};

export function errorResponse(
  message: string,
  status: number,
  code?: string
) {
  return new Response(
    JSON.stringify({ error: message, code }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function successResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Usage in endpoints (before):
// 30 lines of boilerplate

// Usage in endpoints (after):
export const POST: APIRoute = async ({ request }) => {
  // Guards (3 lines instead of 30)
  const dbCheck = apiGuards.requireSupabase();
  if (dbCheck) return dbCheck;

  const authCheck = apiGuards.requireAuth(request);
  if (authCheck) return authCheck;

  // Main logic
  const result = await doWork();
  return successResponse(result);
};
```

### Code Review Checklist

**Code Quality: DRY & Maintainability**

- [ ] **No code duplication** - Check for duplicate functions, regex, validation
- [ ] **Shared utilities used** - Extract at 3+ repetitions
- [ ] **Middleware for cross-cutting concerns** - Auth, logging, errors
- [ ] **Consistent error responses** - Same format across all endpoints
- [ ] **Magic numbers extracted to constants** - No hardcoded 3, 5, 10
- [ ] **Types defined once** - Request/response interfaces shared

**Questions to ask:**
1. Have I seen this code before in another file?
2. Would changing this logic require updating multiple places?
3. Can this be parameterized or generalized?
4. Is there a pattern emerging that should be abstracted?

**Code smell indicators:**
- Copy-paste of function bodies
- Same regex pattern in multiple files
- Identical error message strings
- Similar validation logic in different places

### Automated Checks

#### 3.3.1 Copy-Paste Detection (CI)

```yaml
# .github/workflows/ci.yml
- name: Detect Code Duplication
  run: |
    npx jscpd src/ \
      --min-lines 5 \
      --min-tokens 50 \
      --threshold 5 \
      --format "typescript,javascript" \
      --reporters "console,json" \
      --output "./jscpd-report"

    # Fail if duplication > 5%
    DUPLICATION=$(jq '.statistics.total.percentage' jscpd-report/jscpd-report.json)
    if (( $(echo "$DUPLICATION > 5" | bc -l) )); then
      echo "::error::Code duplication ${DUPLICATION}% exceeds threshold of 5%"
      exit 1
    fi
```

#### 3.3.2 Regex Pattern Deduplication

```bash
#!/bin/bash
# scripts/check-duplicate-patterns.sh

echo "Checking for duplicated regex patterns..."

# Find all regex literals
rg -o "\/[^\/]+\/" src/ --type ts | \
  sort | uniq -c | sort -rn | \
  awk '$1 >= 3 { print $1 " duplicates: " $2 }'

# Find duplicated string validation
rg "test\(.*\)" src/ --type ts | \
  grep -v "node_modules" | \
  cut -d: -f2- | \
  sort | uniq -c | sort -rn | \
  awk '$1 >= 3'
```

#### 3.3.3 Import Analysis

```typescript
// scripts/analyze-imports.ts

/**
 * Find utility functions that should be shared
 */
import { Project } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
const sourceFiles = project.getSourceFiles('src/**/*.ts');

const functionSignatures = new Map<string, string[]>();

for (const file of sourceFiles) {
  const functions = file.getFunctions();

  for (const fn of functions) {
    const signature = fn.getText().substring(0, 100); // First 100 chars
    const filePath = file.getFilePath();

    if (!functionSignatures.has(signature)) {
      functionSignatures.set(signature, []);
    }
    functionSignatures.get(signature)!.push(filePath);
  }
}

// Report functions defined in 3+ files
for (const [signature, files] of functionSignatures) {
  if (files.length >= 3) {
    console.log(`\nDuplicated function in ${files.length} files:`);
    console.log(signature);
    console.log('Files:', files.join('\n       '));
  }
}
```

### Best Practices

#### 3.4.1 Utility Organization

**Directory structure:**
```
src/lib/
├── validation/
│   ├── emailValidation.ts       # Email-specific validation
│   ├── slugValidation.ts        # Slug-specific validation
│   ├── passwordValidation.ts    # Password strength
│   └── index.ts                 # Re-export all
├── api/
│   ├── middleware.ts            # API guards & helpers
│   ├── errorCodes.ts            # Centralized error codes
│   └── rateLimit.ts             # Rate limiting
├── auth/
│   ├── clientAuth.ts            # Client authentication
│   ├── guestAuth.ts             # Guest sessions
│   └── godAuth.ts               # Admin access
└── constants.ts                 # App-wide constants
```

**Naming conventions:**
- Validation: `isValid*()`, `validate*()`
- Utilities: `calculate*()`, `format*()`, `parse*()`
- Guards: `require*()`, `ensure*()`
- Constants: `UPPER_SNAKE_CASE`

#### 3.4.2 Progressive Abstraction

**Abstraction levels:**
1. **Copy-paste** (1-2 uses) - OK initially
2. **Local helper** (2-3 uses in same file) - Extract to top
3. **Shared utility** (3+ uses across files) - Move to /lib
4. **Package** (10+ uses, complex) - Consider npm package

**Example progression:**
```typescript
// Level 1: Inline (OK for 1 use)
if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { ... }

// Level 2: Local helper (2 uses in same file)
function isValidEmail(email: string) {
  return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}

// Level 3: Shared utility (3+ files)
// src/lib/validation/emailValidation.ts
export function isValidEmail(email: string): boolean { ... }

// Level 4: Package (complex validation library)
import { validate } from '@company/validators';
```

#### 3.4.3 Error Response Standardization

**Standard error format:**
```typescript
// src/lib/api/errorCodes.ts
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_SLUG: 'INVALID_SLUG',
  SLUG_TAKEN: 'SLUG_TAKEN',

  // Payment
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  STRIPE_ERROR: 'STRIPE_ERROR',

  // System
  DB_ERROR: 'DB_ERROR',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// src/lib/api/middleware.ts
export interface ApiError {
  error: string;        // Human-readable message
  code: ErrorCode;      // Machine-readable code
  field?: string;       // Which field caused error
  details?: unknown;    // Additional context
}

export function errorResponse(
  message: string,
  status: number,
  code: ErrorCode,
  field?: string
): Response {
  const body: ApiError = { error: message, code, field };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Usage:
return errorResponse(
  'Invalid email address',
  400,
  ErrorCodes.INVALID_EMAIL,
  'email'
);
```

---

## Category 4: Documentation & Agent Discoverability

### Issues Resolved
- **#035 (P2)**: Cleanup job not scheduled (missing documentation)
- **#036 (P2)**: No API documentation or discovery mechanism

### Prevention Strategies

#### 4.1 Agent-Native Documentation Pattern

**Strategy:** Embed API documentation in system prompts (CLAUDE.md).

**Required documentation for agents:**
1. **Endpoint discovery** - What APIs exist
2. **Request/response schemas** - TypeScript interfaces
3. **Error codes** - All possible error responses
4. **Authentication** - What headers/tokens required
5. **Rate limits** - Throttling behavior
6. **Idempotency** - Can requests be retried safely?
7. **Side effects** - What changes in database/external systems

**Implementation:**
```markdown
## API Reference

### Endpoint: Create Checkout Session

**URL:** `POST /api/signup/create-checkout`

**Authentication:** None (rate-limited by IP)

**Rate Limit:** 5 requests per hour per IP

**Request Schema:**
\`\`\`typescript
interface CheckoutRequest {
  email: string;              // Valid email address
  password: string;           // 8+ chars, 1 uppercase, 1 number
  partner1Name: string;       // 1-100 chars
  partner2Name: string;       // 1-100 chars
  slug: string;               // 3-50 chars, lowercase, hyphens only
  themeId?: string;           // Optional: 'classic', 'luxe', etc.
  weddingDate?: string;       // Optional: ISO date string
}
\`\`\`

**Response Schema (200 OK):**
\`\`\`typescript
interface CheckoutResponse {
  sessionId: string;          // Stripe session ID (cs_...)
  url: string;                // Redirect URL to Stripe checkout
}
\`\`\`

**Error Responses:**
| Code | Status | Scenario |
|------|--------|----------|
| INVALID_EMAIL | 400 | Email format invalid |
| SLUG_TAKEN | 409 | Slug already in use |
| STRIPE_ERROR | 500 | Stripe API error |
| NOT_CONFIGURED | 503 | Stripe not configured |

**Side Effects:**
- Creates record in `pending_signups` table (expires in 24h)
- Reserves slug (prevents duplicate checkouts)
- Creates Stripe checkout session

**Idempotency:** NOT idempotent (creates new session each time)

**Example Usage:**
\`\`\`typescript
const response = await fetch('/api/signup/create-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'alice@example.com',
    password: 'SecurePass123',
    partner1Name: 'Alice',
    partner2Name: 'Bob',
    slug: 'alice-bob',
  }),
});

const { sessionId, url } = await response.json();
window.location.href = url; // Redirect to Stripe
\`\`\`
```

#### 4.2 Database Maintenance Documentation

**Strategy:** Document scheduled jobs, cleanup logic, monitoring queries.

**Required documentation:**
1. **Scheduled jobs** - What runs automatically
2. **Cleanup logic** - When/how data is deleted
3. **Monitoring queries** - How to check job status
4. **Manual intervention** - How to fix issues
5. **Troubleshooting** - Common problems and solutions

**Implementation:**
```markdown
## Database Maintenance

### Scheduled Jobs

| Job Name | Schedule | Function | Purpose |
|----------|----------|----------|---------|
| cleanup-expired-pending-signups | Every 6 hours | `cleanup_expired_pending_signups()` | Delete abandoned signups after 24h |
| cleanup-expired-god-tokens | Hourly | `cleanup_expired_god_tokens()` | Delete expired admin access tokens |

### Monitoring

**Check job status:**
\`\`\`sql
-- View scheduled jobs
SELECT * FROM cron.job
WHERE jobname LIKE 'cleanup%';

-- View recent job runs
SELECT jobname, status, start_time, end_time
FROM cron.job_run_details
WHERE jobname = 'cleanup-expired-pending-signups'
ORDER BY start_time DESC
LIMIT 10;

-- View pending signups status
SELECT * FROM pending_signups_status;
\`\`\`

**Expected output:**
- Active signups: 0-50 (normal)
- Expired signups: 0 (cleanup working)
- Completed signups: Any number

**Alerts:**
- If expired > 100: Cleanup job may be failing
- If active > 200: Unusually high signup activity

### Manual Cleanup

If automatic cleanup fails:
\`\`\`sql
-- Manual cleanup of expired signups
SELECT cleanup_expired_pending_signups();

-- Force cleanup (ignore expiry, use with caution)
DELETE FROM pending_signups
WHERE completed_at IS NULL
  AND created_at < now() - interval '48 hours';
\`\`\`

### Troubleshooting

**Problem:** Cleanup job not running
\`\`\`sql
-- Check if pg_cron extension installed
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- Reschedule job
SELECT cron.unschedule('cleanup-expired-pending-signups');
SELECT cron.schedule(
  'cleanup-expired-pending-signups',
  '0 */6 * * *',
  'SELECT cleanup_expired_pending_signups();'
);
\`\`\`
```

### Code Review Checklist

**Documentation: Discoverability & Maintenance**

- [ ] **API endpoints documented** - CLAUDE.md or OpenAPI schema
- [ ] **Request/response schemas defined** - TypeScript interfaces
- [ ] **Error codes listed** - All possible error responses
- [ ] **Scheduled jobs documented** - What runs when
- [ ] **Monitoring queries provided** - How to check status
- [ ] **Troubleshooting guide** - How to fix common issues
- [ ] **Agent-discoverable** - Can agents find and use this feature?

**Questions to ask:**
1. Can an agent discover this API exists?
2. Does the agent know what parameters to pass?
3. Can the agent interpret error responses?
4. Is there a monitoring query to check health?
5. How would support team troubleshoot issues?

**Documentation types:**
- **Code comments** - Implementation details
- **CLAUDE.md** - Agent-facing API reference
- **README.md** - Human-facing setup guide
- **Architecture docs** - High-level design decisions

### Automated Checks

#### 4.3.1 API Documentation Coverage

```typescript
// scripts/check-api-docs.ts

import fs from 'fs';
import path from 'path';

// Find all API endpoint files
const apiDir = 'src/pages/api';
const endpoints = fs
  .readdirSync(apiDir, { recursive: true })
  .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

// Read CLAUDE.md
const claudeMd = fs.readFileSync('CLAUDE.md', 'utf-8');

// Check each endpoint is documented
const undocumented = [];
for (const endpoint of endpoints) {
  const route = endpoint.replace('.ts', '').replace(/\\/g, '/');

  if (!claudeMd.includes(`/api/${route}`)) {
    undocumented.push(`/api/${route}`);
  }
}

if (undocumented.length > 0) {
  console.error(`Undocumented API endpoints (${undocumented.length}):`);
  console.error(undocumented.join('\n'));
  process.exit(1);
}

console.log(`✓ All ${endpoints.length} API endpoints documented`);
```

#### 4.3.2 Scheduled Job Validation

```bash
#!/bin/bash
# scripts/check-scheduled-jobs.sh

echo "Checking scheduled jobs are documented..."

# Find functions with "cleanup" or "schedule" in name
CLEANUP_FUNCTIONS=$(rg "CREATE.*FUNCTION.*cleanup" supabase/migrations/ -l)

# Check each is documented in docs/DATABASE_MAINTENANCE.md
for func in $CLEANUP_FUNCTIONS; do
  FUNC_NAME=$(basename "$func" .sql | sed 's/^[0-9]*_//')

  if ! grep -q "$FUNC_NAME" docs/DATABASE_MAINTENANCE.md; then
    echo "ERROR: $FUNC_NAME not documented in DATABASE_MAINTENANCE.md"
    exit 1
  fi
done

echo "✓ All cleanup functions documented"
```

#### 4.3.3 OpenAPI Schema Generation (Future)

```typescript
// src/pages/api/schema.json.ts

import type { APIRoute } from 'astro';
import { generateOpenAPISchema } from '@/lib/api/openapi';

export const GET: APIRoute = async () => {
  const schema = generateOpenAPISchema({
    title: 'Reflets de Bonheur API',
    version: '1.0.0',
    servers: [
      { url: 'https://reflets-de-bonheur.com', description: 'Production' },
      { url: 'http://localhost:4321', description: 'Development' },
    ],
    endpoints: [
      // Auto-discovered from /api directory
    ],
  });

  return new Response(JSON.stringify(schema, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Best Practices

#### 4.4.1 Documentation-Driven Development

**Process:**
1. **Design** - Document API before implementing
2. **Review** - Get feedback on API design
3. **Implement** - Write code to match spec
4. **Test** - Verify implementation matches docs
5. **Update** - Keep docs in sync with changes

**Example workflow:**
```markdown
## Feature: Payment Flow

**Step 1: Design (before coding)**
\`\`\`markdown
### API Design: Create Checkout

POST /api/signup/create-checkout

Request:
- email: string (required)
- slug: string (required)

Response:
- sessionId: string
- url: string

Errors:
- 400: Invalid input
- 409: Slug taken
- 503: Stripe not configured
\`\`\`

**Step 2: Review** - Team reviews design, suggests changes

**Step 3: Implement** - Write code following spec

**Step 4: Test** - Verify all documented behaviors

**Step 5: Update** - Add examples, edge cases discovered
```

#### 4.4.2 Agent-First API Design

**Principles:**
1. **Discoverable** - Agent can find what exists
2. **Self-describing** - Response includes schema
3. **Consistent** - Same patterns everywhere
4. **Error-rich** - Detailed error responses
5. **Versioned** - Breaking changes versioned

**Implementation:**
```typescript
// All API responses include metadata
interface ApiResponse<T> {
  data: T;
  meta: {
    version: '1.0.0';
    timestamp: string;
    requestId: string;
  };
}

// Errors include actionable guidance
interface ApiError {
  error: string;
  code: ErrorCode;
  field?: string;
  suggestion?: string;  // What to try next
  docs?: string;        // Link to documentation
}

// Example error response:
{
  "error": "Invalid email address",
  "code": "INVALID_EMAIL",
  "field": "email",
  "suggestion": "Email must be in format user@example.com",
  "docs": "https://docs.example.com/api/validation#email"
}
```

#### 4.4.3 Living Documentation

**Strategies to keep docs updated:**

1. **Co-locate** - Docs next to code
   ```
   src/pages/api/signup/
   ├── create-checkout.ts
   ├── create-checkout.test.ts
   └── create-checkout.md        # API documentation
   ```

2. **Generate from code** - TypeScript types → OpenAPI
   ```typescript
   /**
    * @openapi
    * /api/signup/create-checkout:
    *   post:
    *     summary: Create Stripe checkout session
    *     requestBody:
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/CheckoutRequest'
    */
   export const POST: APIRoute = async ({ request }) => { ... };
   ```

3. **Validate in tests** - Ensure docs match reality
   ```typescript
   test('API matches OpenAPI schema', async () => {
     const schema = await loadOpenAPISchema();
     const response = await fetch('/api/signup/create-checkout', {
       method: 'POST',
       body: JSON.stringify(validRequest),
     });

     expect(response).toMatchSchema(schema.paths['/api/signup/create-checkout'].post);
   });
   ```

4. **Link in error messages** - Point to docs
   ```typescript
   if (!isValidEmail(email)) {
     return errorResponse(
       'Invalid email format',
       400,
       'INVALID_EMAIL',
       'email',
       'See: https://docs.example.com/validation#email'
     );
   }
   ```

---

## Implementation Roadmap

### Phase 1: Critical Security (Week 1)
- [ ] Add pre-commit hook for password storage detection
- [ ] Add database migration linter to CI
- [ ] Document all API endpoints in CLAUDE.md
- [ ] Add runtime monitoring for password storage audit

### Phase 2: Data Integrity (Week 2)
- [ ] Add TOCTOU race condition linter
- [ ] Add transaction verification to CI
- [ ] Create concurrent test helper utility
- [ ] Document transaction patterns in architecture docs

### Phase 3: Code Quality (Week 3)
- [ ] Add jscpd (copy-paste detection) to CI
- [ ] Create shared validation utilities library
- [ ] Refactor API middleware pattern
- [ ] Document utility organization standards

### Phase 4: Documentation (Week 4)
- [ ] Generate OpenAPI schema from endpoints
- [ ] Create DATABASE_MAINTENANCE.md
- [ ] Add scheduled job documentation
- [ ] Create troubleshooting guides

---

## Monitoring & Alerts

### Security Monitoring

```sql
-- Daily security audit (run via cron)
CREATE OR REPLACE FUNCTION daily_security_audit()
RETURNS void AS $$
BEGIN
  -- Check for plaintext passwords
  PERFORM audit_password_storage();

  -- Check for expired cleanup jobs
  IF (SELECT COUNT(*) FROM pending_signups WHERE expires_at < now()) > 100 THEN
    RAISE WARNING 'Cleanup job may be failing: % expired signups',
      (SELECT COUNT(*) FROM pending_signups WHERE expires_at < now());
  END IF;

  -- Check for orphaned records
  IF (SELECT COUNT(*) FROM profiles WHERE id NOT IN (SELECT owner_id FROM weddings)) > 0 THEN
    RAISE WARNING 'Orphaned profiles detected: % profiles without weddings',
      (SELECT COUNT(*) FROM profiles WHERE id NOT IN (SELECT owner_id FROM weddings));
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Performance Monitoring

```typescript
// src/lib/monitoring/performance.ts

export async function monitorApiPerformance() {
  const metrics = await db.query(`
    SELECT
      path,
      COUNT(*) as request_count,
      AVG(duration_ms) as avg_duration,
      MAX(duration_ms) as max_duration,
      COUNT(*) FILTER (WHERE status >= 500) as error_count
    FROM api_request_logs
    WHERE created_at > now() - interval '1 hour'
    GROUP BY path
    HAVING AVG(duration_ms) > 1000  -- Alert if avg > 1s
  `);

  for (const metric of metrics) {
    await alert({
      severity: 'WARNING',
      message: `Slow API endpoint: ${metric.path}`,
      details: metric,
    });
  }
}
```

### Code Quality Metrics

```bash
# scripts/quality-metrics.sh

echo "=== Code Quality Metrics ==="

# Test coverage
echo "Test Coverage:"
npm run test:coverage -- --silent | grep "All files"

# Code duplication
echo -e "\nCode Duplication:"
npx jscpd src/ --min-lines 5 --min-tokens 50 --silent | grep "Total:"

# Type coverage (if using typescript-coverage-report)
echo -e "\nType Coverage:"
npx typescript-coverage-report --threshold 95

# Bundle size
echo -e "\nBundle Size:"
npm run build -- --silent
du -sh dist/

# Complexity (if using complexity-report)
echo -e "\nCode Complexity (functions > 10):"
npx complexity-report src/ --format json | \
  jq '.functions[] | select(.complexity > 10) | {file: .file, name: .name, complexity: .complexity}'
```

---

## Summary

### Prevention by Category

| Category | Key Prevention | Automation | Documentation |
|----------|----------------|------------|---------------|
| **Security** | Magic links, bcrypt, GDPR audit | Pre-commit hooks, migration linter | OWASP guidelines |
| **Data Integrity** | Transactions, unique constraints | Race condition linter, concurrent tests | Transaction patterns |
| **Code Quality** | Shared utilities at 3+ uses | jscpd, import analysis | DRY principles |
| **Documentation** | Agent-native API docs | API coverage check | CLAUDE.md, OpenAPI |

### ROI Estimate

**Time Investment:**
- Setup: 40-60 hours (one-time)
- Maintenance: 2-4 hours/week

**Time Saved:**
- Security incidents avoided: ~100 hours/incident
- Data corruption avoided: ~50 hours/incident
- Refactoring time saved: ~20 hours/month
- Documentation questions avoided: ~10 hours/week

**Net ROI:** ~400% over 6 months

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize phases** based on risk and effort
3. **Assign owners** for each automation/check
4. **Schedule training** on new patterns and tools
5. **Track metrics** to measure improvement

**Questions?** See the original issue files in `todos/` for detailed context.
