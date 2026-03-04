-- Migration 011: Add trial account creation RPC
-- Creates accounts with 30-day free trial (no Stripe payment required)

CREATE OR REPLACE FUNCTION public.create_trial_account(
  p_user_id uuid,
  p_email text,
  p_partner1_name text,
  p_partner2_name text,
  p_wedding_date text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_theme_id text DEFAULT 'classic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wedding_id uuid;
  v_couple_names text;
  v_wedding_name text;
  v_trial_end_date timestamptz;
  v_guest_code text;
  v_result jsonb;
BEGIN
  -- Re-validate slug availability (race condition check)
  IF EXISTS (SELECT 1 FROM public.weddings WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Slug already taken: %', p_slug
      USING HINT = 'SLUG_CONFLICT';
  END IF;

  -- Build names
  v_couple_names := p_partner1_name || ' & ' || p_partner2_name;
  v_wedding_name := v_couple_names || '''s Wedding';

  -- Calculate trial end date (30 days from now)
  v_trial_end_date := now() + interval '30 days';

  -- Generate unique guest code (6 chars, avoiding confusing characters)
  v_guest_code := upper(
    translate(
      substring(encode(gen_random_bytes(4), 'base64') from 1 for 6),
      'OIl10+/=',
      'XYZABCDE'
    )
  );

  -- ALL OPERATIONS BELOW ARE IN A SINGLE TRANSACTION
  -- If any step fails, ALL will be rolled back automatically

  -- Step 1: Create or update profile (auth user already created by caller)
  -- NOTE: The handle_new_user trigger on auth.users automatically creates a
  -- bare profile row on INSERT. We use ON CONFLICT to update it with trial data.
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_status,
    subscription_end_date,
    stripe_customer_id
  ) VALUES (
    p_user_id,
    p_email,
    v_couple_names,
    'trial',
    v_trial_end_date,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    subscription_status = EXCLUDED.subscription_status,
    subscription_end_date = EXCLUDED.subscription_end_date;

  -- Step 2: Create wedding
  INSERT INTO public.weddings (
    owner_id,
    slug,
    pin_code,
    name,
    bride_name,
    groom_name,
    wedding_date,
    venue_name,
    venue_address,
    venue_lat,
    venue_lng,
    venue_map_url,
    config,
    hero_image_url,
    is_published
  ) VALUES (
    p_user_id,
    p_slug,
    v_guest_code,
    v_wedding_name,
    p_partner1_name,
    p_partner2_name,
    CASE WHEN p_wedding_date IS NOT NULL AND p_wedding_date != ''
      THEN p_wedding_date::date
      ELSE NULL
    END,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'theme', jsonb_build_object(
        'name', p_theme_id,
        'primaryColor', '#ae1725',
        'secondaryColor', '#c92a38',
        'fontFamily', 'playfair'
      ),
      'features', jsonb_build_object(
        'gallery', true,
        'guestbook', true,
        'rsvp', true,
        'liveWall', false,
        'geoFencing', false
      ),
      'moderation', jsonb_build_object(
        'enabled', true,
        'autoApprove', true
      ),
      'timeline', '[]'::jsonb
    ),
    NULL,
    true
  )
  RETURNING id INTO v_wedding_id;

  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'wedding_id', v_wedding_id,
    'email', p_email,
    'slug', p_slug,
    'couple_names', v_couple_names,
    'guest_code', v_guest_code,
    'trial_ends_at', v_trial_end_date
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Trial account creation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant execution permission to service role
GRANT EXECUTE ON FUNCTION public.create_trial_account(uuid, text, text, text, text, text, text) TO service_role;

COMMENT ON FUNCTION public.create_trial_account IS
'Atomically creates a new trial account (profile + wedding) without payment.
All operations are wrapped in a transaction - if any step fails, everything is rolled back.

IMPORTANT: This function should be called AFTER creating the auth user via Supabase Auth API.
If this function fails, the caller must delete the auth user to prevent orphaned records.

Parameters:
  p_user_id: UUID of the auth.users record (must be created first via Auth API)
  p_email: User email address
  p_partner1_name: First partner name
  p_partner2_name: Second partner name
  p_wedding_date: Wedding date as text (optional)
  p_slug: Wedding URL slug
  p_theme_id: Theme identifier (default: classic)

Returns: JSON with user_id, wedding_id, email, slug, couple_names, guest_code, trial_ends_at
';
