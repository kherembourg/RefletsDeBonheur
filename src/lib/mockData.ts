import {
  getDemoMedia,
  saveDemoMedia,
  deleteDemoMedia,
  getDemoMessages,
  saveDemoMessage,
  deleteDemoMessage
} from './demoStorage';
import { DEMO_PLACEHOLDERS } from './imagePlaceholders';

// Type definitions
export type ReactionType = 'heart' | 'laugh' | 'wow' | 'celebrate' | 'love' | 'clap';

export interface Reaction {
  type: ReactionType;
  count: number;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  author: string;
  caption?: string;
  createdAt: Date;
  thumbnail?: string;
  placeholder?: string; // Base64 blur placeholder for instant display
  favoriteCount?: number;
  reactions?: Reaction[];
  albumIds?: string[]; // Array of album IDs this media belongs to
  isDemo?: boolean; // Flag to identify demo-uploaded items
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  coverPhotoId?: string; // ID of the media item to use as cover
  createdAt: Date;
  photoCount?: number; // Calculated dynamically
  color?: string; // Optional color tag
}

export interface GuestbookMessage {
  id: string;
  author: string;
  text: string;
  createdAt: Date;
  isDemo?: boolean; // Flag to identify demo-added messages
}

export interface Settings {
  allowUploads: boolean;
  weddingDate: Date;
  coupleName: string;
}

// Mock Media Items (using optimized Unsplash wedding photos)
// Using smaller sizes (w=400) and auto-format for faster loading
// Each item includes a pre-generated blur placeholder for instant display
export const mockMedia: MediaItem[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Sophie Martin',
    caption: 'Un moment de joie partagée sous les étoiles',
    createdAt: new Date('2026-01-16T14:30:00'),
    placeholder: DEMO_PLACEHOLDERS['1'],
    favoriteCount: 5,
    reactions: [
      { type: 'love', count: 8 },
      { type: 'celebrate', count: 5 },
      { type: 'heart', count: 3 },
    ],
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Thomas Dubois',
    caption: 'Les rires résonnent encore dans nos cœurs',
    createdAt: new Date('2026-01-16T15:45:00'),
    placeholder: DEMO_PLACEHOLDERS['2'],
    favoriteCount: 3,
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Marie Laurent',
    caption: 'L\'amour illumine cette scène magique',
    createdAt: new Date('2026-01-16T16:20:00'),
    placeholder: DEMO_PLACEHOLDERS['3'],
    favoriteCount: 8,
    reactions: [
      { type: 'wow', count: 12 },
      { type: 'love', count: 10 },
      { type: 'clap', count: 6 },
      { type: 'heart', count: 4 },
    ],
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Lucas Bernard',
    caption: 'Des souvenirs gravés à jamais',
    createdAt: new Date('2026-01-16T17:10:00'),
    placeholder: DEMO_PLACEHOLDERS['4'],
  },
  {
    id: '5',
    url: 'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Camille Rousseau',
    caption: 'La magie d\'un instant précieux',
    createdAt: new Date('2026-01-16T18:00:00'),
    placeholder: DEMO_PLACEHOLDERS['5'],
  },
  {
    id: '6',
    url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Alexandre Petit',
    caption: 'Une célébration inoubliable',
    createdAt: new Date('2026-01-16T19:30:00'),
    placeholder: DEMO_PLACEHOLDERS['6'],
  },
  {
    id: '7',
    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Isabelle Moreau',
    caption: 'L\'élégance de ce moment',
    createdAt: new Date('2026-01-16T20:15:00'),
    placeholder: DEMO_PLACEHOLDERS['7'],
  },
  {
    id: '8',
    url: 'https://images.unsplash.com/photo-1516651029879-bcd191e3e0d3?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Antoine Leroy',
    createdAt: new Date('2026-01-17T10:00:00'),
    placeholder: DEMO_PLACEHOLDERS['8'],
  },
  {
    id: '9',
    url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=400&q=75&auto=format&fit=crop',
    type: 'image',
    author: 'Émilie Garcia',
    caption: 'Les détails qui rendent tout parfait',
    createdAt: new Date('2026-01-17T11:30:00'),
    placeholder: DEMO_PLACEHOLDERS['9'],
  },
  {
    id: '10',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'video',
    author: 'Pierre Durand',
    caption: 'La danse des mariés',
    createdAt: new Date('2026-01-17T12:00:00'),
    placeholder: DEMO_PLACEHOLDERS['10'],
    thumbnail: 'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=300&q=60&auto=format&fit=crop',
  },
];

// Mock Guestbook Messages
export const mockMessages: GuestbookMessage[] = [
  {
    id: '1',
    author: 'Jeanne et Michel',
    text: 'Félicitations à vous deux ! Que votre amour grandisse chaque jour et que votre vie commune soit remplie de bonheur et de complicité. Nous sommes si heureux de partager ce moment avec vous.',
    createdAt: new Date('2026-01-16T14:00:00'),
  },
  {
    id: '2',
    author: 'Lucas Fontaine',
    text: 'Quel bonheur de célébrer votre union ! Vous êtes faits l\'un pour l\'autre. Longue vie aux mariés, que chaque jour soit une nouvelle aventure ensemble.',
    createdAt: new Date('2026-01-16T15:30:00'),
  },
  {
    id: '3',
    author: 'Sophie et Thomas',
    text: 'Nous sommes si fiers de vous voir unis aujourd\'hui. Que cette journée soit le début d\'une merveilleuse aventure à deux. Tout notre amour vous accompagne.',
    createdAt: new Date('2026-01-16T16:45:00'),
  },
  {
    id: '4',
    author: 'Claire Dubois',
    text: 'Les larmes de joie coulent en ce jour magnifique. Vous êtes un exemple d\'amour et de tendresse. Puisse votre bonheur durer éternellement.',
    createdAt: new Date('2026-01-16T17:20:00'),
  },
  {
    id: '5',
    author: 'Marc et Julie',
    text: 'Quelle belle célébration ! Merci de nous avoir permis de partager ces moments précieux. Nos meilleurs vœux vous accompagnent pour cette nouvelle vie à deux.',
    createdAt: new Date('2026-01-16T18:30:00'),
  },
  {
    id: '6',
    author: 'Amélie Bernard',
    text: 'Un grand jour pour deux personnes extraordinaires. Que votre amour soit toujours aussi fort et que vos rêves se réalisent ensemble. Toutes nos félicitations !',
    createdAt: new Date('2026-01-17T09:00:00'),
  },
];

// Mock Settings
export let mockSettings: Settings = {
  allowUploads: true,
  weddingDate: new Date('2026-06-20'),
  coupleName: 'Marie & Thomas',
};

// Auth codes
export const AUTH_CODES = {
  GUEST: 'MARIAGE2026',
  ADMIN: 'ADMIN123',
};

// Helper functions for mock data manipulation
export function addMediaItem(item: Omit<MediaItem, 'id'>): MediaItem {
  const newItem: MediaItem = {
    ...item,
    id: generateId(),
    isDemo: true, // Mark as demo-uploaded
  };
  mockMedia.unshift(newItem);

  // Also save to localStorage for persistence
  saveDemoMedia(newItem);

  return newItem;
}

export function deleteMediaItem(id: string): boolean {
  const index = mockMedia.findIndex(item => item.id === id);
  if (index > -1) {
    mockMedia.splice(index, 1);

    // Also remove from localStorage
    deleteDemoMedia(id);

    return true;
  }
  return false;
}

export function addGuestbookMessage(message: Omit<GuestbookMessage, 'id'>): GuestbookMessage {
  const newMessage: GuestbookMessage = {
    ...message,
    id: generateId(),
    isDemo: true, // Mark as demo-added
  };
  mockMessages.unshift(newMessage);

  // Also save to localStorage for persistence
  saveDemoMessage(newMessage);

  return newMessage;
}

export function deleteGuestbookMessage(id: string): boolean {
  const index = mockMessages.findIndex(msg => msg.id === id);
  if (index > -1) {
    mockMessages.splice(index, 1);

    // Also remove from localStorage
    deleteDemoMessage(id);

    return true;
  }
  return false;
}

// Initialize demo data from localStorage
export function initializeDemoData(): void {
  if (typeof window === 'undefined') return;

  // Load saved demo media
  const savedMedia = getDemoMedia();
  savedMedia.forEach(item => {
    // Only add if not already in mockMedia (avoid duplicates)
    if (!mockMedia.find(m => m.id === item.id)) {
      mockMedia.unshift(item);
    }
  });

  // Load saved demo messages
  const savedMessages = getDemoMessages();
  savedMessages.forEach(msg => {
    // Only add if not already in mockMessages (avoid duplicates)
    if (!mockMessages.find(m => m.id === msg.id)) {
      mockMessages.unshift(msg);
    }
  });
}

export function updateSettings(newSettings: Partial<Settings>): void {
  mockSettings = { ...mockSettings, ...newSettings };
}

// Favorite management
const FAVORITES_KEY = 'reflets_favorites';

// Get user's favorites from localStorage
export function getUserFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem(FAVORITES_KEY);
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

// Save user's favorites to localStorage
function saveUserFavorites(favorites: Set<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

// Check if user has favorited an item
export function isFavorited(mediaId: string): boolean {
  return getUserFavorites().has(mediaId);
}

// Toggle favorite for an item
export function toggleFavorite(mediaId: string): boolean {
  const favorites = getUserFavorites();
  const wasFavorited = favorites.has(mediaId);

  if (wasFavorited) {
    favorites.delete(mediaId);
  } else {
    favorites.add(mediaId);
  }

  saveUserFavorites(favorites);

  // Update favorite count in mockMedia
  const item = mockMedia.find(m => m.id === mediaId);
  if (item) {
    item.favoriteCount = (item.favoriteCount || 0) + (wasFavorited ? -1 : 1);
  }

  return !wasFavorited; // Return new favorited state
}

// Get favorite count for an item
export function getFavoriteCount(mediaId: string): number {
  const item = mockMedia.find(m => m.id === mediaId);
  return item?.favoriteCount || 0;
}

// Get total favorites across all media
export function getTotalFavorites(): number {
  return mockMedia.reduce((sum, item) => sum + (item.favoriteCount || 0), 0);
}

// Reaction management
const REACTIONS_KEY = 'reflets_reactions';

// Reaction emoji mapping
export const REACTION_EMOJIS: Record<ReactionType, string> = {
  heart: '❤️',
  laugh: '😂',
  wow: '😮',
  celebrate: '🎉',
  love: '😍',
  clap: '👏',
};

// Get user's reactions from localStorage
export function getUserReactions(): Map<string, ReactionType> {
  if (typeof window === 'undefined') return new Map();
  const stored = localStorage.getItem(REACTIONS_KEY);
  if (!stored) return new Map();

  try {
    const obj = JSON.parse(stored);
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

// Save user's reactions to localStorage
function saveUserReactions(reactions: Map<string, ReactionType>): void {
  if (typeof window === 'undefined') return;
  const obj = Object.fromEntries(reactions);
  localStorage.setItem(REACTIONS_KEY, JSON.stringify(obj));
}

// Check if user has reacted to an item
export function getUserReaction(mediaId: string): ReactionType | null {
  return getUserReactions().get(mediaId) || null;
}

// Toggle reaction for an item
export function toggleReaction(mediaId: string, reactionType: ReactionType): boolean {
  const reactions = getUserReactions();
  const currentReaction = reactions.get(mediaId);

  // Find the media item
  const item = mockMedia.find(m => m.id === mediaId);
  if (!item) return false;

  // Initialize reactions array if not present
  if (!item.reactions) {
    item.reactions = [];
  }

  // If user already reacted with this type, remove it
  if (currentReaction === reactionType) {
    reactions.delete(mediaId);

    // Decrement count
    const reactionObj = item.reactions.find(r => r.type === reactionType);
    if (reactionObj) {
      reactionObj.count = Math.max(0, reactionObj.count - 1);
      // Remove reaction type if count is 0
      if (reactionObj.count === 0) {
        item.reactions = item.reactions.filter(r => r.type !== reactionType);
      }
    }

    saveUserReactions(reactions);
    return false; // Reaction removed
  }

  // If user had a different reaction, decrement old one
  if (currentReaction) {
    const oldReaction = item.reactions.find(r => r.type === currentReaction);
    if (oldReaction) {
      oldReaction.count = Math.max(0, oldReaction.count - 1);
      if (oldReaction.count === 0) {
        item.reactions = item.reactions.filter(r => r.type !== currentReaction);
      }
    }
  }

  // Add new reaction
  reactions.set(mediaId, reactionType);

  const reactionObj = item.reactions.find(r => r.type === reactionType);
  if (reactionObj) {
    reactionObj.count++;
  } else {
    item.reactions.push({ type: reactionType, count: 1 });
  }

  saveUserReactions(reactions);
  return true; // Reaction added
}

// Get total reaction count for an item
export function getTotalReactionCount(mediaId: string): number {
  const item = mockMedia.find(m => m.id === mediaId);
  if (!item || !item.reactions) return 0;
  return item.reactions.reduce((sum, r) => sum + r.count, 0);
}

// Get all reactions for an item
export function getReactions(mediaId: string): Reaction[] {
  const item = mockMedia.find(m => m.id === mediaId);
  return item?.reactions || [];
}

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// ===== ALBUMS =====

// Mock Albums
export const mockAlbums: Album[] = [
  {
    id: 'album-1',
    name: 'Cérémonie',
    description: 'Les moments magiques de la cérémonie',
    coverPhotoId: '1',
    createdAt: new Date('2026-01-15'),
    color: '#D4AF37' // Champagne gold
  },
  {
    id: 'album-2',
    name: 'Réception',
    description: 'La fête et les festivités',
    coverPhotoId: '5',
    createdAt: new Date('2026-01-15'),
    color: '#8B7355' // Warm taupe
  },
  {
    id: 'album-3',
    name: 'Portraits',
    description: 'Photos de groupe et portraits',
    coverPhotoId: '3',
    createdAt: new Date('2026-01-15'),
    color: '#C0C0C0' // Silver
  },
  {
    id: 'album-4',
    name: 'Danse',
    description: 'La soirée dansante',
    coverPhotoId: '8',
    createdAt: new Date('2026-01-15'),
    color: '#FFB6C1' // Light pink
  }
];

// Assign some photos to albums (initial setup)
if (mockMedia.length > 0 && !mockMedia[0].albumIds) {
  // Ceremony photos
  [mockMedia[0], mockMedia[1], mockMedia[2]].forEach(item => {
    if (item) item.albumIds = ['album-1'];
  });

  // Reception photos
  [mockMedia[4], mockMedia[5], mockMedia[6]].forEach(item => {
    if (item) item.albumIds = ['album-2'];
  });

  // Portraits (can be in multiple albums)
  [mockMedia[2], mockMedia[3]].forEach(item => {
    if (item) {
      item.albumIds = item.albumIds ? [...item.albumIds, 'album-3'] : ['album-3'];
    }
  });

  // Dance photos
  [mockMedia[7], mockMedia[8]].forEach(item => {
    if (item) item.albumIds = ['album-4'];
  });
}

// Album management functions
export function getAlbums(): Album[] {
  return mockAlbums.map(album => ({
    ...album,
    photoCount: mockMedia.filter(m => m.albumIds?.includes(album.id)).length
  }));
}

export function getAlbum(albumId: string): Album | undefined {
  const album = mockAlbums.find(a => a.id === albumId);
  if (!album) return undefined;

  return {
    ...album,
    photoCount: mockMedia.filter(m => m.albumIds?.includes(albumId)).length
  };
}

export function createAlbum(name: string, description?: string, color?: string): Album {
  const newAlbum: Album = {
    id: `album-${Date.now()}`,
    name,
    description,
    color: color || '#D4AF37',
    createdAt: new Date(),
    photoCount: 0
  };

  mockAlbums.push(newAlbum);
  return newAlbum;
}

export function updateAlbum(albumId: string, updates: Partial<Omit<Album, 'id' | 'createdAt'>>): Album | null {
  const album = mockAlbums.find(a => a.id === albumId);
  if (!album) return null;

  Object.assign(album, updates);
  return album;
}

export function deleteAlbum(albumId: string): boolean {
  const index = mockAlbums.findIndex(a => a.id === albumId);
  if (index === -1) return false;

  mockAlbums.splice(index, 1);

  // Remove album references from media items
  mockMedia.forEach(item => {
    if (item.albumIds) {
      item.albumIds = item.albumIds.filter(id => id !== albumId);
    }
  });

  return true;
}

export function addMediaToAlbum(mediaId: string, albumId: string): boolean {
  const media = mockMedia.find(m => m.id === mediaId);
  const album = mockAlbums.find(a => a.id === albumId);

  if (!media || !album) return false;

  if (!media.albumIds) {
    media.albumIds = [];
  }

  if (media.albumIds.includes(albumId)) {
    return false; // Already in album
  }

  media.albumIds.push(albumId);
  return true;
}

export function removeMediaFromAlbum(mediaId: string, albumId: string): boolean {
  const media = mockMedia.find(m => m.id === mediaId);
  if (!media || !media.albumIds) return false;

  const index = media.albumIds.indexOf(albumId);
  if (index === -1) return false;

  media.albumIds.splice(index, 1);
  return true;
}

export function getMediaByAlbum(albumId: string): MediaItem[] {
  return mockMedia.filter(m => m.albumIds?.includes(albumId));
}

export function getMediaAlbums(mediaId: string): Album[] {
  const media = mockMedia.find(m => m.id === mediaId);
  if (!media || !media.albumIds) return [];

  return mockAlbums.filter(album => media.albumIds!.includes(album.id));
}
