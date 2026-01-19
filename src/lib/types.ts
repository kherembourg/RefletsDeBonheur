// Types for Wedding Platform

// ============================================
// WEDDING CONFIGURATION
// ============================================

export interface WeddingVenue {
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  mapUrl?: string;
  parkingInfo?: string;
}

export interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  icon?: 'ceremony' | 'cocktail' | 'dinner' | 'party' | 'photo' | 'custom';
  location?: string;
}

export type WeddingThemeId = 'classic' | 'luxe';

export interface WeddingTheme {
  id: WeddingThemeId;
  primaryColor: string;
  secondaryColor: string;
  fontFamily?: 'playfair' | 'inter' | 'allura' | 'default';
  heroImage?: string;
  pattern?: 'none' | 'floral' | 'geometric' | 'minimal';
}

export interface WeddingFeatures {
  rsvp: boolean;
  guestbook: boolean;
  photoGallery: boolean;
  liveWall: boolean;
  geoFencing: boolean;
  countdown: boolean;
  timeline: boolean;
}

export interface ModerationSettings {
  enabled: boolean;
  autoApprove: boolean;
  notifyOnUpload: boolean;
}

export interface WeddingConfig {
  // Identity
  brideName: string;
  groomName: string;
  weddingDate: string; // ISO date string

  // Welcome
  welcomeTitle?: string;
  welcomeMessage?: string;

  // Venue
  venue?: WeddingVenue;

  // Program
  timeline?: TimelineEvent[];

  // Customization
  theme: WeddingTheme;

  // Features enabled
  features: WeddingFeatures;

  // Moderation
  moderation: ModerationSettings;

  // RSVP Settings
  rsvpDeadline?: string;
  rsvpMessage?: string;
  allowPlusOne?: boolean;
  askDietaryRestrictions?: boolean;
}

// ============================================
// WEDDING ENTITY
// ============================================

export interface Wedding {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  date: string;
  pinCode: string;
  magicToken: string;
  config: WeddingConfig;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MEDIA
// ============================================

export type MediaType = 'image' | 'video';

export type MediaStatus = 'uploading' | 'processing' | 'ready' | 'error';

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Media {
  id: string;
  weddingId: string;
  guestIdentifier?: string;
  type: MediaType;
  originalUrl?: string;
  optimizedUrl?: string;
  thumbnailUrl?: string;
  status: MediaStatus;
  moderationStatus: ModerationStatus;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // For videos
    size?: number;
    caption?: string;
  };
  createdAt: string;
}

// ============================================
// GUESTBOOK
// ============================================

export interface GuestbookMessage {
  id: string;
  weddingId: string;
  authorName: string;
  message: string;
  relation?: string;
  createdAt: string;
}

// ============================================
// RSVP
// ============================================

export type AttendanceStatus = 'yes' | 'no' | 'maybe';

export interface RSVP {
  id: string;
  weddingId: string;
  name: string;
  email?: string;
  attendance: AttendanceStatus;
  plusOne: boolean;
  plusOneName?: string;
  dietaryRestrictions?: string;
  message?: string;
  createdAt: string;
}

// ============================================
// REACTIONS
// ============================================

export type ReactionEmoji = 'heart' | 'fire' | 'laugh' | 'wow' | 'cry' | 'clap';

export interface Reaction {
  id: string;
  mediaId: string;
  guestIdentifier: string;
  emoji: ReactionEmoji;
  createdAt: string;
}

// ============================================
// USER / PROFILE
// ============================================

export interface Profile {
  id: string;
  email: string;
  fullName?: string;
  subscriptionEndDate?: string;
  createdAt: string;
}

// ============================================
// AUTH
// ============================================

export type UserRole = 'owner' | 'guest' | 'admin';

export interface AuthSession {
  weddingId: string;
  role: UserRole;
  guestIdentifier?: string;
  expiresAt: string;
}

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_WEDDING_CONFIG: WeddingConfig = {
  brideName: '',
  groomName: '',
  weddingDate: '',
  welcomeTitle: 'Bienvenue',
  welcomeMessage: 'Nous sommes heureux de vous accueillir pour célébrer notre union.',
  theme: {
    id: 'classic',
    primaryColor: '#ae1725',
    secondaryColor: '#c92a38',
    fontFamily: 'playfair',
  },
  features: {
    rsvp: true,
    guestbook: true,
    photoGallery: true,
    liveWall: false,
    geoFencing: false,
    countdown: true,
    timeline: true,
  },
  moderation: {
    enabled: false,
    autoApprove: true,
    notifyOnUpload: false,
  },
  allowPlusOne: true,
  askDietaryRestrictions: true,
};

// ============================================
// TIMELINE ICON MAPPING
// ============================================

export const TIMELINE_ICONS: Record<TimelineEvent['icon'], string> = {
  ceremony: 'heart',
  cocktail: 'wine',
  dinner: 'utensils',
  party: 'music',
  photo: 'camera',
  custom: 'calendar',
};
