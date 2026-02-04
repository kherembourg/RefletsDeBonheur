-- Migration 009: Add atomic account creation transaction
-- Wraps all account creation steps in a single transaction to prevent orphaned records

-- This function is called AFTER auth user creation via Supabase Auth API
-- It handles profile + wedding creation in a single atomic transaction
CREATE OR REPLACE FUNCTION public.create_account_from_payment(
  p_user_id uuid,
  p_pending_signup_id uuid,
  p_stripe_customer_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wedding_id uuid;
  v_pending_signup record;
  v_couple_names text;
  v_wedding_name text;
  v_subscription_end_date timestamptz;
  v_guest_code text;
  v_result jsonb;
BEGIN
  -- Fetch pending signup data
  SELECT * INTO v_pending_signup
  FROM public.pending_signups
  WHERE id = p_pending_signup_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending signup not found: %', p_pending_signup_id;
  END IF;

  -- Check if already completed (idempotency)
  IF v_pending_signup.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Account already created for this signup'
      USING HINT = 'completed_at=' || v_pending_signup.completed_at::text;
  END IF;

  -- Re-validate slug availability (race condition check)
  IF EXISTS (SELECT 1 FROM public.weddings WHERE slug = v_pending_signup.slug) THEN
    RAISE EXCEPTION 'Slug already taken: %', v_pending_signup.slug
      USING HINT = 'SLUG_CONFLICT_POST_PAYMENT';
  END IF;

  -- Build names
  v_couple_names := v_pending_signup.partner1_name || ' & ' || v_pending_signup.partner2_name;
  v_wedding_name := v_couple_names || '''s Wedding';

  -- Calculate subscription end date (2 years from now)
  v_subscription_end_date := now() + interval '2 years';

  -- Generate unique guest code (6 chars, avoiding confusing characters)
  -- Using a safer character set: ABCDEFGHJKLMNPQRSTUVWXYZ23456789
  v_guest_code := upper(
    translate(
      substring(encode(gen_random_bytes(4), 'base64') from 1 for 6),
      'OIl10+/=',
      'XYZABCDE'
    )
  );

  -- ALL OPERATIONS BELOW ARE IN A SINGLE TRANSACTION
  -- If any step fails, ALL will be rolled back automatically

  -- Step 1: Create profile (auth user already created by caller)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_status,
    subscription_end_date,
    stripe_customer_id
  ) VALUES (
    p_user_id,
    v_pending_signup.email,
    v_couple_names,
    'active', -- Paid account, not trial
    v_subscription_end_date,
    p_stripe_customer_id
  );

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
    v_pending_signup.slug,
    v_guest_code,
    v_wedding_name,
    v_pending_signup.partner1_name,
    v_pending_signup.partner2_name,
    CASE WHEN v_pending_signup.wedding_date IS NOT NULL AND v_pending_signup.wedding_date != ''
      THEN v_pending_signup.wedding_date::date
      ELSE NULL
    END,
    NULL, -- venue_name
    NULL, -- venue_address
    NULL, -- venue_lat
    NULL, -- venue_lng
    NULL, -- venue_map_url
    jsonb_build_object(
      'theme', jsonb_build_object(
        'name', v_pending_signup.theme_id,
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
    NULL, -- hero_image_url
    true  -- is_published
  )
  RETURNING id INTO v_wedding_id;

  -- Step 3: Mark pending signup as completed
  UPDATE public.pending_signups
  SET
    completed_at = now(),
    stripe_checkout_status = 'completed'
  WHERE id = p_pending_signup_id;

  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'wedding_id', v_wedding_id,
    'email', v_pending_signup.email,
    'slug', v_pending_signup.slug,
    'couple_names', v_couple_names,
    'guest_code', v_guest_code
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error details for debugging
    RAISE WARNING 'Account creation transaction failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    -- Re-raise to trigger automatic transaction rollback
    RAISE;
END;
$$;

-- Grant execution permission to service role
GRANT EXECUTE ON FUNCTION public.create_account_from_payment(uuid, uuid, text) TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION public.create_account_from_payment IS
'Atomically creates a new account (profile + wedding) from a pending signup after payment verification.
All operations are wrapped in a transaction - if any step fails, everything is rolled back.
This prevents orphaned profiles or incomplete accounts.

IMPORTANT: This function should be called AFTER creating the auth user via Supabase Auth API.
If this function fails, the caller must delete the auth user to prevent orphaned records.

Parameters:
  p_user_id: UUID of the auth.users record (must be created first via Auth API)
  p_pending_signup_id: ID of the pending_signups record
  p_stripe_customer_id: Stripe customer ID from checkout session (optional)

Returns: JSON with user_id, wedding_id, email, slug, couple_names, guest_code

Throws:
  - Exception if pending_signup not found
  - Exception if already completed (idempotency check)
  - Exception if slug conflict (race condition)
  - Any other database constraint violations will trigger automatic rollback

Usage in API:
  1. Create auth user via adminClient.auth.admin.createUser()
  2. Call this function via adminClient.rpc("create_account_from_payment", {...})
  3. If this function fails, delete the auth user in the catch block
';
