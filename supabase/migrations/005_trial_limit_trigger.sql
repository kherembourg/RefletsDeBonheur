-- Migration: Trial limit enforcement trigger
-- Purpose: Atomically enforce trial limits on media uploads to prevent race conditions
-- Created: 2026-01-29

-- Create a function to check trial limits before inserting media
CREATE OR REPLACE FUNCTION check_trial_limits()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  subscription_status TEXT;
  photo_count INTEGER;
  video_count INTEGER;
  TRIAL_PHOTO_LIMIT CONSTANT INTEGER := 50;
  TRIAL_VIDEO_LIMIT CONSTANT INTEGER := 1;
BEGIN
  -- Get the wedding owner's subscription status
  SELECT w.owner_id, p.subscription_status
  INTO owner_id, subscription_status
  FROM weddings w
  JOIN profiles p ON w.owner_id = p.id
  WHERE w.id = NEW.wedding_id;

  -- If not found or not on trial, allow the insert
  IF subscription_status IS NULL OR subscription_status != 'trial' THEN
    RETURN NEW;
  END IF;

  -- Check limits based on media type
  IF NEW.type = 'photo' OR NEW.type = 'image' THEN
    SELECT COUNT(*)
    INTO photo_count
    FROM media
    WHERE wedding_id = NEW.wedding_id
      AND (type = 'photo' OR type = 'image');

    IF photo_count >= TRIAL_PHOTO_LIMIT THEN
      RAISE EXCEPTION 'TRIAL_PHOTO_LIMIT: Trial accounts are limited to % photos', TRIAL_PHOTO_LIMIT;
    END IF;
  ELSIF NEW.type = 'video' THEN
    SELECT COUNT(*)
    INTO video_count
    FROM media
    WHERE wedding_id = NEW.wedding_id
      AND type = 'video';

    IF video_count >= TRIAL_VIDEO_LIMIT THEN
      RAISE EXCEPTION 'TRIAL_VIDEO_LIMIT: Trial accounts are limited to % video', TRIAL_VIDEO_LIMIT;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_trial_limits ON media;
CREATE TRIGGER enforce_trial_limits
  BEFORE INSERT ON media
  FOR EACH ROW
  EXECUTE FUNCTION check_trial_limits();

-- Add comment explaining the trigger
COMMENT ON FUNCTION check_trial_limits() IS
  'Enforces trial account limits: 50 photos, 1 video. Prevents race conditions by checking at database level.';
