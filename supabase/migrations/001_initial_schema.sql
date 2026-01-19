-- ============================================
-- Reflets de Bonheur - Initial Database Schema
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (Wedding Owners/Couples)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT UNIQUE
);

-- Index for email lookups
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================
-- WEDDINGS TABLE (Events)
-- ============================================
CREATE TABLE weddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- URL & Access
  slug TEXT UNIQUE NOT NULL,
  pin_code VARCHAR(6),
  magic_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Basic Info
  bride_name TEXT NOT NULL,
  groom_name TEXT NOT NULL,
  wedding_date DATE,

  -- Venue
  venue_name TEXT,
  venue_address TEXT,
  venue_lat DECIMAL(10, 8),
  venue_lng DECIMAL(11, 8),
  venue_map_url TEXT,

  -- Configuration (JSONB for flexibility)
  config JSONB DEFAULT '{
    "theme": {
      "name": "classic",
      "primaryColor": "#ae1725",
      "secondaryColor": "#f5f0eb",
      "fontFamily": "serif"
    },
    "features": {
      "gallery": true,
      "guestbook": true,
      "rsvp": true,
      "liveWall": false,
      "geoFencing": false
    },
    "moderation": {
      "enabled": false,
      "autoApprove": true
    },
    "timeline": []
  }'::jsonb,

  -- Media
  hero_image_url TEXT,

  -- Status
  is_published BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_weddings_slug ON weddings(slug);
CREATE INDEX idx_weddings_owner ON weddings(owner_id);
CREATE INDEX idx_weddings_magic_token ON weddings(magic_token);
CREATE INDEX idx_weddings_pin ON weddings(pin_code) WHERE pin_code IS NOT NULL;

-- ============================================
-- MEDIA TABLE (Photos & Videos)
-- ============================================
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,

  -- Uploader info (guest or owner)
  uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_identifier TEXT, -- For anonymous guests (browser fingerprint or session)

  -- Media type
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),

  -- URLs (stored in R2)
  original_url TEXT NOT NULL,
  optimized_url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  caption TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- For videos, in seconds
  file_size INTEGER, -- In bytes
  mime_type TEXT,

  -- Processing status
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  processing_error TEXT,

  -- Moderation
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderated_by UUID REFERENCES profiles(id),

  -- EXIF data (optional, extracted from images)
  exif_data JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_media_wedding ON media(wedding_id);
CREATE INDEX idx_media_status ON media(status);
CREATE INDEX idx_media_moderation ON media(moderation_status);
CREATE INDEX idx_media_created ON media(created_at DESC);
CREATE INDEX idx_media_wedding_approved ON media(wedding_id)
  WHERE status = 'ready' AND moderation_status = 'approved';

-- ============================================
-- GUESTBOOK_MESSAGES TABLE
-- ============================================
CREATE TABLE guestbook_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,

  -- Author info
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_relation TEXT, -- e.g., "Ami du marié", "Cousine de la mariée"
  guest_identifier TEXT,

  -- Message content
  message TEXT NOT NULL,

  -- Moderation
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderated_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_guestbook_wedding ON guestbook_messages(wedding_id);
CREATE INDEX idx_guestbook_created ON guestbook_messages(created_at DESC);
CREATE INDEX idx_guestbook_approved ON guestbook_messages(wedding_id)
  WHERE moderation_status = 'approved';

-- ============================================
-- REACTIONS TABLE (Photo reactions)
-- ============================================
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID REFERENCES media(id) ON DELETE CASCADE NOT NULL,

  -- Reactor info
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guest_identifier TEXT,

  -- Reaction
  emoji TEXT NOT NULL CHECK (emoji IN ('❤️', '😍', '😂', '🥳', '👏', '🔥')),

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one reaction type per user/guest per media
  UNIQUE(media_id, user_id, emoji),
  UNIQUE(media_id, guest_identifier, emoji)
);

-- Indexes
CREATE INDEX idx_reactions_media ON reactions(media_id);

-- ============================================
-- FAVORITES TABLE (User favorites)
-- ============================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID REFERENCES media(id) ON DELETE CASCADE NOT NULL,

  -- Who favorited
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guest_identifier TEXT,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(media_id, user_id),
  UNIQUE(media_id, guest_identifier)
);

-- Indexes
CREATE INDEX idx_favorites_media ON favorites(media_id);
CREATE INDEX idx_favorites_user ON favorites(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- RSVP TABLE
-- ============================================
CREATE TABLE rsvp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,

  -- Guest info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Response
  attendance TEXT NOT NULL CHECK (attendance IN ('yes', 'no', 'maybe')),
  guest_count INTEGER DEFAULT 1, -- Including plus ones
  dietary_restrictions TEXT,

  -- Additional message
  message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rsvp_wedding ON rsvp(wedding_id);
CREATE INDEX idx_rsvp_email ON rsvp(email) WHERE email IS NOT NULL;

-- ============================================
-- ALBUMS TABLE (Photo organization)
-- ============================================
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  cover_media_id UUID REFERENCES media(id) ON DELETE SET NULL,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_albums_wedding ON albums(wedding_id);

-- ============================================
-- ALBUM_MEDIA TABLE (Many-to-many)
-- ============================================
CREATE TABLE album_media (
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  media_id UUID REFERENCES media(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (album_id, media_id)
);

-- ============================================
-- GUEST_SESSIONS TABLE (For PIN/Token auth)
-- ============================================
CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE NOT NULL,

  -- Session info
  session_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  guest_identifier TEXT NOT NULL,
  guest_name TEXT,

  -- Auth method
  auth_method TEXT NOT NULL CHECK (auth_method IN ('pin', 'magic_token', 'qr')),

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_guest_sessions_token ON guest_sessions(session_token);
CREATE INDEX idx_guest_sessions_wedding ON guest_sessions(wedding_id);
CREATE INDEX idx_guest_sessions_expires ON guest_sessions(expires_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weddings_updated_at
  BEFORE UPDATE ON weddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at
  BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvp_updated_at
  BEFORE UPDATE ON rsvp
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_wedding_slug(bride TEXT, groom TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from names (lowercase, hyphenated)
  base_slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        UNACCENT(bride || '-' || groom),
        '[^a-z0-9-]', '', 'g'
      ),
      '-+', '-', 'g'
    )
  );

  -- Trim hyphens from ends
  base_slug := TRIM(BOTH '-' FROM base_slug);

  -- Check if slug exists and add counter if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM weddings WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View for public media (approved and ready)
CREATE VIEW public_media AS
SELECT
  m.*,
  w.slug as wedding_slug,
  (SELECT COUNT(*) FROM reactions r WHERE r.media_id = m.id) as reaction_count,
  (SELECT COUNT(*) FROM favorites f WHERE f.media_id = m.id) as favorite_count
FROM media m
JOIN weddings w ON m.wedding_id = w.id
WHERE m.status = 'ready'
  AND m.moderation_status = 'approved';

-- View for wedding statistics
CREATE VIEW wedding_stats AS
SELECT
  w.id as wedding_id,
  w.slug,
  (SELECT COUNT(*) FROM media m WHERE m.wedding_id = w.id AND m.status = 'ready') as media_count,
  (SELECT COUNT(*) FROM media m WHERE m.wedding_id = w.id AND m.type = 'image' AND m.status = 'ready') as photo_count,
  (SELECT COUNT(*) FROM media m WHERE m.wedding_id = w.id AND m.type = 'video' AND m.status = 'ready') as video_count,
  (SELECT COUNT(*) FROM guestbook_messages g WHERE g.wedding_id = w.id AND g.moderation_status = 'approved') as message_count,
  (SELECT COUNT(*) FROM rsvp r WHERE r.wedding_id = w.id AND r.attendance = 'yes') as rsvp_yes_count,
  (SELECT COUNT(*) FROM rsvp r WHERE r.wedding_id = w.id AND r.attendance = 'no') as rsvp_no_count,
  (SELECT COUNT(*) FROM rsvp r WHERE r.wedding_id = w.id AND r.attendance = 'maybe') as rsvp_maybe_count,
  (SELECT COALESCE(SUM(r.guest_count), 0) FROM rsvp r WHERE r.wedding_id = w.id AND r.attendance = 'yes') as total_guests
FROM weddings w;
