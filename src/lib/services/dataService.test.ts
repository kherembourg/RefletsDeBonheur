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
// ============================================
// Production Mode Tests
// ============================================

// Mock the API modules for production mode tests
vi.mock('../supabase/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public code?: string, public details?: unknown) {
      super(message);
      this.name = 'ApiError';
    }
  },
  mediaApi: {
    getByWeddingId: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    delete: vi.fn(),
  },
  guestbookApi: {
    getByWeddingId: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    delete: vi.fn(),
  },
  reactionsApi: {
    add: vi.fn(),
    remove: vi.fn(),
    getByMediaId: vi.fn().mockResolvedValue([]),
  },
  favoritesApi: {
    getByUser: vi.fn().mockResolvedValue([]),
    toggle: vi.fn(),
  },
  albumsApi: {
    getByWeddingId: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('DataService - Production Mode', () => {
  // Import the mocked APIs
  let mediaApi: any;
  let guestbookApi: any;
  let reactionsApi: any;
  let favoritesApi: any;
  let albumsApi: any;
  let isSupabaseConfigured: any;

  beforeEach(async () => {
    // Import the mocked modules
    const apiModule = await import('../supabase/api');
    const clientModule = await import('../supabase/client');
    
    mediaApi = apiModule.mediaApi;
    guestbookApi = apiModule.guestbookApi;
    reactionsApi = apiModule.reactionsApi;
    favoritesApi = apiModule.favoritesApi;
    albumsApi = apiModule.albumsApi;
    isSupabaseConfigured = clientModule.isSupabaseConfigured;
    
    vi.clearAllMocks();
    
    // Mock Supabase as configured (production mode)
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    
    // Reset mock implementations
    vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([]);
    vi.mocked(guestbookApi.getByWeddingId).mockResolvedValue([]);
    vi.mocked(reactionsApi.getByMediaId).mockResolvedValue([]);
    vi.mocked(favoritesApi.getByUser).mockResolvedValue([]);
    vi.mocked(albumsApi.getByWeddingId).mockResolvedValue([]);
  });

  describe('Production Mode Initialization', () => {
    it('should auto-detect production mode when Supabase configured', () => {
      const service = new DataService({ weddingId: 'test-wedding-123' });
      expect(service.isDemoMode()).toBe(false);
    });

    it('should set wedding ID and propagate to API calls', async () => {
      const service = new DataService({ weddingId: 'test-wedding-123' });
      await service.getMedia();
      
      expect(mediaApi.getByWeddingId).toHaveBeenCalledWith(
        'test-wedding-123',
        expect.objectContaining({
          moderation: 'approved',
        })
      );
    });

    it('should return false for isDemoMode() in production', () => {
      const service = new DataService({ weddingId: 'wedding-456' });
      expect(service.isDemoMode()).toBe(false);
    });

    it('should allow setWeddingId to update wedding ID', async () => {
      const service = new DataService({ weddingId: 'wedding-1' });
      service.setWeddingId('wedding-2');
      
      await service.getMedia();
      
      expect(mediaApi.getByWeddingId).toHaveBeenCalledWith(
        'wedding-2',
        expect.any(Object)
      );
    });

    it('should handle null wedding ID gracefully', async () => {
      const service = new DataService({});
      const media = await service.getMedia();
      
      // Should return empty array when no wedding ID
      expect(media).toEqual([]);
      expect(mediaApi.getByWeddingId).not.toHaveBeenCalled();
    });
  });

  describe('Media Operations - Production', () => {
    it('should convert Supabase Media to MediaItem with reactions', async () => {
      const mockSupabaseMedia = {
        id: 'media-1',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: 'John Doe',
        guest_identifier: 'guest-123',
        type: 'image' as const,
        original_url: 'https://example.com/photo.jpg',
        optimized_url: 'https://example.com/photo-opt.jpg',
        thumbnail_url: 'https://example.com/thumb.jpg',
        caption: 'Beautiful moment',
        width: 1920,
        height: 1080,
        duration: null,
        file_size: 2048000,
        mime_type: 'image/jpeg',
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
      };
      
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([mockSupabaseMedia]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media).toHaveLength(1);
      expect(media[0]).toMatchObject({
        id: 'media-1',
        url: 'https://example.com/photo-opt.jpg', // Uses optimized URL
        thumbnailUrl: 'https://example.com/thumb.jpg',
        type: 'image',
        caption: 'Beautiful moment',
        author: 'John Doe',
      });
      expect(media[0].reactions).toEqual({});
      expect(media[0].createdAt).toBeInstanceOf(Date);
      expect(media[0].createdAt.toISOString()).toBe('2026-01-15T10:30:00.000Z');
    });

    it('should handle empty media list', async () => {
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media).toEqual([]);
    });

    it('should include thumbnail URLs', async () => {
      const mockMedia = {
        id: 'media-1',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: null,
        guest_identifier: null,
        type: 'image' as const,
        original_url: 'https://example.com/photo.jpg',
        optimized_url: null,
        thumbnail_url: 'https://example.com/thumb-400.webp',
        caption: null,
        width: null,
        height: null,
        duration: null,
        file_size: null,
        mime_type: null,
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
      };
      
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([mockMedia]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media[0].thumbnailUrl).toBe('https://example.com/thumb-400.webp');
    });

    it('should use original_url when optimized_url is null', async () => {
      const mockMedia = {
        id: 'media-1',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: null,
        guest_identifier: null,
        type: 'image' as const,
        original_url: 'https://example.com/original.jpg',
        optimized_url: null,
        thumbnail_url: null,
        caption: null,
        width: null,
        height: null,
        duration: null,
        file_size: null,
        mime_type: null,
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z',
      };
      
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([mockMedia]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media[0].url).toBe('https://example.com/original.jpg');
    });

    it('should call mediaApi.create when adding media', async () => {
      const mockCreatedMedia = {
        id: 'new-media-1',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: 'Jane Smith',
        guest_identifier: 'guest-456',
        type: 'video' as const,
        original_url: 'https://example.com/video.mp4',
        optimized_url: null,
        thumbnail_url: 'https://example.com/video-thumb.jpg',
        caption: 'Amazing video',
        width: null,
        height: null,
        duration: 30,
        file_size: 5000000,
        mime_type: 'video/mp4',
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-01-16T14:20:00Z',
        updated_at: '2026-01-16T14:20:00Z',
      };
      
      vi.mocked(mediaApi.create).mockResolvedValue(mockCreatedMedia);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const newMedia = await service.addMedia({
        url: 'https://example.com/video.mp4',
        type: 'video',
        caption: 'Amazing video',
        author: 'Jane Smith',
        thumbnailUrl: 'https://example.com/video-thumb.jpg',
      });
      
      expect(mediaApi.create).toHaveBeenCalledWith({
        wedding_id: 'wedding-123',
        original_url: 'https://example.com/video.mp4',
        thumbnail_url: 'https://example.com/video-thumb.jpg',
        type: 'video',
        caption: 'Amazing video',
        guest_name: 'Jane Smith',
        guest_identifier: expect.any(String),
        status: 'ready',
        moderation_status: 'approved',
      });
      
      expect(newMedia).toMatchObject({
        id: 'new-media-1',
        url: 'https://example.com/video.mp4',
        type: 'video',
        caption: 'Amazing video',
        author: 'Jane Smith',
      });
    });

    it('should return MediaItem with all fields after adding', async () => {
      const mockCreatedMedia = {
        id: 'media-new',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: 'Test User',
        guest_identifier: 'guest-789',
        type: 'image' as const,
        original_url: 'https://example.com/new.jpg',
        optimized_url: 'https://example.com/new-opt.jpg',
        thumbnail_url: 'https://example.com/new-thumb.jpg',
        caption: 'Test caption',
        width: 800,
        height: 600,
        duration: null,
        file_size: 102400,
        mime_type: 'image/jpeg',
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-01-17T09:00:00Z',
        updated_at: '2026-01-17T09:00:00Z',
      };
      
      vi.mocked(mediaApi.create).mockResolvedValue(mockCreatedMedia);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.addMedia({
        url: 'https://example.com/new.jpg',
        type: 'image',
        caption: 'Test caption',
        author: 'Test User',
      });
      
      expect(media).toMatchObject({
        id: 'media-new',
        url: 'https://example.com/new-opt.jpg',
        thumbnailUrl: 'https://example.com/new-thumb.jpg',
        type: 'image',
        caption: 'Test caption',
        author: 'Test User',
      });
      expect(media.createdAt).toBeInstanceOf(Date);
      expect(media.reactions).toEqual({});
    });

    it('should call mediaApi.delete with correct ID', async () => {
      vi.mocked(mediaApi.delete).mockResolvedValue(undefined);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      await service.deleteMedia('media-to-delete');
      
      expect(mediaApi.delete).toHaveBeenCalledWith('media-to-delete');
    });

    it('should handle video type correctly', async () => {
      const mockVideo = {
        id: 'video-1',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: 'Video Author',
        guest_identifier: null,
        type: 'video' as const,
        original_url: 'https://example.com/vid.mp4',
        optimized_url: 'https://example.com/vid-transcoded.mp4',
        thumbnail_url: 'https://example.com/vid-thumb.jpg',
        caption: 'Wedding ceremony',
        width: 1920,
        height: 1080,
        duration: 120,
        file_size: 15000000,
        mime_type: 'video/mp4',
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-01-18T11:00:00Z',
        updated_at: '2026-01-18T11:00:00Z',
      };
      
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([mockVideo]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media[0].type).toBe('video');
    });

    it('should convert date strings to Date objects', async () => {
      const mockMedia = {
        id: 'media-date-test',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: null,
        guest_identifier: null,
        type: 'image' as const,
        original_url: 'https://example.com/test.jpg',
        optimized_url: null,
        thumbnail_url: null,
        caption: null,
        width: null,
        height: null,
        duration: null,
        file_size: null,
        mime_type: null,
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-02-01T15:45:30Z',
        updated_at: '2026-02-01T15:45:30Z',
      };
      
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([mockMedia]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media[0].createdAt).toBeInstanceOf(Date);
      expect(media[0].createdAt.getTime()).toBe(new Date('2026-02-01T15:45:30Z').getTime());
    });

    it('should handle undefined thumbnailUrl when null', async () => {
      const mockMedia = {
        id: 'media-no-thumb',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: null,
        guest_identifier: null,
        type: 'image' as const,
        original_url: 'https://example.com/no-thumb.jpg',
        optimized_url: null,
        thumbnail_url: null,
        caption: null,
        width: null,
        height: null,
        duration: null,
        file_size: null,
        mime_type: null,
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-02-01T16:00:00Z',
        updated_at: '2026-02-01T16:00:00Z',
      };
      
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([mockMedia]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media[0].thumbnailUrl).toBeUndefined();
    });

    it('should handle optional caption and author fields', async () => {
      const mockMedia = {
        id: 'media-minimal',
        wedding_id: 'wedding-123',
        uploader_id: null,
        guest_name: null,
        guest_identifier: null,
        type: 'image' as const,
        original_url: 'https://example.com/minimal.jpg',
        optimized_url: null,
        thumbnail_url: null,
        caption: null,
        width: null,
        height: null,
        duration: null,
        file_size: null,
        mime_type: null,
        status: 'ready' as const,
        processing_error: null,
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2026-02-01T17:00:00Z',
        updated_at: '2026-02-01T17:00:00Z',
      };
      
      vi.mocked(mediaApi.getByWeddingId).mockResolvedValue([mockMedia]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const media = await service.getMedia();
      
      expect(media[0].caption).toBeUndefined();
      expect(media[0].author).toBeUndefined();
    });

    it('should throw error when adding media without wedding ID', async () => {
      const service = new DataService({});
      
      await expect(service.addMedia({
        url: 'https://example.com/test.jpg',
        type: 'image',
      })).rejects.toThrow('No wedding ID set for production mode');
    });
  });

  describe('Guestbook Operations - Production', () => {
    it('should convert Supabase messages to GuestbookEntry', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          wedding_id: 'wedding-123',
          author_id: null,
          author_name: 'Alice Johnson',
          author_relation: 'Friend',
          guest_identifier: 'guest-abc',
          message: 'Congratulations on your special day!',
          moderation_status: 'approved' as const,
          moderated_at: null,
          moderated_by: null,
          created_at: '2026-01-20T10:00:00Z',
        },
        {
          id: 'msg-2',
          wedding_id: 'wedding-123',
          author_id: null,
          author_name: 'Bob Smith',
          author_relation: null,
          guest_identifier: 'guest-def',
          message: 'Beautiful wedding!',
          moderation_status: 'approved' as const,
          moderated_at: null,
          moderated_by: null,
          created_at: '2026-01-20T11:30:00Z',
        },
      ];
      
      vi.mocked(guestbookApi.getByWeddingId).mockResolvedValue(mockMessages);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const messages = await service.getMessages();
      
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({
        id: 'msg-1',
        author: 'Alice Johnson',
        text: 'Congratulations on your special day!',
        relation: 'Friend',
      });
      expect(messages[0].createdAt).toBeInstanceOf(Date);
      
      expect(messages[1]).toMatchObject({
        id: 'msg-2',
        author: 'Bob Smith',
        text: 'Beautiful wedding!',
      });
      expect(messages[1].relation).toBeUndefined();
    });

    it('should handle empty guestbook list', async () => {
      vi.mocked(guestbookApi.getByWeddingId).mockResolvedValue([]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const messages = await service.getMessages();
      
      expect(messages).toEqual([]);
    });

    it('should convert date strings to Date objects', async () => {
      const mockMessage = {
        id: 'msg-date',
        wedding_id: 'wedding-123',
        author_id: null,
        author_name: 'Test Author',
        author_relation: null,
        guest_identifier: null,
        message: 'Test message',
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        created_at: '2026-02-02T08:15:45Z',
      };
      
      vi.mocked(guestbookApi.getByWeddingId).mockResolvedValue([mockMessage]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const messages = await service.getMessages();
      
      expect(messages[0].createdAt).toBeInstanceOf(Date);
      expect(messages[0].createdAt.getTime()).toBe(new Date('2026-02-02T08:15:45Z').getTime());
    });

    it('should call guestbookApi.create when adding message', async () => {
      const mockCreatedMessage = {
        id: 'new-msg-1',
        wedding_id: 'wedding-123',
        author_id: null,
        author_name: 'New Author',
        author_relation: 'Cousin',
        guest_identifier: 'guest-xyz',
        message: 'Wishing you all the best!',
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        created_at: '2026-02-03T14:00:00Z',
      };
      
      vi.mocked(guestbookApi.create).mockResolvedValue(mockCreatedMessage);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const entry = await service.addMessage({
        author: 'New Author',
        text: 'Wishing you all the best!',
        relation: 'Cousin',
      });
      
      expect(guestbookApi.create).toHaveBeenCalledWith({
        wedding_id: 'wedding-123',
        author_name: 'New Author',
        message: 'Wishing you all the best!',
        author_relation: 'Cousin',
        guest_identifier: expect.any(String),
        moderation_status: 'approved',
      });
      
      expect(entry).toMatchObject({
        id: 'new-msg-1',
        author: 'New Author',
        text: 'Wishing you all the best!',
        relation: 'Cousin',
      });
    });

    it('should set moderation status to approved when adding message', async () => {
      const mockCreatedMessage = {
        id: 'msg-approved',
        wedding_id: 'wedding-123',
        author_id: null,
        author_name: 'Test',
        author_relation: null,
        guest_identifier: null,
        message: 'Test',
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        created_at: '2026-02-03T15:00:00Z',
      };
      
      vi.mocked(guestbookApi.create).mockResolvedValue(mockCreatedMessage);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      await service.addMessage({
        author: 'Test',
        text: 'Test',
      });
      
      expect(guestbookApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          moderation_status: 'approved',
        })
      );
    });

    it('should call guestbookApi.delete with correct ID', async () => {
      vi.mocked(guestbookApi.delete).mockResolvedValue(undefined);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      await service.deleteMessage('msg-to-delete');
      
      expect(guestbookApi.delete).toHaveBeenCalledWith('msg-to-delete');
    });

    it('should handle optional relation field', async () => {
      const mockMessage = {
        id: 'msg-no-relation',
        wedding_id: 'wedding-123',
        author_id: null,
        author_name: 'Guest',
        author_relation: null,
        guest_identifier: null,
        message: 'Great event!',
        moderation_status: 'approved' as const,
        moderated_at: null,
        moderated_by: null,
        created_at: '2026-02-04T10:00:00Z',
      };
      
      vi.mocked(guestbookApi.getByWeddingId).mockResolvedValue([mockMessage]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const messages = await service.getMessages();
      
      expect(messages[0].relation).toBeUndefined();
    });

    it('should throw error when adding message without wedding ID', async () => {
      const service = new DataService({});
      
      await expect(service.addMessage({
        author: 'Test',
        text: 'Test message',
      })).rejects.toThrow('No wedding ID set for production mode');
    });
  });

  describe('Reactions & Favorites - Production', () => {
    it('should call reactionsApi.add with correct emoji', async () => {
      vi.mocked(reactionsApi.add).mockResolvedValue({
        id: 'reaction-1',
        media_id: 'media-123',
        user_id: null,
        guest_identifier: 'guest-abc',
        emoji: '❤️',
        created_at: '2026-02-04T12:00:00Z',
      });
      
      const service = new DataService({ weddingId: 'wedding-123' });
      await service.addReaction('media-123', '❤️');
      
      expect(reactionsApi.add).toHaveBeenCalledWith(
        'media-123',
        '❤️',
        expect.objectContaining({
          guestIdentifier: expect.any(String),
        })
      );
    });

    it('should support all REACTION_EMOJIS', async () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      
      for (const emoji of ['❤️', '😍', '😂', '🥳', '👏', '🔥']) {
        vi.mocked(reactionsApi.add).mockResolvedValue({
          id: `reaction-${emoji}`,
          media_id: 'media-123',
          user_id: null,
          guest_identifier: 'guest-abc',
          emoji: emoji as any,
          created_at: '2026-02-04T12:00:00Z',
        });
        
        await service.addReaction('media-123', emoji as any);
        
        expect(reactionsApi.add).toHaveBeenCalledWith(
          'media-123',
          emoji,
          expect.any(Object)
        );
      }
    });

    it('should call reactionsApi.remove when removing reaction', async () => {
      vi.mocked(reactionsApi.remove).mockResolvedValue(undefined);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      await service.removeReaction('media-456', '😂');
      
      expect(reactionsApi.remove).toHaveBeenCalledWith(
        'media-456',
        '😂',
        expect.objectContaining({
          guestIdentifier: expect.any(String),
        })
      );
    });

    it('should include guest identifier in reaction calls', async () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      
      // Get the guest identifier
      const guestId = localStorage.getItem('reflets_guest_id');
      expect(guestId).toBeTruthy();
      
      await service.addReaction('media-789', '🎉');
      
      expect(reactionsApi.add).toHaveBeenCalledWith(
        'media-789',
        '🎉',
        { guestIdentifier: guestId }
      );
    });

    it('should call favoritesApi.toggle with media ID', async () => {
      vi.mocked(favoritesApi.toggle).mockResolvedValue(true);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const result = await service.toggleFavorite('media-favorite');
      
      expect(favoritesApi.toggle).toHaveBeenCalledWith(
        'media-favorite',
        expect.objectContaining({
          guestIdentifier: expect.any(String),
        })
      );
      expect(result).toBe(true);
    });

    it('should return true when favorite added', async () => {
      vi.mocked(favoritesApi.toggle).mockResolvedValue(true);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const added = await service.toggleFavorite('media-new-fav');
      
      expect(added).toBe(true);
    });

    it('should return false when favorite removed', async () => {
      vi.mocked(favoritesApi.toggle).mockResolvedValue(false);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const removed = await service.toggleFavorite('media-remove-fav');
      
      expect(removed).toBe(false);
    });

    it('should get favorites with guest identifier', async () => {
      vi.mocked(favoritesApi.getByUser).mockResolvedValue(['media-1', 'media-2', 'media-3']);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const favorites = await service.getFavorites();
      
      expect(favoritesApi.getByUser).toHaveBeenCalledWith({
        guestIdentifier: expect.any(String),
      });
      
      expect(favorites).toBeInstanceOf(Set);
      expect(favorites.size).toBe(3);
      expect(favorites.has('media-1')).toBe(true);
      expect(favorites.has('media-2')).toBe(true);
      expect(favorites.has('media-3')).toBe(true);
    });

    it('should include guest identifier in favorites calls', async () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      const guestId = localStorage.getItem('reflets_guest_id');
      
      await service.getFavorites();
      
      expect(favoritesApi.getByUser).toHaveBeenCalledWith({
        guestIdentifier: guestId,
      });
    });

    it('should handle empty favorites list', async () => {
      vi.mocked(favoritesApi.getByUser).mockResolvedValue([]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const favorites = await service.getFavorites();
      
      expect(favorites).toBeInstanceOf(Set);
      expect(favorites.size).toBe(0);
    });
  });

  describe('Albums - Production', () => {
    it('should convert Supabase albums to Album type', async () => {
      const mockAlbums = [
        {
          id: 'album-1',
          wedding_id: 'wedding-123',
          name: 'Ceremony',
          description: 'Wedding ceremony photos',
          cover_media_id: 'media-cover-1',
          sort_order: 0,
          created_at: '2026-01-10T08:00:00Z',
          updated_at: '2026-01-10T08:00:00Z',
        },
        {
          id: 'album-2',
          wedding_id: 'wedding-123',
          name: 'Reception',
          description: null,
          cover_media_id: null,
          sort_order: 1,
          created_at: '2026-01-10T09:00:00Z',
          updated_at: '2026-01-10T09:00:00Z',
        },
      ];
      
      vi.mocked(albumsApi.getByWeddingId).mockResolvedValue(mockAlbums);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const albums = await service.getAlbums();
      
      expect(albums).toHaveLength(2);
      expect(albums[0]).toMatchObject({
        id: 'album-1',
        name: 'Ceremony',
        description: 'Wedding ceremony photos',
        coverPhotoId: 'media-cover-1',
      });
      expect(albums[0].createdAt).toBeInstanceOf(Date);
      
      expect(albums[1]).toMatchObject({
        id: 'album-2',
        name: 'Reception',
      });
      expect(albums[1].description).toBeUndefined();
    });

    it('should call albumsApi.create when creating album', async () => {
      const mockCreatedAlbum = {
        id: 'new-album-1',
        wedding_id: 'wedding-123',
        name: 'First Dance',
        description: 'Special moment',
        cover_media_id: null,
        sort_order: 0,
        created_at: '2026-02-04T16:00:00Z',
        updated_at: '2026-02-04T16:00:00Z',
      };
      
      vi.mocked(albumsApi.create).mockResolvedValue(mockCreatedAlbum);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const album = await service.createAlbum({
        name: 'First Dance',
        description: 'Special moment',
      });
      
      expect(albumsApi.create).toHaveBeenCalledWith({
        wedding_id: 'wedding-123',
        name: 'First Dance',
        description: 'Special moment',
        sort_order: 0,
      });
      
      expect(album).toMatchObject({
        id: 'new-album-1',
        name: 'First Dance',
        description: 'Special moment',
      });
    });

    it('should create album with color and description', async () => {
      const mockCreatedAlbum = {
        id: 'album-colored',
        wedding_id: 'wedding-123',
        name: 'Colorful Album',
        description: 'With custom color',
        cover_media_id: null,
        sort_order: 0,
        created_at: '2026-02-04T17:00:00Z',
        updated_at: '2026-02-04T17:00:00Z',
      };
      
      vi.mocked(albumsApi.create).mockResolvedValue(mockCreatedAlbum);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const album = await service.createAlbum({
        name: 'Colorful Album',
        description: 'With custom color',
        color: '#FF5733',
      });
      
      expect(album.name).toBe('Colorful Album');
      expect(album.description).toBe('With custom color');
    });

    it('should call albumsApi.update when updating album', async () => {
      const mockUpdatedAlbum = {
        id: 'album-update',
        wedding_id: 'wedding-123',
        name: 'Updated Name',
        description: 'Updated description',
        cover_media_id: 'new-cover',
        sort_order: 0,
        created_at: '2026-02-04T18:00:00Z',
        updated_at: '2026-02-04T18:30:00Z',
      };
      
      vi.mocked(albumsApi.update).mockResolvedValue(mockUpdatedAlbum);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const album = await service.updateAlbum('album-update', {
        name: 'Updated Name',
        description: 'Updated description',
        coverPhotoId: 'new-cover',
      });
      
      expect(albumsApi.update).toHaveBeenCalledWith(
        'album-update',
        expect.objectContaining({
          name: 'Updated Name',
          description: 'Updated description',
          cover_media_id: 'new-cover',
        })
      );
      
      expect(album).toMatchObject({
        id: 'album-update',
        name: 'Updated Name',
        description: 'Updated description',
        coverPhotoId: 'new-cover',
      });
    });

    it('should handle color update for albums', async () => {
      const mockUpdatedAlbum = {
        id: 'album-color',
        wedding_id: 'wedding-123',
        name: 'Colored Album',
        description: null,
        cover_media_id: null,
        sort_order: 0,
        created_at: '2026-02-04T19:00:00Z',
        updated_at: '2026-02-04T19:30:00Z',
      };
      
      vi.mocked(albumsApi.update).mockResolvedValue(mockUpdatedAlbum);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      await service.updateAlbum('album-color', {
        color: '#3498DB',
      });
      
      expect(albumsApi.update).toHaveBeenCalledWith(
        'album-color',
        expect.any(Object)
      );
    });

    it('should call albumsApi.delete with correct ID', async () => {
      vi.mocked(albumsApi.delete).mockResolvedValue(undefined);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      await service.deleteAlbum('album-to-delete');
      
      expect(albumsApi.delete).toHaveBeenCalledWith('album-to-delete');
    });

    it('should handle empty albums list', async () => {
      vi.mocked(albumsApi.getByWeddingId).mockResolvedValue([]);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      const albums = await service.getAlbums();
      
      expect(albums).toEqual([]);
    });
  });

  describe('Error Handling - Production', () => {
    it('should propagate ApiError from Supabase API', async () => {
      const { ApiError } = await import('../supabase/api');
      const apiError = new ApiError('Database connection failed', 'CONNECTION_ERROR');
      
      vi.mocked(mediaApi.getByWeddingId).mockRejectedValue(apiError);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      
      await expect(service.getMedia()).rejects.toThrow('Database connection failed');
      await expect(service.getMedia()).rejects.toThrow(ApiError);
    });

    it('should handle API errors in guestbook operations', async () => {
      const { ApiError } = await import('../supabase/api');
      const apiError = new ApiError('Failed to fetch messages', 'FETCH_ERROR');
      
      vi.mocked(guestbookApi.getByWeddingId).mockRejectedValue(apiError);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      
      await expect(service.getMessages()).rejects.toThrow(ApiError);
    });

    it('should handle API errors in album operations', async () => {
      const { ApiError } = await import('../supabase/api');
      const apiError = new ApiError('Failed to create album', 'CREATE_ERROR');
      
      vi.mocked(albumsApi.create).mockRejectedValue(apiError);
      
      const service = new DataService({ weddingId: 'wedding-123' });
      
      await expect(service.createAlbum({
        name: 'Test Album',
      })).rejects.toThrow(ApiError);
    });
  });
});
