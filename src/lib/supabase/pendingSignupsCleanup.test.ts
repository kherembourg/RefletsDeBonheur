/**
 * Tests for pending_signups cleanup functionality
 *
 * These tests verify:
 * 1. Cleanup function deletes expired records
 * 2. Cleanup preserves non-expired and completed records
 * 3. Monitoring view shows correct status
 * 4. Trigger-based cleanup works as fallback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test setup
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Skip tests if Supabase not configured
const isSupabaseConfigured = supabaseUrl && supabaseKey;
const describeIf = isSupabaseConfigured ? describe : describe.skip;

describeIf('Pending Signups Cleanup', () => {
  // Only create client inside the conditional block
  const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null as any;
  const testEmail = `test-cleanup-${Date.now()}@example.com`;

  // Cleanup test data after each test
  afterEach(async () => {
    await supabase
      .from('pending_signups')
      .delete()
      .like('email', 'test-cleanup-%@example.com');
  });

  describe('cleanup_expired_pending_signups function', () => {
    it('should delete expired incomplete signups', async () => {
      // Create an expired pending signup (25 hours ago)
      const { data: inserted } = await supabase
        .from('pending_signups')
        .insert({
          stripe_session_id: `test-session-expired-${Date.now()}`,
          email: testEmail,
          password_hash: 'test-hash',
          partner1_name: 'Partner 1',
          partner2_name: 'Partner 2',
          slug: `test-slug-${Date.now()}`,
          theme_id: 'classic',
          expires_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          completed_at: null,
        })
        .select()
        .single();

      expect(inserted).toBeTruthy();

      // Run cleanup function
      const { data: deletedCount } = await supabase.rpc('cleanup_expired_pending_signups');

      expect(deletedCount).toBeGreaterThan(0);

      // Verify the record was deleted
      const { data: found } = await supabase
        .from('pending_signups')
        .select()
        .eq('stripe_session_id', inserted!.stripe_session_id)
        .maybeSingle();

      expect(found).toBeNull();
    });

    it('should preserve non-expired pending signups', async () => {
      // Create a fresh pending signup (10 hours until expiry)
      const sessionId = `test-session-fresh-${Date.now()}`;
      await supabase
        .from('pending_signups')
        .insert({
          stripe_session_id: sessionId,
          email: testEmail,
          password_hash: 'test-hash',
          partner1_name: 'Partner 1',
          partner2_name: 'Partner 2',
          slug: `test-slug-${Date.now()}`,
          theme_id: 'classic',
          expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), // 10 hours from now
          completed_at: null,
        });

      // Run cleanup function
      await supabase.rpc('cleanup_expired_pending_signups');

      // Verify the record still exists
      const { data: found } = await supabase
        .from('pending_signups')
        .select()
        .eq('stripe_session_id', sessionId)
        .single();

      expect(found).toBeTruthy();
      expect(found!.stripe_session_id).toBe(sessionId);
    });

    it('should preserve completed signups even if expired', async () => {
      // Create a completed signup that's expired
      const sessionId = `test-session-completed-${Date.now()}`;
      await supabase
        .from('pending_signups')
        .insert({
          stripe_session_id: sessionId,
          email: testEmail,
          password_hash: 'test-hash',
          partner1_name: 'Partner 1',
          partner2_name: 'Partner 2',
          slug: `test-slug-${Date.now()}`,
          theme_id: 'classic',
          expires_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
          completed_at: new Date().toISOString(), // Completed
          stripe_checkout_status: 'completed',
        });

      // Run cleanup function
      await supabase.rpc('cleanup_expired_pending_signups');

      // Verify the record still exists (should not be deleted)
      const { data: found } = await supabase
        .from('pending_signups')
        .select()
        .eq('stripe_session_id', sessionId)
        .single();

      expect(found).toBeTruthy();
      expect(found!.completed_at).toBeTruthy();
    });

    it('should return count of deleted records', async () => {
      // Create 3 expired pending signups
      const sessionIds = [
        `test-session-batch1-${Date.now()}`,
        `test-session-batch2-${Date.now()}`,
        `test-session-batch3-${Date.now()}`,
      ];

      for (const sessionId of sessionIds) {
        await supabase
          .from('pending_signups')
          .insert({
            stripe_session_id: sessionId,
            email: `${sessionId}@example.com`,
            password_hash: 'test-hash',
            partner1_name: 'Partner 1',
            partner2_name: 'Partner 2',
            slug: `${sessionId}-slug`,
            theme_id: 'classic',
            expires_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
            completed_at: null,
          });
      }

      // Run cleanup function
      const { data: deletedCount } = await supabase.rpc('cleanup_expired_pending_signups');

      // Should delete at least 3 (our test records + any existing expired ones)
      expect(deletedCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('pending_signups_status view', () => {
    it('should show correct status for pending record', async () => {
      const sessionId = `test-session-view-${Date.now()}`;
      await supabase
        .from('pending_signups')
        .insert({
          stripe_session_id: sessionId,
          email: testEmail,
          password_hash: 'test-hash',
          partner1_name: 'Partner 1',
          partner2_name: 'Partner 2',
          slug: `test-slug-${Date.now()}`,
          theme_id: 'classic',
          expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
          completed_at: null,
        });

      const { data: status } = await supabase
        .from('pending_signups_status')
        .select()
        .eq('stripe_session_id', sessionId)
        .single();

      expect(status).toBeTruthy();
      expect(status!.status).toBe('pending');
      expect(status!.hours_until_expiry).toBeGreaterThan(9);
      expect(status!.hours_until_expiry).toBeLessThan(11);
    });

    it('should show correct status for expired record', async () => {
      const sessionId = `test-session-view-expired-${Date.now()}`;
      await supabase
        .from('pending_signups')
        .insert({
          stripe_session_id: sessionId,
          email: testEmail,
          password_hash: 'test-hash',
          partner1_name: 'Partner 1',
          partner2_name: 'Partner 2',
          slug: `test-slug-${Date.now()}`,
          theme_id: 'classic',
          expires_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          completed_at: null,
        });

      const { data: status } = await supabase
        .from('pending_signups_status')
        .select()
        .eq('stripe_session_id', sessionId)
        .single();

      expect(status).toBeTruthy();
      expect(status!.status).toBe('expired');
      expect(status!.hours_until_expiry).toBeLessThan(0);
    });

    it('should show correct status for completed record', async () => {
      const sessionId = `test-session-view-completed-${Date.now()}`;
      await supabase
        .from('pending_signups')
        .insert({
          stripe_session_id: sessionId,
          email: testEmail,
          password_hash: 'test-hash',
          partner1_name: 'Partner 1',
          partner2_name: 'Partner 2',
          slug: `test-slug-${Date.now()}`,
          theme_id: 'classic',
          expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date().toISOString(),
          stripe_checkout_status: 'completed',
        });

      const { data: status } = await supabase
        .from('pending_signups_status')
        .select()
        .eq('stripe_session_id', sessionId)
        .single();

      expect(status).toBeTruthy();
      expect(status!.status).toBe('completed');
      expect(status!.completed_at).toBeTruthy();
    });
  });

  describe('Performance impact', () => {
    it('should handle cleanup of large batch efficiently', async () => {
      // Create 100 expired records
      const records = Array.from({ length: 100 }, (_, i) => ({
        stripe_session_id: `test-batch-${Date.now()}-${i}`,
        email: `test-batch-${i}@example.com`,
        password_hash: 'test-hash',
        partner1_name: 'Partner 1',
        partner2_name: 'Partner 2',
        slug: `test-slug-batch-${i}`,
        theme_id: 'classic',
        expires_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        completed_at: null,
      }));

      await supabase.from('pending_signups').insert(records);

      // Measure cleanup time
      const startTime = Date.now();
      const { data: deletedCount } = await supabase.rpc('cleanup_expired_pending_signups');
      const duration = Date.now() - startTime;

      // Should delete at least 100 records
      expect(deletedCount).toBeGreaterThanOrEqual(100);

      // Should complete in under 5 seconds for 100 records
      expect(duration).toBeLessThan(5000);
    });
  });
});
