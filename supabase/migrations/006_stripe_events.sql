-- Migration: Add stripe_events table for webhook idempotency
-- This table tracks processed Stripe webhook events to prevent duplicate processing

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by Stripe event ID
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON stripe_events(stripe_event_id);

-- Index for querying by event type (useful for debugging)
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(type);

-- Add comment for documentation
COMMENT ON TABLE stripe_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN stripe_events.stripe_event_id IS 'Unique event ID from Stripe (e.g., evt_1abc123)';
COMMENT ON COLUMN stripe_events.type IS 'Event type (e.g., checkout.session.completed)';
COMMENT ON COLUMN stripe_events.processed_at IS 'When the event was successfully processed';
