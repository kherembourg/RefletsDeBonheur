-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.album_media (
  album_id uuid NOT NULL,
  media_id uuid NOT NULL,
  sort_order integer DEFAULT 0,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT album_media_pkey PRIMARY KEY (album_id, media_id),
  CONSTRAINT album_media_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id),
  CONSTRAINT album_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id)
);
CREATE TABLE public.albums (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  wedding_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  cover_media_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT albums_pkey PRIMARY KEY (id),
  CONSTRAINT albums_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id),
  CONSTRAINT albums_cover_media_id_fkey FOREIGN KEY (cover_media_id) REFERENCES public.media(id)
);
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_type text CHECK (actor_type = ANY (ARRAY['god'::text, 'client'::text, 'guest'::text, 'system'::text])),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.auth_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type = ANY (ARRAY['god'::text, 'client'::text, 'guest'::text])),
  token text NOT NULL UNIQUE,
  refresh_token text UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  refresh_expires_at timestamp with time zone,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  revoked_reason text,
  CONSTRAINT auth_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  media_id uuid NOT NULL,
  user_id uuid,
  guest_identifier text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.god_access_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  god_admin_id uuid NOT NULL,
  wedding_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  used_count integer DEFAULT 0,
  ip_address text,
  max_uses integer DEFAULT 1,
  CONSTRAINT god_access_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT god_access_tokens_god_admin_id_fkey FOREIGN KEY (god_admin_id) REFERENCES public.god_admins(id),
  CONSTRAINT god_access_tokens_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id)
);
CREATE TABLE public.god_admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  last_login_at timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT god_admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.guest_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  wedding_id uuid NOT NULL,
  session_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'::text) UNIQUE,
  guest_identifier text NOT NULL,
  guest_name text,
  auth_method text NOT NULL CHECK (auth_method = ANY (ARRAY['pin'::text, 'magic_token'::text, 'qr'::text])),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '30 days'::interval),
  created_at timestamp with time zone DEFAULT now(),
  last_active_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guest_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT guest_sessions_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id)
);
CREATE TABLE public.guestbook_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  wedding_id uuid NOT NULL,
  author_id uuid,
  author_name text NOT NULL,
  author_relation text,
  guest_identifier text,
  message text NOT NULL,
  moderation_status text DEFAULT 'approved'::text CHECK (moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  moderated_at timestamp with time zone,
  moderated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guestbook_messages_pkey PRIMARY KEY (id),
  CONSTRAINT guestbook_messages_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id),
  CONSTRAINT guestbook_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id),
  CONSTRAINT guestbook_messages_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.media (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  wedding_id uuid NOT NULL,
  uploader_id uuid,
  guest_name text,
  guest_identifier text,
  type text NOT NULL CHECK (type = ANY (ARRAY['image'::text, 'video'::text])),
  original_url text NOT NULL,
  optimized_url text,
  thumbnail_url text,
  caption text,
  width integer,
  height integer,
  duration integer,
  file_size integer,
  mime_type text,
  status text DEFAULT 'uploading'::text CHECK (status = ANY (ARRAY['uploading'::text, 'processing'::text, 'ready'::text, 'error'::text])),
  processing_error text,
  moderation_status text DEFAULT 'pending'::text CHECK (moderation_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  moderated_at timestamp with time zone,
  moderated_by uuid,
  exif_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT media_pkey PRIMARY KEY (id),
  CONSTRAINT media_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id),
  CONSTRAINT media_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.profiles(id),
  CONSTRAINT media_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  subscription_status text DEFAULT 'trial'::text CHECK (subscription_status = ANY (ARRAY['trial'::text, 'active'::text, 'expired'::text, 'cancelled'::text])),
  subscription_end_date timestamp with time zone,
  stripe_customer_id text UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.reactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  media_id uuid NOT NULL,
  user_id uuid,
  guest_identifier text,
  emoji text NOT NULL CHECK (emoji = ANY (ARRAY['❤️'::text, '😍'::text, '😂'::text, '🥳'::text, '👏'::text, '🔥'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reactions_pkey PRIMARY KEY (id),
  CONSTRAINT reactions_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media(id),
  CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
-- Legacy RSVP table (kept for backwards compatibility)
CREATE TABLE public.rsvp (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  wedding_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  attendance text NOT NULL CHECK (attendance = ANY (ARRAY['yes'::text, 'no'::text, 'maybe'::text])),
  guest_count integer DEFAULT 1,
  dietary_restrictions text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rsvp_pkey PRIMARY KEY (id),
  CONSTRAINT rsvp_wedding_id_fkey FOREIGN KEY (wedding_id) REFERENCES public.weddings(id)
);

-- RSVP Configuration (per-wedding settings and custom questions)
CREATE TABLE public.rsvp_config (
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

-- RSVP Responses (enhanced with custom question answers)
CREATE TABLE public.rsvp_responses (
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
CREATE TABLE public.weddings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  pin_code character varying,
  magic_token text NOT NULL DEFAULT (gen_random_uuid())::text UNIQUE,
  bride_name text NOT NULL,
  groom_name text NOT NULL,
  wedding_date date,
  venue_name text,
  venue_address text,
  venue_lat numeric,
  venue_lng numeric,
  venue_map_url text,
  config jsonb DEFAULT '{"theme": {"name": "classic", "fontFamily": "serif", "primaryColor": "#ae1725", "secondaryColor": "#f5f0eb"}, "features": {"rsvp": true, "gallery": true, "liveWall": false, "guestbook": true, "geoFencing": false}, "timeline": [], "moderation": {"enabled": false, "autoApprove": true}}'::jsonb,
  hero_image_url text,
  is_published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  name text,
  CONSTRAINT weddings_pkey PRIMARY KEY (id),
  CONSTRAINT weddings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);