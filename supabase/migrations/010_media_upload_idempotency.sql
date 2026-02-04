-- Migration: Add unique constraint for upload deduplication
-- Prevents duplicate media records with same wedding_id + original_url
-- Part of transaction boundary fix (TODO #031)

-- Add unique constraint to prevent duplicates at DB level
ALTER TABLE media
ADD CONSTRAINT unique_wedding_original_url
UNIQUE (wedding_id, original_url);

-- Add index for performance on idempotency checks
-- This index supports the query in confirm.ts:
-- SELECT * FROM media WHERE wedding_id = ? AND original_url = ?
CREATE INDEX IF NOT EXISTS idx_media_wedding_original_url
ON media (wedding_id, original_url);
