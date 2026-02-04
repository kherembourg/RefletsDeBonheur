# Critical Patterns - Required Reading

**Purpose:** Foundational patterns that MUST be followed to prevent recurring issues.

These patterns have caused problems multiple times across the codebase. All engineers and AI agents should internalize these before making changes.

---

## 1. Multi-Agent Code Review for Major PRs (ALWAYS REQUIRED)

### ❌ WRONG (Will miss critical security/performance issues)
```typescript
// Single manual reviewer approach
// - Reviews PR #37 manually
// - Checks code for obvious bugs
// - Approves and merges
// Result: SSRF vulnerability, DoS attack vector, 1800ms latency shipped to production
```

### ✅ CORRECT
```bash
# Launch 7 specialized review agents in parallel
/workflows:review

# Agents launched:
# 1. code-simplicity-reviewer
# 2. security-sentinel
# 3. performance-oracle
# 4. architecture-strategist
# 5. pattern-recognition-specialist
# 6. data-integrity-guardian
# 7. agent-native-reviewer

# Result: 12 critical/important issues identified
# - 3 CRITICAL security vulnerabilities (SSRF, DoS, malicious upload)
# - 1 CRITICAL performance bottleneck (500-1800ms latency)
# - 2 CRITICAL data integrity issues (orphaned files, no transactions)
# - 6 Important improvements

# Resolve in parallel waves
/resolve_todo_parallel

# All issues fixed in 23 minutes
# PR changes from "DO NOT MERGE" to "READY"
```

**Why:** Human reviewers cannot maintain consistent focus across 7+ quality dimensions simultaneously. Each specialized agent brings deep expertise in their domain:
- **Security-sentinel** catches vulnerabilities manual review misses (SSRF, path traversal, DoS)
- **Performance-oracle** identifies bottlenecks with latency impact (500-1800ms)
- **Data-integrity-guardian** spots transaction issues and orphaned data
- **Others** catch code quality, architecture, and pattern issues

Single reviewer approach consistently misses critical issues that ship to production.

**Placement/Context:**
- All PRs with >500 lines changed
- All security-sensitive changes (auth, payments, file upload, data handling)
- All performance-critical paths (database queries, async processing, external API calls)
- All data integrity operations (transactions, migrations, bulk operations)
- Major refactorings touching multiple modules

**Not needed for:**
- Documentation-only changes
- Simple bug fixes (<50 lines, single file)
- Dependency updates (unless major version bump)
- Configuration tweaks without code changes

**Documented in:** `docs/solutions/workflow-issues/parallel-agent-code-review-workflow-20260204.md`

---

**Last updated:** 2026-02-04
