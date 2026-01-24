-- RSVP Custom Questions Migration
-- This migration adds support for customizable RSVP questions and enhanced response tracking

-- ============================================
-- RSVP Configuration Table
-- Stores per-wedding RSVP configuration
-- ============================================

CREATE TABLE IF NOT EXISTS public.rsvp_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL UNIQUE,
  enabled boolean DEFAULT true,
  questions jsonb DEFAULT '[]'::jsonb,
  deadline timestamp with time zone,
  welcome_message text,
  thank_you_message text,
  allow_plus_one boolean DEFAULT true,
  ask_dietary_restrictions boolean DEFAULT true,
  max_guests_per_response integer DEFAULT 5 CHECK (max_guests_per_response >= 1 AND max_guests_per_response <= 20),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rsvp_config_pkey PRIMARY KEY (id),
  CONSTRAINT rsvp_config_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE
);

-- Index for quick lookup by wedding
CREATE INDEX IF NOT EXISTS idx_rsvp_config_wedding_id ON public.rsvp_config(wedding_id);

-- Enable RLS
ALTER TABLE public.rsvp_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for rsvp_config
CREATE POLICY "Wedding owners can manage their RSVP config"
  ON public.rsvp_config
  FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Guests can read enabled RSVP config"
  ON public.rsvp_config
  FOR SELECT
  USING (enabled = true);

-- ============================================
-- RSVP Responses Table (Enhanced)
-- Stores guest responses with custom question answers
-- ============================================

CREATE TABLE IF NOT EXISTS public.rsvp_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL,
  respondent_name text NOT NULL CHECK (char_length(respondent_name) <= 100),
  respondent_email text CHECK (char_length(respondent_email) <= 254),
  respondent_phone text CHECK (char_length(respondent_phone) <= 20),
  attendance text NOT NULL CHECK (attendance IN ('yes', 'no', 'maybe')),
  guests jsonb DEFAULT '[]'::jsonb,
  answers jsonb DEFAULT '[]'::jsonb,
  message text CHECK (char_length(message) <= 2000),
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rsvp_responses_pkey PRIMARY KEY (id),
  CONSTRAINT rsvp_responses_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_wedding_id ON public.rsvp_responses(wedding_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_attendance ON public.rsvp_responses(wedding_id, attendance);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_created_at ON public.rsvp_responses(wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_name_search ON public.rsvp_responses USING gin(to_tsvector('french', respondent_name));

-- Enable RLS
ALTER TABLE public.rsvp_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for rsvp_responses
CREATE POLICY "Wedding owners can manage RSVP responses"
  ON public.rsvp_responses
  FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Guests can submit RSVP responses"
  ON public.rsvp_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rsvp_config
      WHERE wedding_id = rsvp_responses.wedding_id
      AND enabled = true
    )
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Function to validate JSON schema for questions
CREATE OR REPLACE FUNCTION validate_rsvp_questions(questions jsonb)
RETURNS boolean AS $$
DECLARE
  question jsonb;
  max_questions constant integer := 20;
  max_options constant integer := 15;
BEGIN
  -- Check array length
  IF jsonb_array_length(questions) > max_questions THEN
    RETURN false;
  END IF;

  -- Validate each question
  FOR question IN SELECT * FROM jsonb_array_elements(questions)
  LOOP
    -- Check required fields
    IF NOT (question ? 'id' AND question ? 'type' AND question ? 'label') THEN
      RETURN false;
    END IF;

    -- Check type is valid
    IF NOT (question->>'type' IN ('text', 'single_choice', 'multiple_choice')) THEN
      RETURN false;
    END IF;

    -- Check options for choice questions
    IF question->>'type' IN ('single_choice', 'multiple_choice') THEN
      IF question ? 'options' THEN
        IF jsonb_array_length(question->'options') > max_options THEN
          RETURN false;
        END IF;
      ELSE
        RETURN false;
      END IF;
    END IF;
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to validate questions
ALTER TABLE public.rsvp_config
ADD CONSTRAINT valid_questions CHECK (validate_rsvp_questions(questions));

-- Function to get RSVP statistics
CREATE OR REPLACE FUNCTION get_rsvp_statistics(p_wedding_id uuid)
RETURNS TABLE (
  total_responses bigint,
  attending bigint,
  not_attending bigint,
  maybe bigint,
  total_guests bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_responses,
    COUNT(*) FILTER (WHERE attendance = 'yes')::bigint as attending,
    COUNT(*) FILTER (WHERE attendance = 'no')::bigint as not_attending,
    COUNT(*) FILTER (WHERE attendance = 'maybe')::bigint as maybe,
    (
      SELECT COALESCE(SUM(jsonb_array_length(guests)), 0)::bigint
      FROM public.rsvp_responses r2
      WHERE r2.wedding_id = p_wedding_id AND r2.attendance = 'yes'
    ) + COUNT(*) FILTER (WHERE attendance = 'yes')::bigint as total_guests
  FROM public.rsvp_responses
  WHERE wedding_id = p_wedding_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- Updated timestamps trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_rsvp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_rsvp_config_updated_at ON public.rsvp_config;
CREATE TRIGGER trigger_rsvp_config_updated_at
  BEFORE UPDATE ON public.rsvp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_rsvp_updated_at();

DROP TRIGGER IF EXISTS trigger_rsvp_responses_updated_at ON public.rsvp_responses;
CREATE TRIGGER trigger_rsvp_responses_updated_at
  BEFORE UPDATE ON public.rsvp_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_rsvp_updated_at();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE public.rsvp_config IS 'Per-wedding RSVP configuration including custom questions';
COMMENT ON COLUMN public.rsvp_config.questions IS 'JSON array of question objects: {id, type, label, description?, required, order, options?, validation?}';
COMMENT ON COLUMN public.rsvp_config.max_guests_per_response IS 'Maximum number of additional guests allowed per RSVP response (1-20)';

COMMENT ON TABLE public.rsvp_responses IS 'Guest RSVP responses with answers to custom questions';
COMMENT ON COLUMN public.rsvp_responses.guests IS 'JSON array of guest objects: {name, dietaryRestrictions?, isChild?}';
COMMENT ON COLUMN public.rsvp_responses.answers IS 'JSON array of answer objects: {questionId, value}';

-- ============================================
-- Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvp_config TO authenticated;
GRANT SELECT, INSERT ON public.rsvp_responses TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.rsvp_responses TO authenticated;

-- Service role has full access
GRANT ALL ON public.rsvp_config TO service_role;
GRANT ALL ON public.rsvp_responses TO service_role;
