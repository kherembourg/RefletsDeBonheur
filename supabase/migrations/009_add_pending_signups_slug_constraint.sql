-- Migration 009: Add unique constraint on pending_signups slug to prevent race conditions
-- This prevents multiple users from reserving the same slug during checkout

-- Create a unique partial index on slug for active (non-expired, non-completed) signups
-- This acts as a reservation system: only one active checkout can exist per slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_signups_slug_active
ON public.pending_signups(slug)
WHERE completed_at IS NULL AND expires_at > now();

-- Comment on the constraint
COMMENT ON INDEX public.idx_pending_signups_slug_active IS 'Ensures only one active checkout session can reserve a slug at a time. Prevents race condition where two users pay for the same slug.';
