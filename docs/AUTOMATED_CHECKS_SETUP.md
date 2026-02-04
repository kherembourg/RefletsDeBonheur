# Automated Checks Setup Guide

**Practical implementation guide for prevention strategies**

This guide shows how to implement the automated checks from `PREVENTION_STRATEGIES.md`.

---

## Overview

| Check | Type | Effort | ROI | Priority |
|-------|------|--------|-----|----------|
| Pre-commit hooks | Git hook | 2h | High | P0 |
| CI pipeline checks | GitHub Actions | 4h | High | P0 |
| Code duplication | CI check | 1h | Medium | P1 |
| API documentation coverage | Script | 2h | Medium | P1 |
| Database audit | Scheduled job | 3h | High | P1 |
| Performance monitoring | Runtime | 4h | Medium | P2 |

**Total setup time:** ~16 hours
**Ongoing maintenance:** ~1 hour/week

---

## 1. Pre-commit Hooks

**Purpose:** Catch issues before they're committed

### Setup (one-time)

```bash
# Install husky for git hooks
npm install --save-dev husky
npx husky init

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running pre-commit checks..."

# Run all checks
npm run pre-commit

EOF

chmod +x .husky/pre-commit
```

### Add pre-commit script to package.json

```json
{
  "scripts": {
    "pre-commit": "run-s pre-commit:*",
    "pre-commit:types": "tsc --noEmit",
    "pre-commit:lint": "eslint --max-warnings 0 $(git diff --cached --name-only --diff-filter=d | grep -E '\\.(ts|tsx)$' | xargs)",
    "pre-commit:security": "bash scripts/check-security.sh",
    "pre-commit:migrations": "bash scripts/check-migrations.sh"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}
```

### Create security check script

```bash
#!/bin/bash
# scripts/check-security.sh

set -e

echo "🔍 Checking for security issues..."

# Check for plaintext password storage in migrations
if git diff --cached --name-only | grep -q "supabase/migrations"; then
  echo "  → Checking migrations for plaintext passwords..."

  # Pattern: password/secret/token column without hash/encrypt
  if git diff --cached | grep -iE "(password|secret|token).*TEXT|VARCHAR" | \
     grep -vE "(hash|encrypted|bcrypt)"; then
    echo "❌ ERROR: Potential plaintext password storage detected"
    echo ""
    echo "All password/secret/token fields must be:"
    echo "  - Hashed with bcrypt (for passwords)"
    echo "  - Encrypted (for tokens/keys)"
    echo "  - Named accurately (password_hash, not password)"
    echo ""
    exit 1
  fi

  echo "  ✅ No plaintext passwords detected"
fi

# Check for API endpoints without auth checks
STAGED_API_FILES=$(git diff --cached --name-only | grep "src/pages/api/.*\.ts$" || true)

if [ -n "$STAGED_API_FILES" ]; then
  echo "  → Checking API endpoints for auth..."

  for file in $STAGED_API_FILES; do
    # Skip if file is deleted
    if [ ! -f "$file" ]; then
      continue
    fi

    # Check if endpoint has auth or is explicitly public
    if ! grep -qE "(requireAuth|requireSupabase|PUBLIC_ENDPOINT|// No auth required)" "$file"; then
      echo "⚠️  WARNING: $file may be missing auth checks"
      echo "   Add comment '// No auth required' if intentional"
    fi
  done
fi

echo "✅ Security checks passed"
```

### Create migration check script

```bash
#!/bin/bash
# scripts/check-migrations.sh

set -e

echo "🔍 Checking database migrations..."

# Check if migrations are being added
STAGED_MIGRATIONS=$(git diff --cached --name-only | grep "supabase/migrations/.*\.sql$" || true)

if [ -z "$STAGED_MIGRATIONS" ]; then
  echo "  ℹ️  No migrations to check"
  exit 0
fi

echo "  → Checking for cleanup jobs on temporary tables..."

for migration in $STAGED_MIGRATIONS; do
  # Skip if file is deleted
  if [ ! -f "$migration" ]; then
    continue
  fi

  # Check for temporary tables
  if grep -qE "CREATE TABLE.*(pending_|temp_|staging_)" "$migration"; then
    echo "  → Found temporary table in $migration"

    # Check if cleanup is scheduled
    if ! grep -qE "(pg_cron\.schedule|CREATE TRIGGER.*cleanup|expires_at)" "$migration"; then
      echo "⚠️  WARNING: Temporary table without cleanup mechanism"
      echo "   Migration: $migration"
      echo "   Add: pg_cron schedule OR trigger-based cleanup OR TTL column"
      echo ""
    else
      echo "  ✅ Cleanup mechanism found"
    fi
  fi
done

# Check for unique constraints on exclusive resources
echo "  → Checking for race condition prevention..."

for migration in $STAGED_MIGRATIONS; do
  if [ ! -f "$migration" ]; then
    continue
  fi

  # Look for columns like slug, email, username without unique constraint
  if grep -qE "slug.*VARCHAR|email.*VARCHAR|username.*VARCHAR" "$migration"; then
    if ! grep -qE "(UNIQUE|CREATE UNIQUE INDEX)" "$migration"; then
      echo "⚠️  WARNING: Exclusive resource without unique constraint"
      echo "   Migration: $migration"
      echo "   Add: UNIQUE constraint or CREATE UNIQUE INDEX"
      echo ""
    fi
  fi
done

echo "✅ Migration checks passed"
```

### Make scripts executable

```bash
chmod +x scripts/check-security.sh
chmod +x scripts/check-migrations.sh
```

---

## 2. CI Pipeline Checks

**Purpose:** Automated validation on every PR

### Update GitHub Actions workflow

```yaml
# .github/workflows/ci.yml

name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check for plaintext passwords in migrations
        run: |
          if grep -rE "password.*TEXT|password.*VARCHAR" supabase/migrations/ | \
             grep -v "hashed\|bcrypt\|encrypted"; then
            echo "::error::Migration contains plaintext password column"
            exit 1
          fi

      - name: NPM audit
        run: npm audit --audit-level=high

  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Check code duplication
        run: |
          npx jscpd src/ \
            --min-lines 5 \
            --min-tokens 50 \
            --threshold 5 \
            --format "typescript,javascript" \
            --reporters "console,json" \
            --output "./jscpd-report"

          # Fail if duplication > 5%
          DUPLICATION=$(cat jscpd-report/jscpd-report.json | jq -r '.statistics.total.percentage // 0')
          echo "Code duplication: ${DUPLICATION}%"

          if (( $(echo "$DUPLICATION > 5.0" | bc -l) )); then
            echo "::error::Code duplication ${DUPLICATION}% exceeds threshold of 5%"
            exit 1
          fi

      - name: Upload duplication report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: duplication-report
          path: jscpd-report/

  test-suite:
    name: Test Suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq -r '.total.statements.pct')
          echo "Test coverage: ${COVERAGE}%"

          if (( $(echo "$COVERAGE < 70.0" | bc -l) )); then
            echo "::warning::Test coverage ${COVERAGE}% is below 70% threshold"
          fi

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

  documentation:
    name: Documentation Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check API documentation coverage
        run: node scripts/check-api-docs.js

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [security-audit, code-quality, test-suite]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check build size
        run: |
          SIZE=$(du -sm dist/ | cut -f1)
          echo "Build size: ${SIZE}MB"

          if [ "$SIZE" -gt 50 ]; then
            echo "::warning::Build size ${SIZE}MB exceeds 50MB"
          fi
```

---

## 3. API Documentation Coverage Check

**Purpose:** Ensure all endpoints are documented

### Create check script

```javascript
// scripts/check-api-docs.js

const fs = require('fs');
const path = require('path');

function findApiFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findApiFiles(fullPath, files);
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts')
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractRouteFromFile(filePath) {
  // Convert: src/pages/api/signup/create-checkout.ts
  // To: /api/signup/create-checkout
  const route = filePath
    .replace(/^src\/pages/, '')
    .replace(/\.ts$/, '')
    .replace(/\/index$/, '');
  return route;
}

function main() {
  console.log('🔍 Checking API documentation coverage...\n');

  // Find all API endpoint files
  const apiDir = path.join(__dirname, '..', 'src', 'pages', 'api');
  const apiFiles = findApiFiles(apiDir);

  console.log(`Found ${apiFiles.length} API endpoint files\n`);

  // Read CLAUDE.md
  const claudeMdPath = path.join(__dirname, '..', 'CLAUDE.md');
  const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');

  // Check each endpoint
  const undocumented = [];
  const documented = [];

  for (const file of apiFiles) {
    const route = extractRouteFromFile(file);

    // Check if route is mentioned in CLAUDE.md
    if (claudeMd.includes(route)) {
      documented.push(route);
      console.log(`  ✅ ${route}`);
    } else {
      undocumented.push(route);
      console.log(`  ❌ ${route}`);
    }
  }

  console.log(`\nResults:`);
  console.log(`  Documented: ${documented.length}/${apiFiles.length}`);
  console.log(`  Missing: ${undocumented.length}/${apiFiles.length}`);

  if (undocumented.length > 0) {
    console.log('\n❌ ERROR: Undocumented API endpoints found:\n');
    undocumented.forEach(route => console.log(`  - ${route}`));
    console.log('\nPlease add documentation to CLAUDE.md for these endpoints.');
    console.log('See docs/PREVENTION_STRATEGIES.md for documentation template.');
    process.exit(1);
  }

  console.log('\n✅ All API endpoints are documented');
}

main();
```

### Add to package.json

```json
{
  "scripts": {
    "check:api-docs": "node scripts/check-api-docs.js"
  }
}
```

---

## 4. Code Duplication Detection

**Purpose:** Prevent copy-paste code

### Install jscpd

```bash
npm install --save-dev jscpd
```

### Create configuration file

```json
// .jscpd.json
{
  "threshold": 5,
  "reporters": ["html", "console", "json"],
  "ignore": [
    "**/__tests__/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**"
  ],
  "format": ["typescript", "javascript"],
  "minLines": 5,
  "minTokens": 50,
  "output": "./reports/jscpd"
}
```

### Add scripts to package.json

```json
{
  "scripts": {
    "check:duplication": "jscpd src/",
    "check:duplication:ci": "jscpd src/ --exitCode 1"
  }
}
```

---

## 5. Database Security Audit

**Purpose:** Runtime monitoring for security issues

### Create audit migration

```sql
-- supabase/migrations/010_security_audit.sql

-- Function to audit password storage
CREATE OR REPLACE FUNCTION audit_password_storage()
RETURNS TABLE(
  table_name TEXT,
  column_name TEXT,
  issue TEXT,
  severity TEXT
) AS $$
BEGIN
  -- Check for columns named password/secret/token
  RETURN QUERY
  SELECT
    c.table_name::TEXT,
    c.column_name::TEXT,
    'Column may contain sensitive data'::TEXT as issue,
    CASE
      WHEN c.column_name ILIKE '%password%' THEN 'CRITICAL'
      WHEN c.column_name ILIKE '%secret%' THEN 'CRITICAL'
      WHEN c.column_name ILIKE '%token%' THEN 'HIGH'
      ELSE 'MEDIUM'
    END::TEXT as severity
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND (
      c.column_name ILIKE '%password%'
      OR c.column_name ILIKE '%secret%'
      OR c.column_name ILIKE '%token%'
    )
    AND c.data_type IN ('text', 'character varying');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily security audit function
CREATE OR REPLACE FUNCTION daily_security_audit()
RETURNS void AS $$
DECLARE
  v_expired_signups INTEGER;
  v_orphaned_profiles INTEGER;
  v_audit_record RECORD;
BEGIN
  -- Check for expired pending signups
  SELECT COUNT(*) INTO v_expired_signups
  FROM pending_signups
  WHERE expires_at < now() AND completed_at IS NULL;

  IF v_expired_signups > 100 THEN
    INSERT INTO audit_log (event_type, severity, details)
    VALUES (
      'cleanup_failure',
      'WARNING',
      json_build_object(
        'message', 'Cleanup job may be failing',
        'expired_signups', v_expired_signups
      )
    );
  END IF;

  -- Check for orphaned profiles
  SELECT COUNT(*) INTO v_orphaned_profiles
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM weddings w WHERE w.owner_id = p.id
  );

  IF v_orphaned_profiles > 0 THEN
    INSERT INTO audit_log (event_type, severity, details)
    VALUES (
      'data_integrity',
      'WARNING',
      json_build_object(
        'message', 'Orphaned profiles detected',
        'count', v_orphaned_profiles
      )
    );
  END IF;

  -- Check password storage
  FOR v_audit_record IN
    SELECT * FROM audit_password_storage()
    WHERE severity IN ('CRITICAL', 'HIGH')
  LOOP
    INSERT INTO audit_log (event_type, severity, details)
    VALUES (
      'security_audit',
      v_audit_record.severity,
      json_build_object(
        'table', v_audit_record.table_name,
        'column', v_audit_record.column_name,
        'issue', v_audit_record.issue
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule daily audit (4am UTC)
SELECT cron.schedule(
  'daily-security-audit',
  '0 4 * * *',
  'SELECT daily_security_audit();'
);

-- Create view for audit log
CREATE OR REPLACE VIEW security_audit_status AS
SELECT
  event_type,
  severity,
  COUNT(*) as count,
  MAX(created_at) as last_occurrence
FROM audit_log
WHERE created_at > now() - interval '7 days'
  AND event_type IN ('cleanup_failure', 'data_integrity', 'security_audit')
GROUP BY event_type, severity
ORDER BY severity DESC, count DESC;

COMMENT ON VIEW security_audit_status IS 'Summary of security audit findings from last 7 days';
```

### Create monitoring queries

```sql
-- Query 1: Check audit status
SELECT * FROM security_audit_status;

-- Query 2: Recent audit findings
SELECT
  created_at,
  event_type,
  severity,
  details
FROM audit_log
WHERE event_type IN ('cleanup_failure', 'data_integrity', 'security_audit')
ORDER BY created_at DESC
LIMIT 20;

-- Query 3: Password storage audit
SELECT * FROM audit_password_storage();
```

---

## 6. Performance Monitoring

**Purpose:** Track API performance over time

### Create API logging table

```sql
-- supabase/migrations/011_api_performance.sql

CREATE TABLE IF NOT EXISTS api_request_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  user_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance queries
CREATE INDEX idx_api_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX idx_api_logs_path_status ON api_request_logs(path, status_code);

-- View for performance summary
CREATE OR REPLACE VIEW api_performance_summary AS
SELECT
  path,
  COUNT(*) as request_count,
  AVG(duration_ms)::INTEGER as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p99_ms,
  MAX(duration_ms) as max_duration_ms,
  COUNT(*) FILTER (WHERE status_code >= 500) as error_count,
  (COUNT(*) FILTER (WHERE status_code >= 500)::FLOAT / COUNT(*) * 100)::NUMERIC(5,2) as error_rate
FROM api_request_logs
WHERE created_at > now() - interval '1 hour'
GROUP BY path
ORDER BY request_count DESC;
```

### Create middleware to log requests

```typescript
// src/lib/api/logging.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function logApiRequest(
  path: string,
  method: string,
  statusCode: number,
  durationMs: number,
  userId?: string,
  errorMessage?: string
) {
  // Don't block the response
  setImmediate(async () => {
    try {
      await supabase.from('api_request_logs').insert({
        path,
        method,
        status_code: statusCode,
        duration_ms: durationMs,
        user_id: userId,
        error_message: errorMessage,
      });
    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  });
}

// Middleware wrapper
export function withLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  path: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let response: Response;
    let errorMessage: string | undefined;

    try {
      response = await handler(...args);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const request = args[0]?.request as Request;

      await logApiRequest(
        path,
        request?.method || 'UNKNOWN',
        response?.status || 500,
        duration,
        undefined, // Extract from auth token if needed
        errorMessage
      );
    }

    return response;
  }) as T;
}
```

### Usage in endpoints

```typescript
// src/pages/api/example.ts
import { withLogging } from '@/lib/api/logging';

const handler: APIRoute = async ({ request }) => {
  // Your endpoint logic
  return new Response(JSON.stringify({ success: true }));
};

export const POST = withLogging(handler, '/api/example');
```

---

## 7. Scheduled Monitoring Reports

**Purpose:** Weekly summary of code quality metrics

### Create GitHub Action for weekly report

```yaml
# .github/workflows/weekly-report.yml

name: Weekly Code Quality Report

on:
  schedule:
    # Every Monday at 9am UTC
    - cron: '0 9 * * 1'
  workflow_dispatch: # Allow manual trigger

jobs:
  generate-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate test coverage report
        run: npm run test:coverage

      - name: Generate duplication report
        run: npx jscpd src/ --reporters json
        continue-on-error: true

      - name: Check API documentation
        run: node scripts/check-api-docs.js > reports/api-docs.txt
        continue-on-error: true

      - name: Compile metrics
        run: |
          echo "# Weekly Code Quality Report" > report.md
          echo "" >> report.md
          echo "**Generated:** $(date)" >> report.md
          echo "" >> report.md

          # Test coverage
          COVERAGE=$(cat coverage/coverage-summary.json | jq -r '.total.statements.pct')
          echo "## Test Coverage: ${COVERAGE}%" >> report.md
          echo "" >> report.md

          # Code duplication
          if [ -f "reports/jscpd/jscpd-report.json" ]; then
            DUPLICATION=$(cat reports/jscpd/jscpd-report.json | jq -r '.statistics.total.percentage // 0')
            echo "## Code Duplication: ${DUPLICATION}%" >> report.md
          fi
          echo "" >> report.md

          # API documentation
          echo "## API Documentation" >> report.md
          cat reports/api-docs.txt >> report.md
          echo "" >> report.md

      - name: Create issue with report
        uses: peter-evans/create-issue-from-file@v5
        with:
          title: Weekly Code Quality Report - ${{ github.event.repository.updated_at }}
          content-filepath: ./report.md
          labels: |
            report
            code-quality
```

---

## Testing Your Setup

### Test pre-commit hooks

```bash
# Create a test commit with security issue
echo "password TEXT" > test-migration.sql
git add test-migration.sql
git commit -m "Test security check"
# Should fail with error about plaintext password

# Clean up
rm test-migration.sql
git reset HEAD~1
```

### Test CI checks locally

```bash
# Run the same checks as CI
npm run pre-commit
npm run test:coverage
npm run check:duplication
npm run check:api-docs
npm run build
```

### Test database audit

```sql
-- Run manual audit
SELECT daily_security_audit();

-- Check results
SELECT * FROM security_audit_status;
SELECT * FROM audit_password_storage();
```

---

## Maintenance

### Weekly
- [ ] Review security audit findings
- [ ] Check API performance metrics
- [ ] Review code duplication report

### Monthly
- [ ] Update dependency versions
- [ ] Review and update thresholds (coverage, duplication)
- [ ] Archive old audit logs

### Quarterly
- [ ] Review and update prevention strategies
- [ ] Conduct security audit with team
- [ ] Update documentation

---

## Troubleshooting

### Pre-commit hooks not running

```bash
# Reinstall hooks
npx husky install
chmod +x .husky/pre-commit
```

### CI checks failing unexpectedly

```bash
# Run locally to debug
npm ci
npm run test:coverage
npm run check:duplication
```

### Database audit not scheduled

```sql
-- Check if pg_cron is installed
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- Check scheduled jobs
SELECT * FROM cron.job WHERE jobname LIKE '%audit%';

-- Manually reschedule
SELECT cron.unschedule('daily-security-audit');
SELECT cron.schedule(
  'daily-security-audit',
  '0 4 * * *',
  'SELECT daily_security_audit();'
);
```

---

## Next Steps

1. ✅ Complete setup (follow sections 1-7)
2. ✅ Test each check manually
3. ✅ Create a test PR to verify CI
4. ✅ Train team on new checks
5. ✅ Monitor for false positives
6. ✅ Adjust thresholds as needed

**Questions?** See `docs/PREVENTION_STRATEGIES.md` for detailed rationale.
