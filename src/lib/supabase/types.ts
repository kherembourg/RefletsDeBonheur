// ============================================
// Database Types for Supabase
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================
// Enums
// ============================================

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type MediaType = 'image' | 'video';
export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'error';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceStatus = 'yes' | 'no' | 'maybe';
export type AuthMethod = 'pin' | 'magic_token' | 'qr';
export type ReactionEmoji = '❤️' | '😍' | '😂' | '🥳' | '👏' | '🔥';

// ============================================
// Theme Configuration
// ============================================

export interface ThemeConfig {
  name: 'classic' | 'luxe' | 'minimal' | 'rustic';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface FeaturesConfig {
  gallery: boolean;
  guestbook: boolean;
  rsvp: boolean;
  liveWall: boolean;
  geoFencing: boolean;
}

export interface ModerationConfig {
  enabled: boolean;
  autoApprove: boolean;
}

export interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  icon?: string;
}

export interface WeddingConfig {
  theme: ThemeConfig;
  features: FeaturesConfig;
  moderation: ModerationConfig;
  timeline: TimelineEvent[];
}

// ============================================
// Database Tables
// ============================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  subscription_status: SubscriptionStatus;
  subscription_end_date: string | null;
  stripe_customer_id: string | null;
}

export interface Wedding {
  id: string;
  owner_id: string;
  slug: string;
  pin_code: string | null;
  magic_token: string;
  name: string | null;
  bride_name: string;
  groom_name: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  venue_map_url: string | null;
  config: WeddingConfig;
  hero_image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Media {
  id: string;
  wedding_id: string;
  uploader_id: string | null;
  guest_name: string | null;
  guest_identifier: string | null;
  type: MediaType;
  original_url: string;
  optimized_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  file_size: number | null;
  mime_type: string | null;
  status: MediaStatus;
  processing_error: string | null;
  moderation_status: ModerationStatus;
  moderated_at: string | null;
  moderated_by: string | null;
  exif_data: Json;
  created_at: string;
  updated_at: string;
}

export interface GuestbookMessage {
  id: string;
  wedding_id: string;
  author_id: string | null;
  author_name: string;
  author_relation: string | null;
  guest_identifier: string | null;
  message: string;
  moderation_status: ModerationStatus;
  moderated_at: string | null;
  moderated_by: string | null;
  created_at: string;
}

export interface Reaction {
  id: string;
  media_id: string;
  user_id: string | null;
  guest_identifier: string | null;
  emoji: ReactionEmoji;
  created_at: string;
}

export interface Favorite {
  id: string;
  media_id: string;
  user_id: string | null;
  guest_identifier: string | null;
  created_at: string;
}

export interface RSVP {
  id: string;
  wedding_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  attendance: AttendanceStatus;
  guest_count: number;
  dietary_restrictions: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  wedding_id: string;
  name: string;
  description: string | null;
  cover_media_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AlbumMedia {
  album_id: string;
  media_id: string;
  sort_order: number;
  added_at: string;
}

export interface GuestSession {
  id: string;
  wedding_id: string;
  session_token: string;
  guest_identifier: string;
  guest_name: string | null;
  auth_method: AuthMethod;
  expires_at: string;
  created_at: string;
  last_active_at: string;
  last_used_at?: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  user_type: 'god' | 'client';
  token: string;
  refresh_token: string;
  expires_at: string;
  refresh_expires_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  last_used_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_type: 'god' | 'client' | 'guest' | 'system';
  actor_id: string | null;
  details: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type StripeEventStatus = 'processing' | 'completed' | 'failed';

export interface StripeEvent {
  id: string;
  stripe_event_id: string;
  type: string;
  status: StripeEventStatus;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

// ============================================
// Views
// ============================================

export interface PublicMedia extends Media {
  wedding_slug: string;
  reaction_count: number;
  favorite_count: number;
}

export interface WeddingStats {
  wedding_id: string;
  slug: string;
  media_count: number;
  photo_count: number;
  video_count: number;
  message_count: number;
  rsvp_yes_count: number;
  rsvp_no_count: number;
  rsvp_maybe_count: number;
  total_guests: number;
}

// ============================================
// Database Schema Type
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
        Relationships: [];
      };
      weddings: {
        Row: Wedding;
        Insert: Omit<Wedding, 'id' | 'magic_token' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Wedding, 'id' | 'created_at'>>;
      };
      media: {
        Row: Media;
        Insert: Partial<Omit<Media, 'id' | 'created_at' | 'updated_at'>> & Pick<Media, 'wedding_id' | 'original_url' | 'type'>;
        Update: Partial<Omit<Media, 'id' | 'created_at'>>;
      };
      guestbook_messages: {
        Row: GuestbookMessage;
        Insert: Partial<Omit<GuestbookMessage, 'id' | 'created_at'>> & Pick<GuestbookMessage, 'wedding_id' | 'author_name' | 'message'>;
        Update: Partial<Omit<GuestbookMessage, 'id' | 'created_at'>>;
      };
      reactions: {
        Row: Reaction;
        Insert: Omit<Reaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Reaction, 'id' | 'created_at'>>;
      };
      favorites: {
        Row: Favorite;
        Insert: Omit<Favorite, 'id' | 'created_at'>;
        Update: Partial<Omit<Favorite, 'id' | 'created_at'>>;
      };
      rsvp: {
        Row: RSVP;
        Insert: Omit<RSVP, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RSVP, 'id' | 'created_at'>>;
      };
      albums: {
        Row: Album;
        Insert: Partial<Omit<Album, 'id' | 'created_at' | 'updated_at'>> & Pick<Album, 'wedding_id' | 'name'>;
        Update: Partial<Omit<Album, 'id' | 'created_at'>>;
      };
      album_media: {
        Row: AlbumMedia;
        Insert: Omit<AlbumMedia, 'added_at'>;
        Update: Partial<Omit<AlbumMedia, 'added_at'>>;
      };
      guest_sessions: {
        Row: GuestSession;
        Insert: Omit<GuestSession, 'id' | 'created_at'>;
        Update: Partial<Omit<GuestSession, 'id' | 'created_at'>>;
      };
      auth_sessions: {
        Row: AuthSession;
        Insert: Omit<AuthSession, 'id' | 'created_at' | 'last_used_at'>;
        Update: Partial<Omit<AuthSession, 'id' | 'created_at'>>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: never;
      };
      stripe_events: {
        Row: StripeEvent;
        Insert: Omit<StripeEvent, 'id' | 'created_at' | 'processed_at'>;
        Update: Partial<Omit<StripeEvent, 'id' | 'stripe_event_id' | 'created_at'>>;
      };
    };
    Views: {
      public_media: {
        Row: PublicMedia;
      };
      wedding_stats: {
        Row: WeddingStats;
      };
    };
    Functions: {
      generate_wedding_slug: {
        Args: { bride: string; groom: string };
        Returns: string;
      };
    };
  };
}

// ============================================
// Helper Types
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
