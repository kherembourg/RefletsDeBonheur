/**
 * Unified Data Service
 * Handles both demo mode (localStorage) and production mode (Supabase)
 */

import { isSupabaseConfigured, supabase } from '../supabase/client';
import { mediaApi, guestbookApi, weddingsApi, reactionsApi, favoritesApi, albumsApi } from '../supabase/api';
import {
  mockMedia,
  mockMessages,
  mockSettings,
  mockAlbums,
  addMediaItem as addMockMedia,
  deleteMediaItem as deleteMockMedia,
  addGuestbookMessage as addMockMessage,
  deleteGuestbookMessage as deleteMockMessage,
  getAlbums as getMockAlbums,
  createAlbum as createMockAlbum,
  updateAlbum as updateMockAlbum,
  deleteAlbum as deleteMockAlbum,
  toggleReaction as toggleMockReaction,
  getUserReaction as getMockUserReaction,
  getReactions as getMockReactions,
  toggleFavorite as toggleMockFavorite,
  isFavorited as isMockFavorited,
  REACTION_EMOJIS,
  initializeDemoData,
  type MediaItem as MockMediaItem,
  type GuestbookMessage as MockGuestbookMessage,
  type Album as MockAlbum,
  type ReactionType,
  type Reaction as MockReaction,
} from '../mockData';
import type { Media, GuestbookMessage, Wedding, ReactionEmoji, Album as SupabaseAlbum, WeddingStats } from '../supabase/types';

// ============================================
// Types
// ============================================

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  caption?: string;
  author?: string;
  createdAt: Date;
  reactions?: Record<string, number>;
  albumIds?: string[];
  favoriteCount?: number;
}

export interface GuestbookEntry {
  id: string;
  author: string;
  text: string;
  relation?: string;
  createdAt: Date;
}

export interface GallerySettings {
  allowUploads: boolean;
  allowComments: boolean;
  moderationEnabled: boolean;
  weddingDate?: Date;
  coupleName?: string;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  coverPhotoId?: string;
  createdAt: Date;
  photoCount?: number;
  color?: string;
}

export interface WeddingStatistics {
  mediaCount: number;
  photoCount: number;
  videoCount: number;
  messageCount: number;
  favoriteCount: number;
  albumCount: number;
}

// Re-export constants for convenience
export { REACTION_EMOJIS };
export type { ReactionType, MockReaction as Reaction };

// ============================================
// Converters (Supabase -> App Types)
// ============================================

function mediaToItem(media: Media): MediaItem {
  return {
    id: media.id,
    url: media.optimized_url || media.original_url,
    thumbnailUrl: media.thumbnail_url || undefined,
    type: media.type,
    caption: media.caption || undefined,
    author: media.guest_name || undefined,
    createdAt: new Date(media.created_at),
    reactions: {},
    albumIds: [],
  };
}

function messageToEntry(message: GuestbookMessage): GuestbookEntry {
  return {
    id: message.id,
    author: message.author_name,
    text: message.message,
    relation: message.author_relation || undefined,
    createdAt: new Date(message.created_at),
  };
}

function mockMediaToItem(mock: MockMediaItem): MediaItem {
  // Convert reactions array to Record<string, number>
  const reactionsMap: Record<string, number> = {};
  if (mock.reactions) {
    mock.reactions.forEach(r => {
      // Map reaction types to emojis
      const emojiMap: Record<string, string> = {
        heart: '❤️',
        laugh: '😂',
        wow: '😮',
        celebrate: '🎉',
        love: '😍',
        clap: '👏',
      };
      const emoji = emojiMap[r.type] || r.type;
      reactionsMap[emoji] = r.count;
    });
  }

  return {
    id: mock.id,
    url: mock.url,
    thumbnailUrl: mock.thumbnail, // mockData uses 'thumbnail', not 'thumbnailUrl'
    type: mock.type,
    caption: mock.caption,
    author: mock.author,
    createdAt: mock.createdAt,
    reactions: reactionsMap,
    albumIds: mock.albumIds,
    favoriteCount: mock.favoriteCount || 0,
  };
}

function mockMessageToEntry(mock: MockGuestbookMessage): GuestbookEntry {
  return {
    id: mock.id,
    author: mock.author,
    text: mock.text,
    createdAt: mock.createdAt,
  };
}

function mockAlbumToAlbum(mock: MockAlbum): Album {
  return {
    id: mock.id,
    name: mock.name,
    description: mock.description,
    coverPhotoId: mock.coverPhotoId,
    createdAt: mock.createdAt,
    photoCount: mock.photoCount,
    color: mock.color,
  };
}

function supabaseAlbumToAlbum(album: SupabaseAlbum): Album {
  return {
    id: album.id,
    name: album.name,
    description: album.description || undefined,
    coverPhotoId: album.cover_media_id || undefined,
    createdAt: new Date(album.created_at),
    photoCount: 0, // Will be calculated separately
  };
}

// ============================================
// Data Service
// ============================================

export class DataService {
  private demoMode: boolean;
  private weddingId?: string;
  private weddingSlug?: string;
  private guestIdentifier: string;

  private initialized: boolean = false;

  constructor(options: {
    demoMode?: boolean;
    weddingId?: string;
    weddingSlug?: string;
  } = {}) {
    // Demo mode is explicitly set OR Supabase is not configured
    // When demoMode is explicitly true, ALWAYS use demo mode regardless of Supabase
    this.demoMode = options.demoMode === true ? true : !isSupabaseConfigured();
    this.weddingId = options.weddingId;
    this.weddingSlug = options.weddingSlug;
    this.guestIdentifier = this.getOrCreateGuestIdentifier();

    // NOTE: Don't call initializeDemoData here - it causes hydration mismatch
    // Call initializeDemoStorage() in a useEffect instead

  }

  // Initialize demo storage - call this in a useEffect to avoid hydration mismatch
  initializeDemoStorage(): void {
    if (this.demoMode && !this.initialized) {
      initializeDemoData();
      this.initialized = true;
    }
  }

  private getOrCreateGuestIdentifier(): string {
    if (typeof window === 'undefined') return 'server';

    const key = 'reflets_guest_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  // ============================================
  // Media Methods
  // ============================================

  async getMedia(): Promise<MediaItem[]> {
    if (this.demoMode) {
      return mockMedia.map(mockMediaToItem);
    }

    if (!this.weddingId) {
      console.warn('No wedding ID set for production mode');
      return [];
    }

    const media = await mediaApi.getByWeddingId(this.weddingId, {
      status: 'ready',
      moderation: 'approved',
    });

    return media.map(mediaToItem);
  }

  async addMedia(item: {
    url: string;
    thumbnailUrl?: string;
    type: 'image' | 'video';
    caption?: string;
    author?: string;
  }): Promise<MediaItem> {
    if (this.demoMode) {
      const newItem = addMockMedia({
        url: item.url,
        thumbnail: item.thumbnailUrl, // mockData uses 'thumbnail'
        type: item.type,
        caption: item.caption,
        author: item.author || 'Invité',
        createdAt: new Date(),
        reactions: [], // mockData uses Reaction[] array format
      });
      return mockMediaToItem(newItem);
    }

    if (!this.weddingId) {
      throw new Error('No wedding ID set for production mode');
    }

    const media = await mediaApi.create({
      wedding_id: this.weddingId,
      original_url: item.url,
      thumbnail_url: item.thumbnailUrl || null,
      type: item.type,
      caption: item.caption || null,
      guest_name: item.author || null,
      guest_identifier: this.guestIdentifier,
      status: 'ready',
      moderation_status: 'approved', // Auto-approve for now
    });

    return mediaToItem(media);
  }

  async deleteMedia(id: string): Promise<void> {
    if (this.demoMode) {
      deleteMockMedia(id);
      return;
    }

    await mediaApi.delete(id);
  }

  /**
   * Upload a file to storage (R2 in production, data URL in demo)
   *
   * @param file - The file to upload
   * @param options - Upload options
   * @returns The created MediaItem
   */
  async uploadMedia(
    file: File,
    options: {
      caption?: string;
      author?: string;
      onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
    } = {}
  ): Promise<MediaItem> {
    if (this.demoMode) {
      // Demo mode: convert to data URL
      const dataUrl = await this.fileToDataUrl(file);
      return this.addMedia({
        url: dataUrl,
        type: file.type.startsWith('video') ? 'video' : 'image',
        caption: options.caption,
        author: options.author,
      });
    }

    // Production mode: use R2 upload
    if (!this.weddingId) {
      throw new Error('No wedding ID set for production mode');
    }

    // Dynamic import to avoid loading R2 client on client-side unnecessarily
    const { uploadToR2, TrialModeError } = await import('../r2/upload');

    try {
      return await uploadToR2({
        weddingId: this.weddingId,
        file,
        caption: options.caption,
        guestName: options.author,
        guestIdentifier: this.guestIdentifier,
        onProgress: options.onProgress,
      });
    } catch (error) {
      // If trial mode, fall back to local storage with warning
      if (error instanceof TrialModeError) {
        console.warn('[DataService] Trial mode - using local storage:', error.message);
        const dataUrl = await this.fileToDataUrl(file);
        return this.addMedia({
          url: dataUrl,
          type: file.type.startsWith('video') ? 'video' : 'image',
          caption: options.caption,
          author: options.author,
        });
      }
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMediaBatch(
    files: Array<{ file: File; caption?: string }>,
    options: {
      author?: string;
      onFileProgress?: (fileIndex: number, progress: { loaded: number; total: number; percentage: number }) => void;
      onOverallProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<MediaItem[]> {
    if (this.demoMode) {
      const results: MediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const { file, caption } = files[i];
        const item = await this.uploadMedia(file, {
          caption,
          author: options.author,
          onProgress: (progress) => options.onFileProgress?.(i, progress),
        });
        results.push(item);
        options.onOverallProgress?.(i + 1, files.length);
      }
      return results;
    }

    // Production mode: use R2 batch upload
    if (!this.weddingId) {
      throw new Error('No wedding ID set for production mode');
    }

    const { uploadMultipleToR2, TrialModeError } = await import('../r2/upload');

    try {
      return await uploadMultipleToR2({
        weddingId: this.weddingId,
        files,
        guestName: options.author,
        guestIdentifier: this.guestIdentifier,
        onFileProgress: options.onFileProgress,
        onOverallProgress: options.onOverallProgress,
      });
    } catch (error) {
      // If trial mode, fall back to local upload with warning
      if (error instanceof TrialModeError) {
        console.warn('[DataService] Trial mode - using local storage for batch upload:', error.message);
        const results: MediaItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const { file, caption } = files[i];
          const dataUrl = await this.fileToDataUrl(file);
          const item = await this.addMedia({
            url: dataUrl,
            type: file.type.startsWith('video') ? 'video' : 'image',
            caption,
            author: options.author,
          });
          results.push(item);
          options.onFileProgress?.(i, { loaded: file.size, total: file.size, percentage: 100 });
          options.onOverallProgress?.(i + 1, files.length);
        }
        return results;
      }
      throw error;
    }
  }

  /**
   * Helper: Convert file to data URL
   */
  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ============================================
  // Guestbook Methods
  // ============================================

  async getMessages(): Promise<GuestbookEntry[]> {
    if (this.demoMode) {
      return mockMessages.map(mockMessageToEntry);
    }

    if (!this.weddingId) {
      console.warn('No wedding ID set for production mode');
      return [];
    }

    const messages = await guestbookApi.getByWeddingId(this.weddingId, {
      moderation: 'approved',
    });

    return messages.map(messageToEntry);
  }

  async addMessage(entry: {
    author: string;
    text: string;
    relation?: string;
  }): Promise<GuestbookEntry> {
    if (this.demoMode) {
      const newMessage = addMockMessage({
        author: entry.author,
        text: entry.text,
        createdAt: new Date(),
      });
      return mockMessageToEntry(newMessage);
    }

    if (!this.weddingId) {
      throw new Error('No wedding ID set for production mode');
    }

    const message = await guestbookApi.create({
      wedding_id: this.weddingId,
      author_name: entry.author,
      message: entry.text,
      author_relation: entry.relation || null,
      guest_identifier: this.guestIdentifier,
      moderation_status: 'approved', // Auto-approve for now
    });

    return messageToEntry(message);
  }

  async deleteMessage(id: string): Promise<void> {
    if (this.demoMode) {
      deleteMockMessage(id);
      return;
    }

    await guestbookApi.delete(id);
  }

  // ============================================
  // Reactions Methods
  // ============================================

  async addReaction(mediaId: string, emoji: ReactionEmoji): Promise<void> {
    if (this.demoMode) {
      // For demo mode, reactions are handled via mockData's toggleReaction
      // Note: demo mode reactions use a different format (Reaction[])
      // This is a simplified implementation for demo purposes
      return;
    }

    await reactionsApi.add(mediaId, emoji, {
      guestIdentifier: this.guestIdentifier,
    });
  }

  async removeReaction(mediaId: string, emoji: ReactionEmoji): Promise<void> {
    if (this.demoMode) {
      // For demo mode, reactions are handled via mockData's toggleReaction
      return;
    }

    await reactionsApi.remove(mediaId, emoji, {
      guestIdentifier: this.guestIdentifier,
    });
  }

  // ============================================
  // Favorites Methods
  // ============================================

  async getFavorites(): Promise<Set<string>> {
    if (this.demoMode) {
      const key = 'reflets_favorites';
      const stored = localStorage.getItem(key);
      return new Set(stored ? JSON.parse(stored) : []);
    }

    const favorites = await favoritesApi.getByUser({
      guestIdentifier: this.guestIdentifier,
    });

    return new Set(favorites);
  }

  async toggleFavorite(mediaId: string): Promise<boolean> {
    if (this.demoMode) {
      const key = 'reflets_favorites';
      const stored = localStorage.getItem(key);
      const favorites: string[] = stored ? JSON.parse(stored) : [];
      const index = favorites.indexOf(mediaId);

      if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem(key, JSON.stringify(favorites));
        return false;
      } else {
        favorites.push(mediaId);
        localStorage.setItem(key, JSON.stringify(favorites));
        return true;
      }
    }

    return favoritesApi.toggle(mediaId, {
      guestIdentifier: this.guestIdentifier,
    });
  }

  // ============================================
  // Settings
  // ============================================

  getSettings(): GallerySettings {
    if (this.demoMode) {
      return {
        allowUploads: mockSettings.allowUploads,
        allowComments: true, // Default for demo mode
        moderationEnabled: false, // Default for demo mode
        weddingDate: mockSettings.weddingDate,
        coupleName: mockSettings.coupleName,
      };
    }

    // In production, this would come from the wedding config
    return {
      allowUploads: true,
      allowComments: true,
      moderationEnabled: false,
    };
  }

  // ============================================
  // Album Methods
  // ============================================

  async getAlbums(): Promise<Album[]> {
    if (this.demoMode) {
      return getMockAlbums().map(mockAlbumToAlbum);
    }

    if (!this.weddingId) {
      console.warn('No wedding ID set for production mode');
      return [];
    }

    const albums = await albumsApi.getByWeddingId(this.weddingId);
    return albums.map(supabaseAlbumToAlbum);
  }

  async createAlbum(album: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<Album> {
    if (this.demoMode) {
      const newAlbum = createMockAlbum(album.name, album.description, album.color);
      return mockAlbumToAlbum(newAlbum);
    }

    if (!this.weddingId) {
      throw new Error('No wedding ID set for production mode');
    }

    const created = await albumsApi.create({
      wedding_id: this.weddingId,
      name: album.name,
      description: album.description || null,
      sort_order: 0,
    });

    return supabaseAlbumToAlbum(created);
  }

  async updateAlbum(id: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    coverPhotoId?: string;
  }): Promise<Album | null> {
    if (this.demoMode) {
      const result = updateMockAlbum(id, {
        name: updates.name,
        description: updates.description,
        color: updates.color,
        coverPhotoId: updates.coverPhotoId,
      });
      return result ? mockAlbumToAlbum(result) : null;
    }

    const updated = await albumsApi.update(id, {
      name: updates.name,
      description: updates.description,
      cover_media_id: updates.coverPhotoId,
    });

    return supabaseAlbumToAlbum(updated);
  }

  async deleteAlbum(id: string): Promise<boolean> {
    if (this.demoMode) {
      return deleteMockAlbum(id);
    }

    await albumsApi.delete(id);
    return true;
  }

  // ============================================
  // Statistics Methods
  // ============================================

  async getStatistics(): Promise<WeddingStatistics> {
    if (this.demoMode) {
      const photos = mockMedia.filter(m => m.type === 'image').length;
      const videos = mockMedia.filter(m => m.type === 'video').length;
      const favoriteCount = mockMedia.reduce((sum, item) => sum + (item.favoriteCount || 0), 0);

      return {
        mediaCount: mockMedia.length,
        photoCount: photos,
        videoCount: videos,
        messageCount: mockMessages.length,
        favoriteCount,
        albumCount: mockAlbums.length,
      };
    }

    if (!this.weddingId) {
      return {
        mediaCount: 0,
        photoCount: 0,
        videoCount: 0,
        messageCount: 0,
        favoriteCount: 0,
        albumCount: 0,
      };
    }

    const stats = await weddingsApi.getStats(this.weddingId);
    const albums = await albumsApi.getByWeddingId(this.weddingId);

    return {
      mediaCount: stats?.media_count || 0,
      photoCount: stats?.photo_count || 0,
      videoCount: stats?.video_count || 0,
      messageCount: stats?.message_count || 0,
      favoriteCount: 0, // Would need to be calculated from favorites table
      albumCount: albums.length,
    };
  }

  // ============================================
  // Enhanced Reaction Methods (for ReactionsPanel)
  // ============================================

  toggleReaction(mediaId: string, reactionType: ReactionType): boolean {
    if (this.demoMode) {
      return toggleMockReaction(mediaId, reactionType);
    }
    // For production, this is handled by addReaction/removeReaction
    // This method is primarily for demo mode synchronous toggling
    return false;
  }

  getUserReaction(mediaId: string): ReactionType | null {
    if (this.demoMode) {
      return getMockUserReaction(mediaId);
    }
    // For production, would need to check user's reaction
    return null;
  }

  getReactions(mediaId: string): MockReaction[] {
    if (this.demoMode) {
      return getMockReactions(mediaId);
    }
    // For production, would fetch from reactions table
    return [];
  }

  // ============================================
  // Enhanced Favorite Methods (for MediaCard)
  // ============================================

  isFavorited(mediaId: string): boolean {
    if (this.demoMode) {
      return isMockFavorited(mediaId);
    }
    // For production, would check the favorites Set
    return false;
  }

  syncToggleFavorite(mediaId: string): boolean {
    if (this.demoMode) {
      return toggleMockFavorite(mediaId);
    }
    // For production, use the async toggleFavorite method
    return false;
  }

  // ============================================
  // Wedding Info
  // ============================================

  async getWeddingBySlug(slug: string): Promise<Wedding | null> {
    if (this.demoMode) {
      return null;
    }

    return weddingsApi.getBySlug(slug);
  }

  setWeddingId(id: string) {
    this.weddingId = id;
  }

  isDemoMode(): boolean {
    return this.demoMode;
  }
}

// ============================================
// Singleton instance for easy access
// ============================================

let defaultService: DataService | null = null;

export function getDataService(options?: {
  demoMode?: boolean;
  weddingId?: string;
  weddingSlug?: string;
}): DataService {
  if (options) {
    return new DataService(options);
  }

  if (!defaultService) {
    defaultService = new DataService();
  }

  return defaultService;
}

// ============================================
// React Hook for Data Service
// ============================================

import { useState, useEffect } from 'react';

export function useDataService(options?: {
  demoMode?: boolean;
  weddingId?: string;
  weddingSlug?: string;
}) {
  // Create service once using lazy initialization
  const [service] = useState(() => new DataService(options));
  return service;
}

export function useMedia(service: DataService) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    service.getMedia()
      .then(data => {
        if (!cancelled) {
          setMedia(data);
          setLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          console.error('[useMedia] Error:', e);
          setError(e instanceof Error ? e : new Error('Failed to load media'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    const data = await service.getMedia();
    setMedia(data);
  };

  return { media, loading, error, refresh, setMedia };
}

export function useGuestbook(service: DataService) {
  const [messages, setMessages] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    service.getMessages()
      .then(data => {
        if (!cancelled) {
          setMessages(data);
          setLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          console.error('[useGuestbook] Error:', e);
          setError(e instanceof Error ? e : new Error('Failed to load messages'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    const data = await service.getMessages();
    setMessages(data);
  };

  return { messages, loading, error, refresh, setMessages };
}
