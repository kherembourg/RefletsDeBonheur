-- =============================================
-- Reflets de Bonheur - God Token TTL Auto-Cleanup
-- =============================================
-- This migration adds automatic cleanup of expired god access tokens
-- Tokens expire after 24 hours (TTL)

-- =============================================
-- 1. UPDATE CLEANUP FUNCTION
-- =============================================
-- Enhance the cleanup function to be more comprehensive

CREATE OR REPLACE FUNCTION cleanup_expired_god_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired god access tokens (24-hour TTL)
  DELETE FROM god_access_tokens
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log cleanup if any tokens were deleted
  IF deleted_count > 0 THEN
    INSERT INTO audit_log (action, actor_type, details)
    VALUES (
      'god_tokens_ttl_cleanup',
      'system',
      jsonb_build_object(
        'deleted_count', deleted_count,
        'cleanup_time', NOW()
      )
    );
  END IF;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. CREATE SCHEDULED CLEANUP (via pg_cron if available)
-- =============================================
-- Note: pg_cron must be enabled in Supabase dashboard
-- Go to Database > Extensions > Enable pg_cron

-- Schedule cleanup to run every hour
-- This ensures expired tokens are removed within an hour of expiration
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('cleanup-god-tokens');

    -- Schedule hourly cleanup
    PERFORM cron.schedule(
      'cleanup-god-tokens',
      '0 * * * *', -- Every hour at minute 0
      'SELECT cleanup_expired_god_tokens()'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available, cleanup will be done manually or via app
    RAISE NOTICE 'pg_cron not available. Cleanup must be triggered manually.';
END $$;

-- =============================================
-- 3. ADD TRIGGER FOR CLEANUP ON INSERT
-- =============================================
-- Clean up old tokens when new ones are created
-- This provides a fallback cleanup mechanism

CREATE OR REPLACE FUNCTION trigger_cleanup_expired_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run cleanup occasionally (1% chance on each insert)
  -- This prevents performance issues while still cleaning up
  IF random() < 0.01 THEN
    PERFORM cleanup_expired_god_tokens();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on god_access_tokens
DROP TRIGGER IF EXISTS cleanup_on_insert ON god_access_tokens;
CREATE TRIGGER cleanup_on_insert
  AFTER INSERT ON god_access_tokens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_expired_tokens();

-- =============================================
-- 4. ADD INDEX FOR FASTER EXPIRATION QUERIES
-- =============================================
-- Index to speed up expiration-based queries and cleanup

CREATE INDEX IF NOT EXISTS idx_god_access_tokens_expires_at
ON god_access_tokens(expires_at);

-- =============================================
-- 5. CREATE VIEW FOR MONITORING
-- =============================================
-- View to easily monitor token status

CREATE OR REPLACE VIEW god_tokens_status AS
SELECT
  id,
  god_admin_id,
  wedding_id,
  created_at,
  expires_at,
  used_at,
  used_count,
  max_uses,
  CASE
    WHEN expires_at < NOW() THEN 'expired'
    WHEN used_count >= max_uses THEN 'exhausted'
    ELSE 'active'
  END as status,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry
FROM god_access_tokens;

-- Grant access to the view
GRANT SELECT ON god_tokens_status TO authenticated;
GRANT SELECT ON god_tokens_status TO service_role;

-- =============================================
-- MANUAL CLEANUP INSTRUCTIONS
-- =============================================
-- If pg_cron is not available, you can:
-- 1. Call cleanup_expired_god_tokens() manually via SQL
-- 2. Set up an external cron job that calls the Supabase API
-- 3. The trigger will clean up occasionally on new inserts
--
-- To manually trigger cleanup:
-- SELECT cleanup_expired_god_tokens();
--
-- To view token status:
-- SELECT * FROM god_tokens_status;
