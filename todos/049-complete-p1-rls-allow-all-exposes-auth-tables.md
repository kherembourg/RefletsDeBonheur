---
status: pending
priority: p1
issue_id: "049"
tags: [code-review, security, supabase, rls]
dependencies: []
---

# RLS "Allow All" Policies Expose Auth Tables to Anon Key

## Problem Statement

The RLS policies on `god_admins`, `auth_sessions`, `god_access_tokens`, and `audit_log` all use `FOR ALL USING (true)`. This means any request using the public anon key (exposed in client-side code) can read god admin password hashes, steal active session tokens, insert fake sessions, and delete audit logs.

The `godAuth.ts` `godLogin()` function confirms this: it queries `god_admins` with `select('*')` using the anon key client, retrieving `password_hash` directly from the browser.

## Findings

- **Source:** Security Sentinel, Data Integrity Guardian
- **File:** `supabase/migrations/001_auth_schema.sql` lines 297-316
- **Evidence:** `CREATE POLICY "Allow all for god_admins" ON god_admins FOR ALL USING (true);` — repeated for all 4 tables
- **Confirmed by:** `src/lib/auth/godAuth.ts` line 94 queries `god_admins` from client with anon key

## Proposed Solutions

### Option A: Restrict all policies to service role only (Recommended)
- Change all `USING (true)` to `USING (false)` on these 4 tables
- Only the service role (which bypasses RLS) should access them
- Refactor `godAuth.ts` to call a server-side API endpoint instead of querying directly
- **Pros:** Maximum security, clean separation
- **Cons:** Requires new API endpoint for god login
- **Effort:** Medium (2-3h)
- **Risk:** Low

### Option B: Add role-based RLS policies
- Replace `USING (true)` with `USING (auth.role() = 'service_role')`
- **Pros:** More explicit, self-documenting
- **Cons:** Still need to refactor client-side god login
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Option A — restrict to service role and create `/api/auth/god-login` endpoint.

## Technical Details

**Affected files:**
- `supabase/migrations/001_auth_schema.sql` (RLS policies)
- `src/lib/auth/godAuth.ts` (god login client-side query)
- New: `src/pages/api/auth/god-login.ts`

## Acceptance Criteria

- [ ] All 4 auth table RLS policies changed to `USING (false)`
- [ ] God admin login goes through server-side API endpoint
- [ ] Anon key cannot read `god_admins`, `auth_sessions`, `god_access_tokens`, or `audit_log`
- [ ] Verified in Supabase dashboard

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-03-07 | Created from full project review | Found by Security Sentinel + Data Integrity Guardian |
