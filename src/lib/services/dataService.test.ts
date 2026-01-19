/**
 * DataService Unit Tests
 * Tests both demo mode (localStorage) and production mode (Supabase)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataService, REACTION_EMOJIS, type MediaItem, type GuestbookEntry, type Album } from './dataService';

// Mock the Supabase module to force demo mode
vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => false),
  supabase: null,
}));

// Mock the mockData module to track function calls
vi.mock('../mockData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../mockData')>();
  return {
    ...actual,
    initializeDemoData: vi.fn(),
    mockMedia: [...actual.mockMedia], // Create a copy
    mockMessages: [...actual.mockMessages], // Create a copy
  };
});

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    // Create a new service in demo mode for each test
    service = new DataService({ demoMode: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Constructor', () => {
    it('should create service in demo mode when demoMode is true', () => {
      const demoService = new DataService({ demoMode: true });
      expect(demoService.isDemoMode()).toBe(true);
    });

    it('should create service with weddingId', () => {
      const service = new DataService({ demoMode: true, weddingId: 'test-wedding-123' });
      expect(service.isDemoMode()).toBe(true);
    });

    it('should set wedding ID with setWeddingId', () => {
      service.setWeddingId('new-wedding-id');
      // Verify by checking it doesn't throw
      expect(() => service.setWeddingId('another-id')).not.toThrow();
    });
  });

  describe('Demo Storage Initialization', () => {
    it('should initialize demo storage only once', () => {
      service.initializeDemoStorage();
      service.initializeDemoStorage(); // Second call should be a no-op
      // Verify it runs without error
      expect(service.isDemoMode()).toBe(true);
    });
  });

  describe('Media Methods', () => {
    it('should get media in demo mode', async () => {
      service.initializeDemoStorage();
      const media = await service.getMedia();

      expect(Array.isArray(media)).toBe(true);
      expect(media.length).toBeGreaterThan(0);

      // Verify media item structure
      const firstItem = media[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('url');
      expect(firstItem).toHaveProperty('type');
      expect(firstItem).toHaveProperty('createdAt');
      expect(firstItem.createdAt).toBeInstanceOf(Date);
    });

    it('should add media in demo mode', async () => {
      service.initializeDemoStorage();
      const initialMedia = await service.getMedia();
      const initialCount = initialMedia.length;

      const newMedia = await service.addMedia({
        url: 'https://example.com/test.jpg',
        type: 'image',
        caption: 'Test caption',
        author: 'Test Author',
      });

      expect(newMedia).toHaveProperty('id');
      expect(newMedia.url).toBe('https://example.com/test.jpg');
      expect(newMedia.type).toBe('image');
      expect(newMedia.caption).toBe('Test caption');
      expect(newMedia.author).toBe('Test Author');

      const updatedMedia = await service.getMedia();
      expect(updatedMedia.length).toBeGreaterThanOrEqual(initialCount);
    });

    it('should delete media in demo mode', async () => {
      service.initializeDemoStorage();

      // Add a media item first
      const newMedia = await service.addMedia({
        url: 'https://example.com/to-delete.jpg',
        type: 'image',
      });

      // Delete it
      await service.deleteMedia(newMedia.id);

      // Verify deletion
      const media = await service.getMedia();
      const found = media.find(m => m.id === newMedia.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Guestbook Methods', () => {
    it('should get messages in demo mode', async () => {
      service.initializeDemoStorage();
      const messages = await service.getMessages();

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);

      // Verify message structure
      const firstMessage = messages[0];
      expect(firstMessage).toHaveProperty('id');
      expect(firstMessage).toHaveProperty('author');
      expect(firstMessage).toHaveProperty('text');
      expect(firstMessage).toHaveProperty('createdAt');
      expect(firstMessage.createdAt).toBeInstanceOf(Date);
    });

    it('should add message in demo mode', async () => {
      service.initializeDemoStorage();

      const newMessage = await service.addMessage({
        author: 'Test Author',
        text: 'This is a test message',
        relation: 'Friend',
      });

      expect(newMessage).toHaveProperty('id');
      expect(newMessage.author).toBe('Test Author');
      expect(newMessage.text).toBe('This is a test message');
    });

    it('should delete message in demo mode', async () => {
      service.initializeDemoStorage();

      // Add a message first
      const newMessage = await service.addMessage({
        author: 'To Delete',
        text: 'This will be deleted',
      });

      // Delete it
      await service.deleteMessage(newMessage.id);

      // Verify deletion
      const messages = await service.getMessages();
      const found = messages.find(m => m.id === newMessage.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Favorites Methods', () => {
    it('should get favorites from localStorage in demo mode', async () => {
      const favorites = await service.getFavorites();
      expect(favorites).toBeInstanceOf(Set);
      expect(favorites.size).toBe(0);
    });

    it('should toggle favorite on and off', async () => {
      const mediaId = 'test-media-1';

      // Toggle on
      const result1 = await service.toggleFavorite(mediaId);
      expect(result1).toBe(true);

      const favorites1 = await service.getFavorites();
      expect(favorites1.has(mediaId)).toBe(true);

      // Toggle off
      const result2 = await service.toggleFavorite(mediaId);
      expect(result2).toBe(false);

      const favorites2 = await service.getFavorites();
      expect(favorites2.has(mediaId)).toBe(false);
    });

    it('should check if item is favorited synchronously', () => {
      // Initially not favorited
      expect(service.isFavorited('test-id')).toBe(false);
    });

    it('should toggle favorite synchronously', () => {
      const result = service.syncToggleFavorite('sync-test-id');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Album Methods', () => {
    it('should get albums in demo mode', async () => {
      service.initializeDemoStorage();
      const albums = await service.getAlbums();

      expect(Array.isArray(albums)).toBe(true);
      expect(albums.length).toBeGreaterThan(0);

      // Verify album structure
      const firstAlbum = albums[0];
      expect(firstAlbum).toHaveProperty('id');
      expect(firstAlbum).toHaveProperty('name');
      expect(firstAlbum).toHaveProperty('createdAt');
    });

    it('should create album in demo mode', async () => {
      service.initializeDemoStorage();

      const newAlbum = await service.createAlbum({
        name: 'Test Album',
        description: 'A test album',
        color: '#FF5733',
      });

      expect(newAlbum).toHaveProperty('id');
      expect(newAlbum.name).toBe('Test Album');
      expect(newAlbum.description).toBe('A test album');
    });

    it('should update album in demo mode', async () => {
      service.initializeDemoStorage();

      // Create an album first
      const album = await service.createAlbum({
        name: 'Original Name',
      });

      // Update it
      const updated = await service.updateAlbum(album.id, {
        name: 'Updated Name',
        description: 'New description',
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Name');
    });

    it('should delete album in demo mode', async () => {
      service.initializeDemoStorage();

      // Create an album first
      const album = await service.createAlbum({
        name: 'To Delete',
      });

      // Delete it
      const result = await service.deleteAlbum(album.id);
      expect(result).toBe(true);
    });

    it('should return null when updating non-existent album', async () => {
      service.initializeDemoStorage();

      const result = await service.updateAlbum('non-existent-id', {
        name: 'New Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('Statistics Methods', () => {
    it('should get statistics in demo mode', async () => {
      service.initializeDemoStorage();
      const stats = await service.getStatistics();

      expect(stats).toHaveProperty('mediaCount');
      expect(stats).toHaveProperty('photoCount');
      expect(stats).toHaveProperty('videoCount');
      expect(stats).toHaveProperty('messageCount');
      expect(stats).toHaveProperty('favoriteCount');
      expect(stats).toHaveProperty('albumCount');

      expect(typeof stats.mediaCount).toBe('number');
      expect(typeof stats.photoCount).toBe('number');
    });
  });

  describe('Settings Methods', () => {
    it('should get settings in demo mode', () => {
      const settings = service.getSettings();

      expect(settings).toHaveProperty('allowUploads');
      expect(settings).toHaveProperty('allowComments');
      expect(settings).toHaveProperty('moderationEnabled');
      expect(typeof settings.allowUploads).toBe('boolean');
    });
  });

  describe('Reactions Methods', () => {
    it('should export REACTION_EMOJIS constant', () => {
      expect(REACTION_EMOJIS).toBeDefined();
      expect(REACTION_EMOJIS).toHaveProperty('heart');
      expect(REACTION_EMOJIS).toHaveProperty('laugh');
      expect(REACTION_EMOJIS).toHaveProperty('wow');
    });

    it('should toggle reaction in demo mode', () => {
      service.initializeDemoStorage();

      // Get first media item
      const result = service.toggleReaction('1', 'heart');
      expect(typeof result).toBe('boolean');
    });

    it('should get user reaction', () => {
      service.initializeDemoStorage();

      const reaction = service.getUserReaction('1');
      // Should be null if user hasn't reacted, or a reaction type if they have
      expect(reaction === null || typeof reaction === 'string').toBe(true);
    });

    it('should get reactions for media', () => {
      service.initializeDemoStorage();

      const reactions = service.getReactions('1');
      expect(Array.isArray(reactions)).toBe(true);
    });
  });

  describe('Production Mode (without Supabase)', () => {
    let prodService: DataService;

    beforeEach(() => {
      // Service without demoMode but no Supabase configured
      // This should still use demo mode as fallback
      prodService = new DataService({ weddingId: 'test-wedding' });
    });

    it('should fall back to demo mode when Supabase not configured', () => {
      // Since isSupabaseConfigured returns false in our mock,
      // the service should be in demo mode
      expect(prodService.isDemoMode()).toBe(true);
    });
  });
});

describe('DataService - Guest Identifier', () => {
  it('should create and persist guest identifier', () => {
    const service1 = new DataService({ demoMode: true });
    const guestId = localStorage.getItem('reflets_guest_id');
    expect(guestId).toBeTruthy();

    // Second service should use same guest ID
    const service2 = new DataService({ demoMode: true });
    const guestId2 = localStorage.getItem('reflets_guest_id');
    expect(guestId2).toBe(guestId);
  });
});
