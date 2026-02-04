-- =============================================
-- Reflets de Bonheur - Pending Signups Auto-Cleanup Scheduler
-- =============================================
-- This migration schedules automatic cleanup of expired pending signups
-- Expired records (24h+ old, not completed) are deleted every 6 hours
-- This prevents:
-- - Database bloat (17,280 rows/month at 24 signups/hour)
-- - Security risk (plaintext passwords stored longer than necessary)
-- - Performance degradation (10-20% slower queries per month)
-- - Wasted storage (~500MB after 1 year)

-- =============================================
-- 1. ENHANCE CLEANUP FUNCTION
-- =============================================
-- Update the cleanup function to return count and log results

CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_signups()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired pending signups (24-hour TTL, not completed)
  DELETE FROM public.pending_signups
  WHERE expires_at < NOW() AND completed_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log cleanup if any records were deleted
  IF deleted_count > 0 THEN
    INSERT INTO audit_log (action, actor_type, details)
    VALUES (
      'pending_signups_cleanup',
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
-- 2. CREATE SCHEDULED CLEANUP (via pg_cron)
-- =============================================
-- Note: pg_cron must be enabled in Supabase dashboard
-- Go to Database > Extensions > Enable pg_cron

-- Schedule cleanup to run every 6 hours
-- This ensures expired records are removed within 6 hours of expiration
-- Maximum exposure window for plaintext passwords: 30 hours (24h TTL + 6h cleanup)
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('cleanup-expired-pending-signups');

    -- Schedule cleanup every 6 hours (at 0:00, 6:00, 12:00, 18:00)
    PERFORM cron.schedule(
      'cleanup-expired-pending-signups',
      '0 */6 * * *', -- Every 6 hours at minute 0
      'SELECT public.cleanup_expired_pending_signups()'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available, cleanup will be done via fallback trigger
    RAISE NOTICE 'pg_cron not available. Cleanup will use trigger-based fallback.';
END $$;

-- =============================================
-- 3. ADD TRIGGER FOR FALLBACK CLEANUP
-- =============================================
-- Clean up old records when new ones are created
-- This provides a fallback cleanup mechanism if pg_cron is unavailable

CREATE OR REPLACE FUNCTION trigger_cleanup_pending_signups()
RETURNS TRIGGER AS $$
BEGIN
  -- Run cleanup occasionally (10% chance on each insert)
  -- This prevents performance issues while still cleaning up regularly
  IF random() < 0.1 THEN
    PERFORM public.cleanup_expired_pending_signups();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on pending_signups
DROP TRIGGER IF EXISTS cleanup_on_insert ON public.pending_signups;
CREATE TRIGGER cleanup_on_insert
  AFTER INSERT ON public.pending_signups
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_pending_signups();

-- =============================================
-- 4. CREATE VIEW FOR MONITORING
-- =============================================
-- View to easily monitor pending signups status

CREATE OR REPLACE VIEW pending_signups_status AS
SELECT
  id,
  email,
  slug,
  stripe_session_id,
  stripe_checkout_status,
  created_at,
  expires_at,
  completed_at,
  CASE
    WHEN completed_at IS NOT NULL THEN 'completed'
    WHEN expires_at < NOW() THEN 'expired'
    ELSE 'pending'
  END as status,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600 as hours_until_expiry,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_since_created
FROM public.pending_signups;

-- Grant access to the view
GRANT SELECT ON pending_signups_status TO service_role;

-- =============================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION public.cleanup_expired_pending_signups() IS
  'Deletes expired pending signups (24h+ old, not completed). Returns count of deleted records. Scheduled to run every 6 hours via pg_cron.';

COMMENT ON VIEW pending_signups_status IS
  'Monitoring view for pending signups showing status, expiration time, and age. Use for debugging and observability.';

-- =============================================
-- MANUAL CLEANUP & MONITORING INSTRUCTIONS
-- =============================================
-- If pg_cron is not available, the trigger will clean up occasionally on new inserts
--
-- To manually trigger cleanup:
--   SELECT public.cleanup_expired_pending_signups();
--
-- To view pending signups status:
--   SELECT * FROM pending_signups_status;
--
-- To check cron job status (if pg_cron enabled):
--   SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-pending-signups';
--
-- To view job run history:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-pending-signups')
--   ORDER BY start_time DESC LIMIT 10;
--
-- To count expired pending signups waiting for cleanup:
--   SELECT COUNT(*) FROM pending_signups_status WHERE status = 'expired';
