-- =============================================
-- Reflets de Bonheur - Authentication Schema
-- =============================================
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Replace 'YOUR_USERNAME' and 'YOUR_PASSWORD_HASH' below

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. GOD ADMIN TABLE
-- =============================================
-- The super admin who can manage all clients

CREATE TABLE IF NOT EXISTS god_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create index for faster username lookup
CREATE INDEX IF NOT EXISTS idx_god_admins_username ON god_admins(username);

-- =============================================
-- INSERT YOUR GOD ADMIN ACCOUNT
-- =============================================
-- IMPORTANT: Replace these values before running!
--
-- To generate a password hash, use this in Supabase SQL Editor:
--   SELECT crypt('your_password_here', gen_salt('bf', 12));
--
-- Then copy the result and paste it below as YOUR_PASSWORD_HASH

INSERT INTO god_admins (username, password_hash, email)
VALUES (
  'kevin',           -- Change this to your username
  '$2a$12$iW4DA/8AuXAk4MrBVYP5O.MvPYU60aHETmJWV9kMc.G2wypMFVYX6',      -- Change this to the hash from the crypt() function
  'kevin@herembourg.fr'           -- Change this to your email (optional)
);

-- =============================================
-- 2. CLIENTS TABLE
-- =============================================
-- Wedding clients who purchase the service

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Wedding information
  wedding_name TEXT NOT NULL,
  couple_names TEXT NOT NULL,
  wedding_date DATE,
  wedding_slug TEXT UNIQUE NOT NULL,

  -- Client authentication
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Guest access codes
  guest_code TEXT UNIQUE NOT NULL,
  admin_code TEXT UNIQUE NOT NULL,

  -- Settings
  allow_uploads BOOLEAN DEFAULT true,
  allow_guestbook BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'classic',
  custom_domain TEXT,

  -- Subscription
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'trial')),
  subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_expires_at TIMESTAMPTZ,
  payment_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,

  -- Statistics (denormalized for quick access)
  photo_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  storage_used_mb NUMERIC(10,2) DEFAULT 0
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_username ON clients(username);
CREATE INDEX IF NOT EXISTS idx_clients_wedding_slug ON clients(wedding_slug);
CREATE INDEX IF NOT EXISTS idx_clients_guest_code ON clients(guest_code);
CREATE INDEX IF NOT EXISTS idx_clients_admin_code ON clients(admin_code);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- =============================================
-- 3. AUTH SESSIONS TABLE
-- =============================================
-- Stores active authentication sessions (JWT-like tokens)

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who owns this session
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('god', 'client', 'guest')),

  -- Token data
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,

  -- Security metadata
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- Create indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, user_type) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at) WHERE revoked_at IS NULL;

-- =============================================
-- 4. GOD IMPERSONATION TOKENS
-- =============================================
-- Short-lived tokens for god admin to access client interfaces

CREATE TABLE IF NOT EXISTS god_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who created and who to access
  god_admin_id UUID NOT NULL REFERENCES god_admins(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Token
  token TEXT UNIQUE NOT NULL,

  -- Short expiration (15 minutes max)
  expires_at TIMESTAMPTZ NOT NULL,

  -- Usage tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  used_count INTEGER DEFAULT 0,

  -- Security
  ip_address TEXT,
  max_uses INTEGER DEFAULT 1
);

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_god_access_tokens_token ON god_access_tokens(token) WHERE used_at IS NULL;

-- =============================================
-- 5. GUEST SESSIONS TABLE
-- =============================================
-- Track guest access for analytics

CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Session info
  token TEXT UNIQUE NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('guest', 'admin')),
  guest_name TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_client ON guest_sessions(client_id);

-- =============================================
-- 6. AUDIT LOG TABLE
-- =============================================
-- Track important actions for security

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('god', 'client', 'guest', 'system')),

  -- Action
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,

  -- Details
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(input_password TEXT, stored_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash password
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure token
CREATE OR REPLACE FUNCTION generate_token(length INTEGER DEFAULT 64)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to generate short code (for guest/admin codes)
CREATE OR REPLACE FUNCTION generate_short_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM god_access_tokens WHERE expires_at < NOW();
  DELETE FROM guest_sessions WHERE expires_at < NOW();

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE god_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE god_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service role and authenticated access
-- These allow the application to read/write using the service role key

-- God admins - allow all operations (service role will bypass, but adding for clarity)
CREATE POLICY "Allow all for god_admins" ON god_admins FOR ALL USING (true);

-- Clients - allow all operations
CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true);

-- Auth sessions - allow all operations
CREATE POLICY "Allow all for auth_sessions" ON auth_sessions FOR ALL USING (true);

-- God access tokens - allow all operations
CREATE POLICY "Allow all for god_access_tokens" ON god_access_tokens FOR ALL USING (true);

-- Guest sessions - allow all operations
CREATE POLICY "Allow all for guest_sessions" ON guest_sessions FOR ALL USING (true);

-- Audit log - allow all operations
CREATE POLICY "Allow all for audit_log" ON audit_log FOR ALL USING (true)

-- =============================================
-- 9. SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- =============================================

-- Uncomment below to create a sample client for testing
/*
INSERT INTO clients (
  wedding_name,
  couple_names,
  wedding_date,
  wedding_slug,
  username,
  password_hash,
  email,
  guest_code,
  admin_code,
  subscription_expires_at
) VALUES (
  'Mariage Marie & Thomas',
  'Marie & Thomas',
  '2026-06-20',
  'marie-thomas',
  'marie.thomas',
  hash_password('demo123'),
  'marie@example.com',
  generate_short_code(8),
  generate_short_code(8),
  NOW() + INTERVAL '2 years'
);
*/

-- =============================================
-- INSTRUCTIONS
-- =============================================
/*
1. Copy this entire SQL file

2. Go to your Supabase project > SQL Editor

3. Before running, generate your password hash:
   SELECT crypt('your_secure_password', gen_salt('bf', 12));

4. Copy the result (looks like: $2a$12$xxxxx...)

5. Replace in the INSERT statement above:
   - 'YOUR_USERNAME' with your chosen username
   - 'YOUR_PASSWORD_HASH' with the hash you generated
   - 'your@email.com' with your email

6. Run the entire SQL file

7. Verify by running:
   SELECT * FROM god_admins;
*/


  -- HELPER FUNCTIONS

  -- Function to verify password
  CREATE OR REPLACE FUNCTION verify_password(input_password TEXT, stored_hash TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN stored_hash = crypt(input_password, stored_hash);
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Function to hash password
  CREATE OR REPLACE FUNCTION hash_password(password TEXT)
  RETURNS TEXT AS $$
  BEGIN
    RETURN crypt(password, gen_salt('bf', 12));
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- RLS POLICIES (allow all operations)
  ALTER TABLE god_admins ENABLE ROW LEVEL SECURITY;
  ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
  ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE god_access_tokens ENABLE ROW LEVEL SECURITY;
  ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Allow all for god_admins" ON god_admins FOR ALL USING (true);
  CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true);
  CREATE POLICY "Allow all for auth_sessions" ON auth_sessions FOR ALL USING (true);
  CREATE POLICY "Allow all for god_access_tokens" ON god_access_tokens FOR ALL USING (true);
  CREATE POLICY "Allow all for guest_sessions" ON guest_sessions FOR ALL USING (true);
  CREATE POLICY "Allow all for audit_log" ON audit_log FOR ALL USING (true);

  -- INSERT YOUR GOD ADMIN ACCOUNT
  -- Replace 'your_password' with your actual password
  INSERT INTO god_admins (username, password_hash, email)
  VALUES (
    'kevin',
    '$2a$12$iW4DA/8AuXAk4MrBVYP5O.MvPYU60aHETmJWV9kMc.G2wypMFVYX6',
    'kevin@herembourg.fr'
  );