# Database Maintenance Guide

## Automated Cleanup Jobs

### Pending Signups Cleanup

**Purpose:** Automatically removes expired pending signups to prevent database bloat and security risks.

**Schedule:** Every 6 hours (0:00, 6:00, 12:00, 18:00 UTC)

**Implementation:** Migration `009_schedule_pending_signups_cleanup.sql`

#### What Gets Cleaned Up

The cleanup job deletes records from `pending_signups` that meet ALL of these conditions:
- `expires_at < NOW()` (older than 24 hours)
- `completed_at IS NULL` (checkout was never completed)

Records that are **preserved**:
- Active pending signups (not yet expired)
- Completed signups (regardless of expiration)

#### Why This Matters

Without cleanup, expired pending signups accumulate:
- **Database bloat**: 17,280 rows/month at 24 signups/hour
- **Security risk**: Plaintext passwords stored longer than necessary
- **Performance degradation**: 10-20% slower queries per month
- **Wasted storage**: ~500MB after 1 year

#### Monitoring Cleanup Status

Check if cleanup job is scheduled (requires pg_cron extension):

```sql
SELECT * FROM cron.job
WHERE jobname = 'cleanup-expired-pending-signups';
```

View recent cleanup runs:

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'cleanup-expired-pending-signups'
)
ORDER BY start_time DESC
LIMIT 10;
```

View current pending signups status:

```sql
SELECT * FROM pending_signups_status;
```

Count expired records waiting for cleanup:

```sql
SELECT COUNT(*) FROM pending_signups_status
WHERE status = 'expired';
```

#### Manual Cleanup

If you need to run cleanup manually:

```sql
SELECT public.cleanup_expired_pending_signups();
```

This returns the count of deleted records.

#### Fallback Mechanism

If `pg_cron` is not available, a trigger provides fallback cleanup:
- Runs with 10% probability on each INSERT to `pending_signups`
- Prevents performance issues while maintaining cleanup
- Less predictable but ensures cleanup happens eventually

### God Access Tokens Cleanup

**Purpose:** Removes expired god admin impersonation tokens.

**Schedule:** Every hour

**Implementation:** Migration `003_god_token_ttl_cleanup.sql`

**Token TTL:** 24 hours

#### Monitoring

View token status:

```sql
SELECT * FROM god_tokens_status;
```

Manual cleanup:

```sql
SELECT cleanup_expired_god_tokens();
```

## Database Health Checks

### Check Table Sizes

Monitor table growth to detect bloat:

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

### Check Index Efficiency

Identify unused or bloated indexes:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### Vacuum Statistics

Check when tables were last vacuumed:

```sql
SELECT
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum,
  n_dead_tup,
  n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;
```

## Performance Monitoring

### Slow Queries

Monitor slow queries in Supabase dashboard:
1. Go to Database > Query Performance
2. Filter by execution time > 1000ms
3. Analyze query plans for optimization

### Connection Pooling

Check active connections:

```sql
SELECT
  COUNT(*) as total_connections,
  state,
  wait_event_type
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state, wait_event_type;
```

## Troubleshooting

### Cleanup Not Running

**Symptom:** Expired records accumulating

**Check:**

1. Verify pg_cron is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check job status:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-pending-signups';
   ```

3. Check for errors in job runs:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE status = 'failed'
   ORDER BY start_time DESC LIMIT 10;
   ```

**Fix:**

If pg_cron is not enabled, enable it in Supabase dashboard:
- Go to Database > Extensions
- Search for "pg_cron"
- Click "Enable"

If job is not scheduled, re-run migration:
```sql
-- Unschedule first if exists
SELECT cron.unschedule('cleanup-expired-pending-signups');

-- Reschedule
SELECT cron.schedule(
  'cleanup-expired-pending-signups',
  '0 */6 * * *',
  'SELECT public.cleanup_expired_pending_signups()'
);
```

### Cleanup Running Too Slowly

**Symptom:** Cleanup takes > 5 seconds for typical workload

**Check:**

1. Count pending signups:
   ```sql
   SELECT COUNT(*) FROM pending_signups;
   ```

2. Check index health:
   ```sql
   SELECT * FROM pg_stat_user_indexes
   WHERE tablename = 'pending_signups';
   ```

**Fix:**

If indexes are bloated, reindex:
```sql
REINDEX TABLE pending_signups;
```

### Trigger Not Firing

**Symptom:** Fallback cleanup not working

**Check:**

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'pending_signups';
```

**Fix:**

Re-create trigger from migration 009.

## Best Practices

1. **Monitor regularly**: Check cleanup status weekly
2. **Set up alerts**: Configure Supabase alerts for table size growth
3. **Review logs**: Check job run history for failures
4. **Test cleanup**: Manually verify cleanup works after major changes
5. **Document changes**: Update this guide when modifying cleanup logic

## Related Documentation

- [Migration 009: Pending Signups Cleanup](../supabase/migrations/009_schedule_pending_signups_cleanup.sql)
- [Migration 003: God Token Cleanup](../supabase/migrations/003_god_token_ttl_cleanup.sql)
- [Pending Signups Cleanup Tests](../src/lib/supabase/pendingSignupsCleanup.test.ts)
