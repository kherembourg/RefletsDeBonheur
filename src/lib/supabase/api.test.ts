import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  Media,
  GuestbookMessage,
  Wedding,
  Reaction,
  Favorite,
  ReactionEmoji,
  InsertTables,
  UpdateTables,
} from './types';

// Helper to create a fully chainable query mock
function createQueryMock() {
  const mock: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };

  // Make all methods return the mock itself for chaining
  Object.keys(mock).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
      mock[key].mockReturnValue(mock);
    }
  });

  return mock;
}

// Use vi.hoisted to define mocks that can be referenced in vi.mock
const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock Supabase client
vi.mock('./client', () => ({
  supabase: mockSupabaseClient,
  isSupabaseConfigured: vi.fn(() => true),
}));

// Now import the API after mocking
import {
  mediaApi,
  guestbookApi,
  weddingsApi,
  reactionsApi,
  favoritesApi,
  ApiError,
} from './api';

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================
// MEDIA API TESTS (12 tests)
// ============================================

describe('mediaApi', () => {
  describe('getByWeddingId', () => {
    it('should return array of media for wedding_id', async () => {
      const mockMedia: Media[] = [
        {
          id: 'media-1',
          wedding_id: 'wedding-1',
          uploader_id: 'user-1',
          guest_name: null,
          guest_identifier: null,
          type: 'image',
          original_url: 'https://example.com/image.jpg',
          optimized_url: null,
          thumbnail_url: null,
          caption: 'Test photo',
          width: 1920,
          height: 1080,
          duration: null,
          file_size: 1024000,
          mime_type: 'image/jpeg',
          status: 'ready',
          processing_error: null,
          moderation_status: 'approved',
          moderated_at: null,
          moderated_by: null,
          exif_data: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const queryMock = createQueryMock();
      // The query is awaited, so we need to make it thenable
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: mockMedia, error: null });
        return Promise.resolve({ data: mockMedia, error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mediaApi.getByWeddingId('wedding-1');

      expect(result).toEqual(mockMedia);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
      expect(queryMock.eq).toHaveBeenCalledWith('wedding_id', 'wedding-1');
      expect(queryMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle pagination with limit and offset', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await mediaApi.getByWeddingId('wedding-1', { limit: 20, offset: 10 });

      expect(queryMock.limit).toHaveBeenCalledWith(20);
      expect(queryMock.range).toHaveBeenCalledWith(10, 29);
    });

    it('should filter by type (photo vs video)', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await mediaApi.getByWeddingId('wedding-1', { type: 'image' });

      expect(queryMock.eq).toHaveBeenCalledWith('type', 'image');
    });

    it('should filter by status', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await mediaApi.getByWeddingId('wedding-1', { status: 'ready' });

      expect(queryMock.eq).toHaveBeenCalledWith('status', 'ready');
    });

    it('should filter by moderation status', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await mediaApi.getByWeddingId('wedding-1', { moderation: 'approved', limit: 10 });

      expect(queryMock.eq).toHaveBeenCalledWith('moderation_status', 'approved');
    });

    it('should return empty array when no media found', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mediaApi.getByWeddingId('wedding-empty');

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return media object when found', async () => {
      const mockMedia: Media = {
        id: 'media-1',
        wedding_id: 'wedding-1',
        uploader_id: 'user-1',
        guest_name: null,
        guest_identifier: null,
        type: 'image',
        original_url: 'https://example.com/image.jpg',
        optimized_url: null,
        thumbnail_url: null,
        caption: 'Test photo',
        width: 1920,
        height: 1080,
        duration: null,
        file_size: 1024000,
        mime_type: 'image/jpeg',
        status: 'ready',
        processing_error: null,
        moderation_status: 'approved',
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: mockMedia, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mediaApi.getById('media-1');

      expect(result).toEqual(mockMedia);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'media-1');
      expect(queryMock.single).toHaveBeenCalled();
    });

    it('should return null when not found (PGRST116)', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mediaApi.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create media with InsertTables type and return created media', async () => {
      const insertData: InsertTables<'media'> = {
        wedding_id: 'wedding-1',
        type: 'image',
        original_url: 'https://example.com/new.jpg',
        status: 'ready',
        moderation_status: 'pending',
      };

      const createdMedia: Media = {
        id: 'media-new',
        ...insertData,
        uploader_id: null,
        guest_name: null,
        guest_identifier: null,
        optimized_url: null,
        thumbnail_url: null,
        caption: null,
        width: null,
        height: null,
        duration: null,
        file_size: null,
        mime_type: null,
        processing_error: null,
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: createdMedia, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mediaApi.create(insertData);

      expect(result).toEqual(createdMedia);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
      expect(queryMock.insert).toHaveBeenCalledWith(insertData);
      expect(queryMock.single).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update media with UpdateTables type and return updated media', async () => {
      const updates: UpdateTables<'media'> = {
        caption: 'Updated caption',
        moderation_status: 'approved',
      };

      const updatedMedia: Media = {
        id: 'media-1',
        wedding_id: 'wedding-1',
        uploader_id: 'user-1',
        guest_name: null,
        guest_identifier: null,
        type: 'image',
        original_url: 'https://example.com/image.jpg',
        optimized_url: null,
        thumbnail_url: null,
        caption: 'Updated caption',
        width: 1920,
        height: 1080,
        duration: null,
        file_size: 1024000,
        mime_type: 'image/jpeg',
        status: 'ready',
        processing_error: null,
        moderation_status: 'approved',
        moderated_at: null,
        moderated_by: null,
        exif_data: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: updatedMedia, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mediaApi.update('media-1', updates);

      expect(result).toEqual(updatedMedia);
      expect(queryMock.update).toHaveBeenCalledWith(updates);
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'media-1');
    });
  });

  describe('delete', () => {
    it('should delete media by id', async () => {
      const queryMock = createQueryMock();
      queryMock.eq.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await mediaApi.delete('media-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('media');
      expect(queryMock.delete).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'media-1');
    });
  });

  describe('error handling', () => {
    it('should throw ApiError with context on failure', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({
        data: null,
        error: { code: 'DATABASE_ERROR', message: 'Connection failed' },
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await expect(mediaApi.getById('media-1')).rejects.toThrow(ApiError);
    });
  });
});

// ============================================
// GUESTBOOK API TESTS (8 tests)
// ============================================

describe('guestbookApi', () => {
  describe('getByWeddingId', () => {
    it('should return array of GuestbookMessage for wedding_id', async () => {
      const mockMessages: GuestbookMessage[] = [
        {
          id: 'msg-1',
          wedding_id: 'wedding-1',
          author_id: 'user-1',
          author_name: 'John Doe',
          author_relation: 'Friend',
          guest_identifier: null,
          message: 'Congratulations!',
          moderation_status: 'approved',
          moderated_at: null,
          moderated_by: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: mockMessages, error: null });
        return Promise.resolve({ data: mockMessages, error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await guestbookApi.getByWeddingId('wedding-1');

      expect(result).toEqual(mockMessages);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('guestbook_messages');
      expect(queryMock.eq).toHaveBeenCalledWith('wedding_id', 'wedding-1');
      expect(queryMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should order by created_at desc', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await guestbookApi.getByWeddingId('wedding-1');

      expect(queryMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should filter by moderation status', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await guestbookApi.getByWeddingId('wedding-1', { moderation: 'approved', limit: 10 });

      expect(queryMock.eq).toHaveBeenCalledWith('moderation_status', 'approved');
    });

    it('should apply limit when provided', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await guestbookApi.getByWeddingId('wedding-1', { limit: 10 });

      expect(queryMock.limit).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no messages found', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await guestbookApi.getByWeddingId('wedding-empty');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create guestbook message and return created message', async () => {
      const insertData: InsertTables<'guestbook_messages'> = {
        wedding_id: 'wedding-1',
        author_name: 'Jane Smith',
        message: 'Best wishes!',
        moderation_status: 'pending',
      };

      const createdMessage: GuestbookMessage = {
        id: 'msg-new',
        ...insertData,
        author_id: null,
        author_relation: null,
        guest_identifier: null,
        moderated_at: null,
        moderated_by: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: createdMessage, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await guestbookApi.create(insertData);

      expect(result).toEqual(createdMessage);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('guestbook_messages');
      expect(queryMock.insert).toHaveBeenCalledWith(insertData);
    });
  });

  describe('delete', () => {
    it('should delete guestbook message by id', async () => {
      const queryMock = createQueryMock();
      queryMock.eq.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await guestbookApi.delete('msg-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('guestbook_messages');
      expect(queryMock.delete).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'msg-1');
    });
  });

  describe('error handling', () => {
    it('should throw ApiError with context on failure', async () => {
      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: null, error: { code: 'DATABASE_ERROR', message: 'Connection failed' } });
        return Promise.resolve({ data: null, error: { code: 'DATABASE_ERROR', message: 'Connection failed' } });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await expect(guestbookApi.getByWeddingId('wedding-1')).rejects.toThrow(ApiError);
    });
  });
});

// ============================================
// WEDDINGS API TESTS (10 tests)
// ============================================

describe('weddingsApi', () => {
  const mockWedding: Wedding = {
    id: 'wedding-1',
    owner_id: 'user-1',
    slug: 'smith-jones-2024',
    pin_code: '1234',
    magic_token: 'token-abc',
    name: 'Smith & Jones Wedding',
    bride_name: 'Jane Smith',
    groom_name: 'John Jones',
    wedding_date: '2024-06-15',
    venue_name: 'Grand Hotel',
    venue_address: '123 Main St',
    venue_lat: 40.7128,
    venue_lng: -74.006,
    venue_map_url: 'https://maps.google.com',
    config: {
      theme: {
        name: 'classic',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        fontFamily: 'Arial',
      },
      features: {
        gallery: true,
        guestbook: true,
        rsvp: true,
        liveWall: false,
        geoFencing: false,
      },
      moderation: {
        enabled: true,
        autoApprove: false,
      },
      timeline: [],
    },
    hero_image_url: 'https://example.com/hero.jpg',
    is_published: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('getBySlug', () => {
    it('should return wedding when found', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: mockWedding, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.getBySlug('smith-jones-2024');

      expect(result).toEqual(mockWedding);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('weddings');
      expect(queryMock.eq).toHaveBeenCalledWith('slug', 'smith-jones-2024');
      expect(queryMock.single).toHaveBeenCalled();
    });

    it('should return null when not found (PGRST116)', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.getBySlug('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return wedding when found', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: mockWedding, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.getById('wedding-1');

      expect(result).toEqual(mockWedding);
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'wedding-1');
    });

    it('should return null when not found', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update wedding with UpdateTables type and return updated wedding', async () => {
      const updates: UpdateTables<'weddings'> = {
        name: 'Updated Wedding Name',
        is_published: true,
      };

      const updatedWedding = { ...mockWedding, ...updates };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: updatedWedding, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.update('wedding-1', updates);

      expect(result).toEqual(updatedWedding);
      expect(queryMock.update).toHaveBeenCalledWith(updates);
      expect(queryMock.eq).toHaveBeenCalledWith('id', 'wedding-1');
    });

    it('should update config field (WeddingConfig type)', async () => {
      const configUpdates: UpdateTables<'weddings'> = {
        config: {
          ...mockWedding.config,
          features: {
            ...mockWedding.config.features,
            gallery: false,
          },
        },
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({
        data: { ...mockWedding, ...configUpdates },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.update('wedding-1', configUpdates);

      expect(result.config.features.gallery).toBe(false);
    });
  });

  describe('getByOwnerId', () => {
    it('should return multiple weddings for owner_id', async () => {
      const mockWeddings = [mockWedding, { ...mockWedding, id: 'wedding-2' }];

      const queryMock = createQueryMock();
      queryMock.then.mockImplementation((resolve) => {
        resolve({ data: mockWeddings, error: null });
        return Promise.resolve({ data: mockWeddings, error: null });
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.getByOwnerId('user-1');

      expect(result).toEqual(mockWeddings);
      expect(queryMock.eq).toHaveBeenCalledWith('owner_id', 'user-1');
      expect(queryMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('getStats', () => {
    it('should return wedding stats when found', async () => {
      const mockStats = {
        wedding_id: 'wedding-1',
        media_count: 100,
        photo_count: 90,
        video_count: 10,
        guestbook_message_count: 25,
        rsvp_yes_count: 50,
        rsvp_no_count: 10,
        rsvp_maybe_count: 5,
        total_guests: 65,
        total_reactions: 200,
        total_favorites: 80,
        unique_uploaders: 15,
        total_storage_bytes: 524288000,
        last_activity_at: '2024-01-15T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: mockStats, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.getStats('wedding-1');

      expect(result).toEqual(mockStats);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wedding_stats');
      expect(queryMock.eq).toHaveBeenCalledWith('wedding_id', 'wedding-1');
    });

    it('should return null when stats not found', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await weddingsApi.getStats('wedding-new');

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw ApiError on update failure', async () => {
      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({
        data: null,
        error: { code: 'UNIQUE_VIOLATION', message: 'Slug already exists' },
      });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await expect(
        weddingsApi.update('wedding-1', { slug: 'existing-slug' })
      ).rejects.toThrow(ApiError);
    });
  });
});

// ============================================
// REACTIONS API TESTS (5 tests)
// ============================================

describe('reactionsApi', () => {
  describe('add', () => {
    it('should add reaction and return Reaction object', async () => {
      const mockReaction: Reaction = {
        id: 'reaction-1',
        media_id: 'media-1',
        user_id: 'user-1',
        guest_identifier: null,
        emoji: '❤️',
        created_at: '2024-01-01T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: mockReaction, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await reactionsApi.add('media-1', '❤️', { userId: 'user-1' });

      expect(result).toEqual(mockReaction);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reactions');
      expect(queryMock.insert).toHaveBeenCalledWith({
        media_id: 'media-1',
        emoji: '❤️',
        user_id: 'user-1',
        guest_identifier: null,
      });
    });
  });

  describe('remove', () => {
    it('should remove reaction by user_id', async () => {
      // Create a fresh query mock for each call in the chain
      const queryMock = createQueryMock();
      
      // The last .eq() in the chain will resolve
      // For reactions API: .delete().eq('media_id').eq('emoji').eq('user_id')
      // So we need the third .eq() to resolve
      let callCount = 0;
      queryMock.eq.mockImplementation(() => {
        callCount++;
        if (callCount === 3) {
          return Promise.resolve({ data: null, error: null });
        }
        return queryMock;
      });
      
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await reactionsApi.remove('media-1', '❤️', { userId: 'user-1' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('reactions');
      expect(queryMock.delete).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('media_id', 'media-1');
      expect(queryMock.eq).toHaveBeenCalledWith('emoji', '❤️');
      expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });

  describe('getByMediaId', () => {
    it('should return reactions array for media', async () => {
      const mockReactions: Reaction[] = [
        {
          id: 'reaction-1',
          media_id: 'media-1',
          user_id: 'user-1',
          guest_identifier: null,
          emoji: '❤️',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'reaction-2',
          media_id: 'media-1',
          user_id: 'user-2',
          guest_identifier: null,
          emoji: '😍',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const queryMock = createQueryMock();
      queryMock.eq.mockResolvedValue({ data: mockReactions, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await reactionsApi.getByMediaId('media-1');

      expect(result).toEqual(mockReactions);
      expect(queryMock.eq).toHaveBeenCalledWith('media_id', 'media-1');
    });
  });

  describe('getCountsByMediaId', () => {
    it('should return reaction counts with emoji breakdown', async () => {
      const mockReactions = [
        { emoji: '❤️' as ReactionEmoji },
        { emoji: '❤️' as ReactionEmoji },
        { emoji: '😍' as ReactionEmoji },
        { emoji: '🔥' as ReactionEmoji },
      ];

      const queryMock = createQueryMock();
      queryMock.eq.mockResolvedValue({ data: mockReactions, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await reactionsApi.getCountsByMediaId('media-1');

      expect(result).toEqual({
        '❤️': 2,
        '😍': 1,
        '😂': 0,
        '🥳': 0,
        '👏': 0,
        '🔥': 1,
      });
    });
  });

  describe('guest support', () => {
    it('should support guest_identifier for reactions', async () => {
      const mockReaction: Reaction = {
        id: 'reaction-1',
        media_id: 'media-1',
        user_id: null,
        guest_identifier: 'guest-123',
        emoji: '❤️',
        created_at: '2024-01-01T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: mockReaction, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await reactionsApi.add('media-1', '❤️', {
        guestIdentifier: 'guest-123',
      });

      expect(result.guest_identifier).toBe('guest-123');
      expect(result.user_id).toBeNull();
    });
  });
});

// ============================================
// FAVORITES API TESTS (5 tests)
// ============================================

describe('favoritesApi', () => {
  describe('add', () => {
    it('should add favorite and return Favorite object', async () => {
      const mockFavorite: Favorite = {
        id: 'fav-1',
        media_id: 'media-1',
        user_id: 'user-1',
        guest_identifier: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      const queryMock = createQueryMock();
      queryMock.single.mockResolvedValue({ data: mockFavorite, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await favoritesApi.add('media-1', { userId: 'user-1' });

      expect(result).toEqual(mockFavorite);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('favorites');
      expect(queryMock.insert).toHaveBeenCalledWith({
        media_id: 'media-1',
        user_id: 'user-1',
        guest_identifier: null,
      });
    });
  });

  describe('remove', () => {
    it('should remove favorite by user_id', async () => {
      const queryMock = createQueryMock();
      
      // For favoritesApi.remove: .delete().eq('media_id').eq('user_id')
      // Second .eq() should resolve
      let callCount = 0;
      queryMock.eq.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({ data: null, error: null });
        }
        return queryMock;
      });
      
      mockSupabaseClient.from.mockReturnValue(queryMock);

      await favoritesApi.remove('media-1', { userId: 'user-1' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('favorites');
      expect(queryMock.delete).toHaveBeenCalled();
      expect(queryMock.eq).toHaveBeenCalledWith('media_id', 'media-1');
      expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });

  describe('toggle', () => {
    it('should add favorite if not exists (toggle behavior)', async () => {
      const queryMock = createQueryMock();

      // First call to getByUser returns empty array
      queryMock.eq.mockResolvedValueOnce({ data: [], error: null });

      // Second call to add returns favorite
      const mockFavorite: Favorite = {
        id: 'fav-1',
        media_id: 'media-1',
        user_id: 'user-1',
        guest_identifier: null,
        created_at: '2024-01-01T00:00:00Z',
      };
      queryMock.single.mockResolvedValueOnce({ data: mockFavorite, error: null });

      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await favoritesApi.toggle('media-1', { userId: 'user-1' });

      expect(result).toBe(true);
    });

    it('should remove favorite if exists (toggle behavior)', async () => {
      // Create a new mock for each from() call
      let fromCallCount = 0;
      
      mockSupabaseClient.from.mockImplementation(() => {
        fromCallCount++;
        const queryMock = createQueryMock();
        
        if (fromCallCount === 1) {
          // First call: getByUser returns array with media-1
          queryMock.eq.mockResolvedValue({
            data: [{ media_id: 'media-1' }],
            error: null,
          });
        } else {
          // Second call: remove
          let eqCallCount = 0;
          queryMock.eq.mockImplementation(() => {
            eqCallCount++;
            if (eqCallCount === 2) {
              return Promise.resolve({ data: null, error: null });
            }
            return queryMock;
          });
        }
        
        return queryMock;
      });

      const result = await favoritesApi.toggle('media-1', { userId: 'user-1' });

      expect(result).toBe(false);
    });
  });

  describe('getByUser', () => {
    it('should return array of media_ids favorited by user', async () => {
      const mockFavorites = [
        { media_id: 'media-1' },
        { media_id: 'media-2' },
        { media_id: 'media-3' },
      ];

      const queryMock = createQueryMock();
      queryMock.eq.mockResolvedValue({ data: mockFavorites, error: null });
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await favoritesApi.getByUser({ userId: 'user-1' });

      expect(result).toEqual(['media-1', 'media-2', 'media-3']);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('favorites');
      expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });
});

// ============================================
// API ERROR CLASS TESTS (2 tests)
// ============================================

describe('ApiError', () => {
  it('should create ApiError with message, code, and details', () => {
    const error = new ApiError('Test error', 'TEST_CODE', { detail: 'test' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ detail: 'test' });
  });

  it('should handle PGRST116 error code as not found without throwing', async () => {
    const queryMock = createQueryMock();
    queryMock.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Row not found' },
    });
    mockSupabaseClient.from.mockReturnValue(queryMock);

    // These methods should return null for PGRST116, not throw
    const mediaResult = await mediaApi.getById('non-existent');
    expect(mediaResult).toBeNull();

    const weddingResult = await weddingsApi.getBySlug('non-existent');
    expect(weddingResult).toBeNull();
  });
});
