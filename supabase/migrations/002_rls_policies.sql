-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- WEDDINGS POLICIES
-- ============================================

-- Owners can view their own weddings
CREATE POLICY "Owners can view own weddings"
  ON weddings FOR SELECT
  USING (owner_id = auth.uid());

-- Owners can create weddings
CREATE POLICY "Owners can create weddings"
  ON weddings FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their own weddings
CREATE POLICY "Owners can update own weddings"
  ON weddings FOR UPDATE
  USING (owner_id = auth.uid());

-- Owners can delete their own weddings
CREATE POLICY "Owners can delete own weddings"
  ON weddings FOR DELETE
  USING (owner_id = auth.uid());

-- Published weddings can be viewed by anyone (for guest access)
CREATE POLICY "Anyone can view published weddings by slug"
  ON weddings FOR SELECT
  USING (is_published = TRUE);

-- ============================================
-- MEDIA POLICIES
-- ============================================

-- Owners can view all media for their weddings
CREATE POLICY "Owners can view all media"
  ON media FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- Guests can view approved media
CREATE POLICY "Guests can view approved media"
  ON media FOR SELECT
  USING (
    status = 'ready'
    AND moderation_status = 'approved'
  );

-- Owners can insert media
CREATE POLICY "Owners can insert media"
  ON media FOR INSERT
  WITH CHECK (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- Anyone can insert media (guests upload) - will need service role for actual upload
CREATE POLICY "Anyone can insert media to published weddings"
  ON media FOR INSERT
  WITH CHECK (
    wedding_id IN (
      SELECT id FROM weddings WHERE is_published = TRUE
    )
  );

-- Owners can update media
CREATE POLICY "Owners can update media"
  ON media FOR UPDATE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- Owners can delete media
CREATE POLICY "Owners can delete media"
  ON media FOR DELETE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- GUESTBOOK_MESSAGES POLICIES
-- ============================================

-- Owners can view all messages for their weddings
CREATE POLICY "Owners can view all messages"
  ON guestbook_messages FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- Guests can view approved messages
CREATE POLICY "Guests can view approved messages"
  ON guestbook_messages FOR SELECT
  USING (moderation_status = 'approved');

-- Anyone can insert messages to published weddings
CREATE POLICY "Anyone can insert messages"
  ON guestbook_messages FOR INSERT
  WITH CHECK (
    wedding_id IN (
      SELECT id FROM weddings WHERE is_published = TRUE
    )
  );

-- Owners can update messages (moderation)
CREATE POLICY "Owners can update messages"
  ON guestbook_messages FOR UPDATE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- Owners can delete messages
CREATE POLICY "Owners can delete messages"
  ON guestbook_messages FOR DELETE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- REACTIONS POLICIES
-- ============================================

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
  ON reactions FOR SELECT
  USING (TRUE);

-- Authenticated users can add reactions
CREATE POLICY "Users can add reactions"
  ON reactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR guest_identifier IS NOT NULL);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- FAVORITES POLICIES
-- ============================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (user_id = auth.uid() OR guest_identifier IS NOT NULL);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (user_id = auth.uid() OR guest_identifier IS NOT NULL);

-- Users can remove their own favorites
CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- RSVP POLICIES
-- ============================================

-- Owners can view RSVPs for their weddings
CREATE POLICY "Owners can view RSVPs"
  ON rsvp FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- Anyone can submit RSVP to published weddings
CREATE POLICY "Anyone can submit RSVP"
  ON rsvp FOR INSERT
  WITH CHECK (
    wedding_id IN (
      SELECT id FROM weddings WHERE is_published = TRUE
    )
  );

-- Users can update their own RSVP (by email match)
CREATE POLICY "Users can update own RSVP"
  ON rsvp FOR UPDATE
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Owners can delete RSVPs
CREATE POLICY "Owners can delete RSVPs"
  ON rsvp FOR DELETE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- ALBUMS POLICIES
-- ============================================

-- Owners can manage albums
CREATE POLICY "Owners can view albums"
  ON albums FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- Guests can view albums of published weddings
CREATE POLICY "Guests can view albums"
  ON albums FOR SELECT
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE is_published = TRUE
    )
  );

CREATE POLICY "Owners can create albums"
  ON albums FOR INSERT
  WITH CHECK (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update albums"
  ON albums FOR UPDATE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete albums"
  ON albums FOR DELETE
  USING (
    wedding_id IN (
      SELECT id FROM weddings WHERE owner_id = auth.uid()
    )
  );

-- ============================================
-- ALBUM_MEDIA POLICIES
-- ============================================

-- Owners can manage album media
CREATE POLICY "Owners can view album media"
  ON album_media FOR SELECT
  USING (
    album_id IN (
      SELECT a.id FROM albums a
      JOIN weddings w ON a.wedding_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- Guests can view album media of published weddings
CREATE POLICY "Guests can view album media"
  ON album_media FOR SELECT
  USING (
    album_id IN (
      SELECT a.id FROM albums a
      JOIN weddings w ON a.wedding_id = w.id
      WHERE w.is_published = TRUE
    )
  );

CREATE POLICY "Owners can add album media"
  ON album_media FOR INSERT
  WITH CHECK (
    album_id IN (
      SELECT a.id FROM albums a
      JOIN weddings w ON a.wedding_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete album media"
  ON album_media FOR DELETE
  USING (
    album_id IN (
      SELECT a.id FROM albums a
      JOIN weddings w ON a.wedding_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- ============================================
-- GUEST_SESSIONS POLICIES
-- ============================================

-- Only service role can manage guest sessions
-- (handled via API, not direct client access)
CREATE POLICY "Service role only for guest sessions"
  ON guest_sessions FOR ALL
  USING (FALSE);
