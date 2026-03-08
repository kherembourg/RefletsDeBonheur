-- ============================================
-- Fix #049: Replace "Allow all" RLS policies on auth tables
-- ============================================
-- The original 001_auth_schema.sql created overly permissive
-- RLS policies (USING (true)) on sensitive auth tables.
--
-- Since the app exclusively uses getSupabaseAdminClient() (service role)
-- for these tables, the service role bypasses RLS entirely.
-- Therefore, we can safely deny all access via RLS policies,
-- which blocks any direct access from anon or authenticated clients.
-- ============================================

-- ============================================
-- 1. Drop overly permissive "Allow all" policies
-- ============================================

-- These were created in 001_auth_schema.sql (appears twice due to duplication)
DROP POLICY IF EXISTS "Allow all for auth_sessions" ON auth_sessions;
DROP POLICY IF EXISTS "Allow all for god_admins" ON god_admins;
DROP POLICY IF EXISTS "Allow all for god_access_tokens" ON god_access_tokens;
DROP POLICY IF EXISTS "Allow all for audit_log" ON audit_log;

-- Also drop the "Allow all" on clients and guest_sessions from 001_auth_schema.sql
-- (guest_sessions already has a proper restrictive policy in 002_rls_policies.sql;
--  clients is handled separately but had the same "Allow all" pattern)
DROP POLICY IF EXISTS "Allow all for clients" ON clients;
DROP POLICY IF EXISTS "Allow all for guest_sessions" ON guest_sessions;

-- ============================================
-- 2. Ensure RLS remains enabled on all auth tables
-- ============================================

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE god_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE god_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Create restrictive RLS policies
-- ============================================
-- Strategy: USING (false) denies all access via anon/authenticated roles.
-- The service role bypasses RLS, so app functionality is unaffected.

-- auth_sessions: No direct client access. Service role only.
CREATE POLICY "Deny all direct access to auth_sessions"
  ON auth_sessions
  FOR ALL
  USING (false);

-- god_admins: No direct client access. Service role only.
CREATE POLICY "Deny all direct access to god_admins"
  ON god_admins
  FOR ALL
  USING (false);

-- god_access_tokens: No direct client access. Service role only.
CREATE POLICY "Deny all direct access to god_access_tokens"
  ON god_access_tokens
  FOR ALL
  USING (false);

-- audit_log: No direct client access. Service role only for INSERT.
-- No SELECT/UPDATE/DELETE for any non-service-role user.
CREATE POLICY "Deny all direct access to audit_log"
  ON audit_log
  FOR ALL
  USING (false);
