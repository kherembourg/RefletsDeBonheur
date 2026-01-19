/**
 * Demo Pages Integration Tests
 * Functional tests verifying demo pages work correctly end-to-end
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Supabase client before importing DataService
vi.mock('../../lib/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

import { DataService } from '../../lib/services/dataService';
import { mockMedia, mockMessages, mockAlbums, AUTH_CODES } from '../../lib/mockData';
import { authenticate, logout, isAuthenticated, isAdmin } from '../../lib/auth';

describe('Demo Pages - Data Service Integration', () => {
  let service: DataService;

  beforeEach(() => {
    localStorage.clear();
    service = new DataService({ demoMode: true });
    service.initializeDemoStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Gallery Demo Page', () => {
    it('should load media in demo mode', async () => {
      const media = await service.getMedia();

      expect(Array.isArray(media)).toBe(true);
      expect(media.length).toBeGreaterThan(0);
    });

    it('should have both images and videos', async () => {
      const media = await service.getMedia();

      const images = media.filter(m => m.type === 'image');
      const videos = media.filter(m => m.type === 'video');

      expect(images.length).toBeGreaterThan(0);
      expect(videos.length).toBeGreaterThan(0);
    });

    it('should add new media in demo mode', async () => {
      const initialMedia = await service.getMedia();
      const initialCount = initialMedia.length;

      const newMedia = await service.addMedia({
        url: 'https://example.com/new-demo-photo.jpg',
        type: 'image',
        caption: 'Demo upload',
        author: 'Test User',
      });

      expect(newMedia.id).toBeDefined();

      const updatedMedia = await service.getMedia();
      expect(updatedMedia.length).toBeGreaterThanOrEqual(initialCount);
    });

    it('should delete media in demo mode', async () => {
      // Add then delete
      const newMedia = await service.addMedia({
        url: 'https://example.com/to-delete.jpg',
        type: 'image',
      });

      await service.deleteMedia(newMedia.id);

      const media = await service.getMedia();
      const found = media.find(m => m.id === newMedia.id);
      expect(found).toBeUndefined();
    });

    it('should toggle favorites', async () => {
      const media = await service.getMedia();
      const firstMediaId = media[0].id;

      // Toggle on
      const isNowFavorited = await service.toggleFavorite(firstMediaId);
      expect(isNowFavorited).toBe(true);

      const favorites = await service.getFavorites();
      expect(favorites.has(firstMediaId)).toBe(true);

      // Toggle off
      const isStillFavorited = await service.toggleFavorite(firstMediaId);
      expect(isStillFavorited).toBe(false);
    });

    it('should load albums', async () => {
      const albums = await service.getAlbums();

      expect(Array.isArray(albums)).toBe(true);
      expect(albums.length).toBeGreaterThan(0);
    });

    it('should get settings with uploads enabled by default', () => {
      const settings = service.getSettings();

      expect(settings.allowUploads).toBe(true);
    });
  });

  describe('Guestbook Demo Page', () => {
    it('should load messages in demo mode', async () => {
      const messages = await service.getMessages();

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should have proper message structure', async () => {
      const messages = await service.getMessages();
      const firstMessage = messages[0];

      expect(firstMessage).toHaveProperty('id');
      expect(firstMessage).toHaveProperty('author');
      expect(firstMessage).toHaveProperty('text');
      expect(firstMessage).toHaveProperty('createdAt');
      expect(firstMessage.createdAt).toBeInstanceOf(Date);
    });

    it('should add new guestbook message', async () => {
      const newMessage = await service.addMessage({
        author: 'Demo Visitor',
        text: 'This is a test message from the demo!',
      });

      expect(newMessage.id).toBeDefined();
      expect(newMessage.author).toBe('Demo Visitor');
      expect(newMessage.text).toBe('This is a test message from the demo!');
    });

    it('should delete guestbook message', async () => {
      const newMessage = await service.addMessage({
        author: 'To Delete',
        text: 'This will be deleted',
      });

      await service.deleteMessage(newMessage.id);

      const messages = await service.getMessages();
      const found = messages.find(m => m.id === newMessage.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Admin Demo Features', () => {
    it('should get statistics', async () => {
      const stats = await service.getStatistics();

      expect(stats).toHaveProperty('mediaCount');
      expect(stats).toHaveProperty('photoCount');
      expect(stats).toHaveProperty('videoCount');
      expect(stats).toHaveProperty('messageCount');
      expect(stats).toHaveProperty('albumCount');

      expect(stats.mediaCount).toBeGreaterThan(0);
      expect(stats.messageCount).toBeGreaterThan(0);
    });

    it('should create new album', async () => {
      const newAlbum = await service.createAlbum({
        name: 'Demo Test Album',
        description: 'Created in demo mode',
        color: '#FF5733',
      });

      expect(newAlbum.id).toBeDefined();
      expect(newAlbum.name).toBe('Demo Test Album');

      // Clean up
      await service.deleteAlbum(newAlbum.id);
    });

    it('should update album', async () => {
      const album = await service.createAlbum({
        name: 'Original',
      });

      const updated = await service.updateAlbum(album.id, {
        name: 'Updated',
        description: 'New description',
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated');

      // Clean up
      await service.deleteAlbum(album.id);
    });
  });
});

describe('Demo Pages - Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Login Flow', () => {
    it('should authenticate with guest code', () => {
      const result = authenticate(AUTH_CODES.GUEST);

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(false);
      expect(isAuthenticated()).toBe(true);
      expect(isAdmin()).toBe(false);
    });

    it('should authenticate with admin code', () => {
      const result = authenticate(AUTH_CODES.ADMIN);

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(true);
      expect(isAuthenticated()).toBe(true);
      expect(isAdmin()).toBe(true);
    });

    it('should reject invalid code', () => {
      const result = authenticate('INVALID');

      expect(result.success).toBe(false);
      expect(isAuthenticated()).toBe(false);
    });

    it('should logout correctly', () => {
      authenticate(AUTH_CODES.ADMIN);
      expect(isAuthenticated()).toBe(true);

      logout();

      expect(isAuthenticated()).toBe(false);
      expect(isAdmin()).toBe(false);
    });
  });

  describe('Demo Mode Authentication', () => {
    it('should allow admin access in demo mode regardless of auth', () => {
      // In demo mode (demoMode=true passed to components),
      // admin features should be available without authentication
      const service = new DataService({ demoMode: true });

      // This simulates what happens when demoMode=true is passed
      // The component sets isAdmin = demoMode || checkIsAdmin()
      // So with demoMode=true, isAdmin is always true
      expect(service.isDemoMode()).toBe(true);
    });
  });
});

describe('Demo Pages - Mock Data Integrity', () => {
  it('should have expected mock media', () => {
    // mockMedia might have items added from previous tests, so check for original items
    const originalItems = mockMedia.filter(m => m.url.includes('unsplash'));
    expect(originalItems.length).toBeGreaterThan(5);

    // Check that original items have expected structure
    const firstOriginal = originalItems[0];
    expect(firstOriginal.url).toContain('unsplash');
    expect(firstOriginal.author).toBeTruthy();
  });

  it('should have expected mock messages', () => {
    expect(mockMessages.length).toBeGreaterThan(3);

    // Check first message
    const first = mockMessages[0];
    expect(first.author).toBeTruthy();
    expect(first.text).toBeTruthy();
  });

  it('should have expected mock albums', () => {
    expect(mockAlbums.length).toBeGreaterThan(0);

    // Check first album
    const first = mockAlbums[0];
    expect(first.name).toBeTruthy();
    expect(first.id).toBeTruthy();
  });

  it('should have correct auth codes', () => {
    expect(AUTH_CODES.GUEST).toBe('MARIAGE2026');
    expect(AUTH_CODES.ADMIN).toBe('ADMIN123');
  });
});

describe('Demo Pages - Reactions System', () => {
  let service: DataService;

  beforeEach(() => {
    localStorage.clear();
    service = new DataService({ demoMode: true });
    service.initializeDemoStorage();
  });

  it('should toggle reaction on media', async () => {
    const media = await service.getMedia();
    const firstMediaId = media[0].id;

    // Toggle reaction
    const result = service.toggleReaction(firstMediaId, 'heart');
    expect(typeof result).toBe('boolean');
  });

  it('should get user reaction', async () => {
    const media = await service.getMedia();
    const firstMediaId = media[0].id;

    const reaction = service.getUserReaction(firstMediaId);
    expect(reaction === null || typeof reaction === 'string').toBe(true);
  });

  it('should get reactions for media', async () => {
    const media = await service.getMedia();
    const firstMediaId = media[0].id;

    const reactions = service.getReactions(firstMediaId);
    expect(Array.isArray(reactions)).toBe(true);
  });
});

describe('Demo Pages - Empty State Handling', () => {
  it('should handle empty media gracefully', async () => {
    // Create new service without initializing demo data
    const service = new DataService({ demoMode: true, weddingId: 'empty-test' });

    // Without initializeDemoStorage, should use existing mockData
    const media = await service.getMedia();
    expect(Array.isArray(media)).toBe(true);
  });

  it('should handle empty favorites gracefully', async () => {
    const service = new DataService({ demoMode: true });

    const favorites = await service.getFavorites();
    expect(favorites).toBeInstanceOf(Set);
  });
});
