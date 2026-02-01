-- Migration: Add status tracking to stripe_events for atomic idempotency
-- This allows tracking event processing state to handle failures and retries

-- Add status column with default 'processing'
ALTER TABLE stripe_events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed'));

-- Add error_message column for failed events
ALTER TABLE stripe_events
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add index for querying by status (useful for retrying failed events)
CREATE INDEX IF NOT EXISTS idx_stripe_events_status ON stripe_events(status);

-- Add comments for documentation
COMMENT ON COLUMN stripe_events.status IS 'Processing status: processing, completed, or failed';
COMMENT ON COLUMN stripe_events.error_message IS 'Error message if processing failed';
