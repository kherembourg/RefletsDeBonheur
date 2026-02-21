/**
 * Extra DataService tests to cover remaining uncovered production paths.
 * Covers: getStatistics, getWeddingBySlug, toggleReaction, getUserReaction,
 *         getReactions, isFavorited, syncToggleFavorite, getDataService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client to force production mode
vi.mock('../supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  supabase: null,
}));

vi.mock('../supabase/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public code?: string) {
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
  weddingsApi: {
    getBySlug: vi.fn(),
    getByOwner: vi.fn().mockResolvedValue([]),
    getStats: vi.fn(),
  },
}));

vi.mock('../mockData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../mockData')>();
  return {
    ...actual,
    initializeDemoData: vi.fn(),
    mockMedia: [...actual.mockMedia],
    mockMessages: [...actual.mockMessages],
  };
});

import { DataService, getDataService } from './dataService';

describe('DataService - Extra Coverage', () => {
  let weddingsApi: any;
  let albumsApi: any;

  beforeEach(async () => {
    const apiModule = await import('../supabase/api');
    weddingsApi = apiModule.weddingsApi;
    albumsApi = apiModule.albumsApi;
    vi.clearAllMocks();
  });

  describe('getStatistics - production mode', () => {
    it('returns stats from weddingsApi when weddingId is set', async () => {
      weddingsApi.getStats.mockResolvedValue({
        media_count: 10,
        photo_count: 7,
        video_count: 3,
        message_count: 5,
      });
      albumsApi.getByWeddingId.mockResolvedValue([{}, {}]);

      const service = new DataService({ weddingId: 'wedding-123' });
      const stats = await service.getStatistics();

      expect(stats.mediaCount).toBe(10);
      expect(stats.photoCount).toBe(7);
      expect(stats.videoCount).toBe(3);
      expect(stats.messageCount).toBe(5);
      expect(stats.albumCount).toBe(2);
    });

    it('returns zeros when weddingId is not set', async () => {
      const service = new DataService({});
      const stats = await service.getStatistics();

      expect(stats.mediaCount).toBe(0);
      expect(stats.photoCount).toBe(0);
      expect(stats.videoCount).toBe(0);
      expect(stats.messageCount).toBe(0);
    });

    it('handles null stats from weddingsApi gracefully', async () => {
      weddingsApi.getStats.mockResolvedValue(null);
      albumsApi.getByWeddingId.mockResolvedValue([]);

      const service = new DataService({ weddingId: 'wedding-456' });
      const stats = await service.getStatistics();

      expect(stats.mediaCount).toBe(0);
      expect(stats.photoCount).toBe(0);
    });
  });

  describe('getWeddingBySlug - production mode', () => {
    it('returns wedding when found', async () => {
      const mockWedding = {
        id: 'wedding-abc',
        slug: 'alice-bob',
        owner_id: 'owner-1',
        title: 'Alice & Bob',
        date: '2026-06-15',
        venue: 'The Gardens',
        description: null,
        theme: 'classic',
        is_public: true,
        pin_code: null,
        magic_token: null,
        status: 'active' as const,
        subscription_status: 'active' as const,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      weddingsApi.getBySlug.mockResolvedValue(mockWedding);

      const service = new DataService({ weddingId: 'wedding-abc' });
      const result = await service.getWeddingBySlug('alice-bob');

      expect(weddingsApi.getBySlug).toHaveBeenCalledWith('alice-bob');
      expect(result).toBe(mockWedding);
    });

    it('returns null when not found', async () => {
      weddingsApi.getBySlug.mockResolvedValue(null);

      const service = new DataService({ weddingId: 'wedding-abc' });
      const result = await service.getWeddingBySlug('unknown-slug');

      expect(result).toBeNull();
    });

    it('returns null in demo mode', async () => {
      const service = new DataService({ demoMode: true });
      const result = await service.getWeddingBySlug('any-slug');

      expect(result).toBeNull();
      expect(weddingsApi.getBySlug).not.toHaveBeenCalled();
    });
  });

  describe('toggleReaction - production mode', () => {
    it('returns false in production mode', () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      const result = service.toggleReaction('media-1', 'heart');

      expect(result).toBe(false);
    });
  });

  describe('getUserReaction - production mode', () => {
    it('returns null in production mode', () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      const result = service.getUserReaction('media-1');

      expect(result).toBeNull();
    });
  });

  describe('getReactions - production mode', () => {
    it('returns empty array in production mode', () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      const result = service.getReactions('media-1');

      expect(result).toEqual([]);
    });
  });

  describe('isFavorited - production mode', () => {
    it('returns false in production mode', () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      const result = service.isFavorited('media-1');

      expect(result).toBe(false);
    });
  });

  describe('syncToggleFavorite - production mode', () => {
    it('returns false in production mode', () => {
      const service = new DataService({ weddingId: 'wedding-123' });
      const result = service.syncToggleFavorite('media-1');

      expect(result).toBe(false);
    });
  });

  describe('getDataService', () => {
    it('creates a new service when options provided', () => {
      const service = getDataService({ weddingId: 'wedding-test', demoMode: true });
      expect(service).toBeInstanceOf(DataService);
      expect(service.isDemoMode()).toBe(true);
    });

    it('returns a singleton when no options provided', () => {
      const service1 = getDataService();
      const service2 = getDataService();
      expect(service1).toBe(service2);
    });
  });
});
