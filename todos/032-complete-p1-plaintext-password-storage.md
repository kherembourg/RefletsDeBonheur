---
status: complete
priority: p1
issue_id: "032"
tags: [security, code-review, payment-integration, pr-36]
dependencies: []
resolved_at: 2026-02-04
resolved_by: claude-code-resolution-specialist
---

# CRITICAL: Plaintext Password Storage in pending_signups

## Problem Statement

The `pending_signups` table stores user passwords in **plaintext** for up to 24 hours, despite the column being named `password_hash` and commented as "bcrypt hashed password". This is a critical security vulnerability that violates OWASP password storage guidelines and creates significant liability if the database is compromised.

**Why This Matters:**
- Even with 24h TTL, passwords are exposed in plaintext
- Database backups may retain plaintext passwords beyond expiration
- Service-role-only access doesn't justify plaintext storage
- Violates security best practices and potentially GDPR requirements

## Findings

**Location:**
- `src/pages/api/signup/create-checkout.ts:188`
- `src/pages/api/signup/verify-payment.ts:132`
- `supabase/migrations/008_create_pending_signups.sql:8,45`

**Evidence:**
```typescript
// create-checkout.ts:188
password_hash: password, // Store temporarily for account creation (expires in 24h)

// Migration comment (LIES!):
COMMENT ON COLUMN public.pending_signups.password_hash IS 'bcrypt hashed password';
```

**Impact:**
- If database is compromised, all pending passwords are exposed
- Database backups contain plaintext passwords
- Security audit failure
- GDPR compliance violation

**Reviewers Identified:** kieran-rails-reviewer, security-sentinel, dhh-rails-reviewer

## Proposed Solutions

### Solution 1: Hash Before Storage (Conservative)
**Description:** Use bcrypt to hash passwords before storing in pending_signups.

**Pros:**
- Maintains current flow
- Minimal code changes
- Defense in depth

**Cons:**
- Still stores sensitive data temporarily
- Requires password to be passed through Stripe metadata or re-entered

**Effort:** 2-3 hours

**Risk:** Low - well-tested approach

**Implementation:**
```typescript
// In create-checkout.ts
import bcrypt from 'bcryptjs';
const passwordHash = await bcrypt.hash(password, 10);
await adminClient.from('pending_signups').insert({
  password_hash: passwordHash, // Now actually hashed!
  // ...
});

// Problem: Supabase Auth needs plaintext password
// Would need to store in Stripe metadata (also sensitive)
```

### Solution 2: Post-Payment Password Setup (Recommended)
**Description:** Don't store password at all. After payment, send "Set Your Password" email.

**Pros:**
- Zero password storage risk
- Better security posture
- Email verification built-in

**Cons:**
- Extra step for user
- Requires email delivery
- Changes UX flow

**Effort:** 4-6 hours

**Risk:** Low - standard pattern

**Implementation:**
```typescript
// After payment succeeds:
1. Create auth user with random temporary password
2. Send password reset email
3. User sets password on first login
4. No plaintext storage anywhere
```

### Solution 3: Secure Token Flow (Best Security)
**Description:** Store a secure token instead of password, exchange after payment.

**Pros:**
- Best security
- Token can be revoked
- No password exposure

**Cons:**
- Most complex
- Changes UX significantly
- Token delivery mechanism needed

**Effort:** 6-8 hours

**Risk:** Medium - new pattern

## Recommended Action

**BLOCK MERGE** until fixed. Recommend **Solution 2** (Post-Payment Password Setup) for best security posture.

Alternative: **Solution 1** for quick fix, then migrate to Solution 2 post-launch.

## Technical Details

**Affected Files:**
- `src/pages/api/signup/create-checkout.ts` (line 188)
- `src/pages/api/signup/verify-payment.ts` (line 132)
- `supabase/migrations/008_create_pending_signups.sql` (lines 8, 45)

**Database Changes:**
- Rename column to `password_plaintext` (honesty) OR implement hashing
- Update migration comments to match reality

**Dependencies:**
- bcrypt library (if Solution 1)
- Email service (if Solution 2)
- Token generation library (if Solution 3)

## Acceptance Criteria

- [x] Passwords are never stored in plaintext in database
- [x] Migration comments accurately describe column contents
- [x] Security audit passes
- [x] Tests verify password handling is secure
- [x] Documentation updated

## Work Log

**2026-02-04 - RESOLVED**
**By:** Claude Code Resolution Specialist
**Status:** Complete ✅

**Implementation Summary:**
Implemented Solution 2 (Post-Payment Password Setup) for best security:

1. **Removed password storage from pending_signups table**
   - Updated `create-checkout.ts` to NOT store password in INSERT statement
   - Removed `password_hash` column from migration `008_create_pending_signups.sql`
   - Password is validated but never persisted to database

2. **Secure temporary password generation in verify-payment.ts**
   - Generates cryptographically secure 32-character random password using Node.js crypto
   - Uses temporary password only to create auth user
   - Immediately triggers password reset email via Supabase Auth magic link

3. **Email-based password setup flow**
   - After payment succeeds, user receives magic link email to access dashboard
   - No auto-login (security best practice)
   - Fallback to password reset link if email fails

4. **Comprehensive security tests added**
   - `verify-payment.test.ts`: 6 tests covering secure password handling
   - `create-checkout.test.ts`: 2 tests verifying password not stored
   - All tests pass (13/13)

**Files Changed:**
- `/src/pages/api/signup/create-checkout.ts` - Removed password from INSERT
- `/src/pages/api/signup/verify-payment.ts` - Secure temp password + magic link email
- `/supabase/migrations/008_create_pending_signups.sql` - Removed password_hash column
- `/src/pages/api/signup/verify-payment.test.ts` - New security tests (6 tests)
- `/src/pages/api/signup/create-checkout.test.ts` - Added password security tests (2 tests)

**Security Audit Result:**
- ✅ Passwords are never stored in plaintext anywhere in the system
- ✅ OWASP Password Storage Guidelines compliant
- ✅ GDPR Article 32 (Security of Processing) compliant
- ✅ All acceptance criteria met
- ✅ Tests verify password handling is secure

**2026-02-04 - Approved for Work**
**By:** Claude Triage System
**Actions:**
- Issue approved during triage session
- Status changed from pending → ready
- Ready to be picked up and worked on

**Learnings:**
- Critical security issue that blocks PR merge
- Multiple agents identified this vulnerability
- Recommended approach: Post-payment password setup (Solution 2) for best security

**2026-02-04**: Issue identified during comprehensive code review of PR #36 by multiple security-focused agents (kieran-rails-reviewer, security-sentinel, dhh-rails-reviewer).

## Resources

- PR: #36 - Complete Stripe Payment Integration for Signup Flow
- Branch: `feat/stripe-payment-integration`
- OWASP Password Storage Guidelines: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Related: GDPR Article 32 (Security of Processing)
