-- Migration 008: Create pending_signups table for Stripe checkout flow
-- Stores wizard data temporarily while user completes Stripe payment

CREATE TABLE IF NOT EXISTS public.pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  email text NOT NULL,
  partner1_name text NOT NULL,
  partner2_name text NOT NULL,
  wedding_date text,
  slug text NOT NULL,
  theme_id text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  stripe_checkout_status text DEFAULT 'pending',

  CONSTRAINT valid_status CHECK (stripe_checkout_status IN ('pending', 'completed', 'failed'))
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pending_signups_stripe_session_id ON public.pending_signups(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_pending_signups_expires_at ON public.pending_signups(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_signups_email ON public.pending_signups(email);
CREATE INDEX IF NOT EXISTS idx_pending_signups_slug ON public.pending_signups(slug);

-- Cleanup function to remove expired pending signups
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_signups()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.pending_signups
  WHERE expires_at < now() AND completed_at IS NULL;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.pending_signups TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_signups() TO service_role;

-- Comment on table
COMMENT ON TABLE public.pending_signups IS 'Stores signup wizard data temporarily during Stripe checkout. Expires after 24 hours. NOTE: Passwords are NOT stored for security - temporary password is generated after payment and password reset email is sent.';
COMMENT ON COLUMN public.pending_signups.stripe_session_id IS 'Stripe checkout session ID for payment verification';
COMMENT ON COLUMN public.pending_signups.expires_at IS 'Auto-expires 24 hours after creation';
COMMENT ON COLUMN public.pending_signups.completed_at IS 'Timestamp when account was created after successful payment';
