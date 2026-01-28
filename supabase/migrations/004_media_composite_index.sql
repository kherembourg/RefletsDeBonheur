-- Migration: Add composite index for media queries
-- Purpose: Optimize trial limit count queries that filter by (wedding_id, type)
-- Created: 2026-01-28

-- Add composite index for more efficient media counting queries
-- This index supports queries like:
--   SELECT COUNT(*) FROM media WHERE wedding_id = ? AND type = 'photo'
-- Used by /api/upload/presign.ts for trial limit enforcement

CREATE INDEX IF NOT EXISTS idx_media_wedding_type ON media(wedding_id, type);

-- Note: The existing idx_media_wedding index on (wedding_id) is still useful
-- for queries that don't filter by type, so we keep both indexes.
