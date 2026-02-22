import { describe, it, expect } from 'vitest';
import {
  calculateEnhancedStatistics,
  formatStorageSize,
  formatPercentage,
  type EnhancedStatistics,
} from './statistics';
import type { MediaItem, GuestbookMessage } from './mockData';

// Deterministic counters for test fixture IDs
let mediaCounter = 0;
let msgCounter = 0;

// Helper to create a minimal MediaItem
function createMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: `media-${++mediaCounter}`,
    url: 'https://example.com/photo.jpg',
    type: 'image',
    author: 'Alice',
    createdAt: new Date('2024-06-15T10:00:00Z'),
    reactions: [],
    favoriteCount: 0,
    albumIds: [],
    ...overrides,
  };
}

function createMessage(overrides: Partial<GuestbookMessage> = {}): GuestbookMessage {
  return {
    id: `msg-${++msgCounter}`,
    author: 'Guest',
    content: 'Beautiful wedding!',
    createdAt: new Date('2024-06-15T10:00:00Z'),
    ...overrides,
  };
}

describe('calculateEnhancedStatistics', () => {
  it('returns zeroes for empty input', () => {
    const result = calculateEnhancedStatistics([], []);

    expect(result.totalPhotos).toBe(0);
    expect(result.totalVideos).toBe(0);
    expect(result.totalMedia).toBe(0);
    expect(result.totalMessages).toBe(0);
    expect(result.totalFavorites).toBe(0);
    expect(result.totalReactions).toBe(0);
    expect(result.estimatedStorageMB).toBe(0);
    expect(result.estimatedStorageGB).toBe(0);
    expect(result.topUploaders).toHaveLength(0);
    expect(result.uniqueUploaders).toBe(0);
    expect(result.reactionBreakdown).toHaveLength(0);
    expect(result.mostReactedPhotos).toHaveLength(0);
    expect(result.photoVideoRatio.photoPercentage).toBe(0);
    expect(result.photoVideoRatio.videoPercentage).toBe(0);
  });

  describe('basic counts', () => {
    it('counts photos and videos separately', () => {
      const media = [
        createMedia({ type: 'image' }),
        createMedia({ type: 'image' }),
        createMedia({ type: 'video' }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.totalPhotos).toBe(2);
      expect(result.totalVideos).toBe(1);
      expect(result.totalMedia).toBe(3);
    });

    it('counts messages', () => {
      const messages = [createMessage(), createMessage(), createMessage()];
      const result = calculateEnhancedStatistics([], messages);
      expect(result.totalMessages).toBe(3);
    });

    it('sums favorite counts', () => {
      const media = [
        createMedia({ favoriteCount: 5 }),
        createMedia({ favoriteCount: 3 }),
        createMedia({ favoriteCount: 0 }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.totalFavorites).toBe(8);
    });

    it('handles missing favoriteCount gracefully', () => {
      const media = [
        createMedia({ favoriteCount: undefined }),
        createMedia({ favoriteCount: 2 }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.totalFavorites).toBe(2);
    });
  });

  describe('storage estimation', () => {
    it('estimates storage for photos (3MB each)', () => {
      const media = [createMedia({ type: 'image' }), createMedia({ type: 'image' })];
      const result = calculateEnhancedStatistics(media, []);
      expect(result.estimatedStorageMB).toBe(6); // 2 photos * 3MB
    });

    it('estimates storage for videos (50MB each)', () => {
      const media = [createMedia({ type: 'video' })];
      const result = calculateEnhancedStatistics(media, []);
      expect(result.estimatedStorageMB).toBe(50);
    });

    it('converts to GB correctly', () => {
      // Create 1024 photos = 3072 MB = 3 GB
      const media = Array.from({ length: 1024 }, () => createMedia({ type: 'image' }));
      const result = calculateEnhancedStatistics(media, []);
      expect(result.estimatedStorageGB).toBe(3);
    });
  });

  describe('user activity (uploaders)', () => {
    it('counts uploads per author', () => {
      const media = [
        createMedia({ author: 'Alice', type: 'image' }),
        createMedia({ author: 'Alice', type: 'image' }),
        createMedia({ author: 'Bob', type: 'video' }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.uniqueUploaders).toBe(2);

      const alice = result.topUploaders.find(u => u.name === 'Alice');
      const bob = result.topUploaders.find(u => u.name === 'Bob');

      expect(alice).toBeDefined();
      expect(alice!.photoCount).toBe(2);
      expect(alice!.videoCount).toBe(0);
      expect(alice!.totalCount).toBe(2);

      expect(bob).toBeDefined();
      expect(bob!.videoCount).toBe(1);
    });

    it('sorts uploaders by total count descending', () => {
      const media = [
        createMedia({ author: 'Charlie' }),
        createMedia({ author: 'Alice' }),
        createMedia({ author: 'Alice' }),
        createMedia({ author: 'Bob' }),
        createMedia({ author: 'Bob' }),
        createMedia({ author: 'Bob' }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.topUploaders[0].name).toBe('Bob');
      expect(result.topUploaders[1].name).toBe('Alice');
      expect(result.topUploaders[2].name).toBe('Charlie');
    });

    it('calculates percentage of total uploads', () => {
      const media = [
        createMedia({ author: 'Alice' }),
        createMedia({ author: 'Alice' }),
        createMedia({ author: 'Bob' }),
        createMedia({ author: 'Bob' }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      const alice = result.topUploaders.find(u => u.name === 'Alice');
      expect(alice!.percentage).toBe(50);
    });

    it('counts reactions per uploader', () => {
      const media = [
        createMedia({
          author: 'Alice',
          reactions: [
            { type: 'heart', count: 3, emoji: '❤️' },
            { type: 'laugh', count: 2, emoji: '😂' },
          ],
        }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      const alice = result.topUploaders.find(u => u.name === 'Alice');
      expect(alice!.totalReactions).toBe(5);
    });
  });

  describe('timeline by day', () => {
    it('groups uploads by day', () => {
      const media = [
        createMedia({ createdAt: new Date('2024-06-15T10:00:00Z') }),
        createMedia({ createdAt: new Date('2024-06-15T15:00:00Z') }),
        createMedia({ createdAt: new Date('2024-06-16T09:00:00Z') }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.uploadsByDay).toHaveLength(2);

      const day1 = result.uploadsByDay.find(d => d.date === '2024-06-15');
      expect(day1).toBeDefined();
      expect(day1!.count).toBe(2);
      expect(day1!.photos).toBe(2);
      expect(day1!.videos).toBe(0);
    });

    it('sorts days chronologically', () => {
      const media = [
        createMedia({ createdAt: new Date('2024-06-17T10:00:00Z') }),
        createMedia({ createdAt: new Date('2024-06-15T10:00:00Z') }),
        createMedia({ createdAt: new Date('2024-06-16T10:00:00Z') }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.uploadsByDay[0].date).toBe('2024-06-15');
      expect(result.uploadsByDay[1].date).toBe('2024-06-16');
      expect(result.uploadsByDay[2].date).toBe('2024-06-17');
    });
  });

  describe('timeline by hour', () => {
    it('returns all 24 hours', () => {
      const result = calculateEnhancedStatistics([], []);
      expect(result.uploadsByHour).toHaveLength(24);
    });

    it('counts uploads per hour', () => {
      // Use local time to avoid timezone issues (getHours() returns local time)
      const d1 = new Date(2024, 5, 15, 10, 30); // local 10:30
      const d2 = new Date(2024, 5, 15, 10, 45); // local 10:45
      const d3 = new Date(2024, 5, 15, 15, 0);  // local 15:00
      const media = [
        createMedia({ createdAt: d1 }),
        createMedia({ createdAt: d2 }),
        createMedia({ createdAt: d3 }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      const hour10 = result.uploadsByHour.find(h => h.hour === 10);
      const hour15 = result.uploadsByHour.find(h => h.hour === 15);
      expect(hour10!.count).toBe(2);
      expect(hour15!.count).toBe(1);
    });

    it('formats hours as HH:00', () => {
      const result = calculateEnhancedStatistics([], []);
      expect(result.uploadsByHour[0].displayHour).toBe('00:00');
      expect(result.uploadsByHour[9].displayHour).toBe('09:00');
      expect(result.uploadsByHour[23].displayHour).toBe('23:00');
    });
  });

  describe('reaction breakdown', () => {
    it('aggregates reactions across all media', () => {
      const media = [
        createMedia({
          reactions: [
            { type: 'heart', count: 5, emoji: '❤️' },
            { type: 'laugh', count: 2, emoji: '😂' },
          ],
        }),
        createMedia({
          reactions: [{ type: 'heart', count: 3, emoji: '❤️' }],
        }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      const heartReaction = result.reactionBreakdown.find(r => r.type === 'heart');
      expect(heartReaction).toBeDefined();
      expect(heartReaction!.count).toBe(8);
      expect(result.totalReactions).toBe(10); // 5 + 2 + 3
    });

    it('calculates reaction percentages', () => {
      const media = [
        createMedia({
          reactions: [
            { type: 'heart', count: 8, emoji: '❤️' },
            { type: 'laugh', count: 2, emoji: '😂' },
          ],
        }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      const heartReaction = result.reactionBreakdown.find(r => r.type === 'heart');
      const laughReaction = result.reactionBreakdown.find(r => r.type === 'laugh');
      expect(heartReaction!.percentage).toBe(80);
      expect(laughReaction!.percentage).toBe(20);
    });

    it('sorts reactions by count descending', () => {
      const media = [
        createMedia({
          reactions: [
            { type: 'wow', count: 1, emoji: '😮' },
            { type: 'heart', count: 10, emoji: '❤️' },
            { type: 'laugh', count: 5, emoji: '😂' },
          ],
        }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.reactionBreakdown[0].type).toBe('heart');
      expect(result.reactionBreakdown[1].type).toBe('laugh');
      expect(result.reactionBreakdown[2].type).toBe('wow');
    });

    it('handles media with no reactions', () => {
      const media = [createMedia({ reactions: [] }), createMedia({ reactions: undefined })];
      const result = calculateEnhancedStatistics(media, []);
      expect(result.totalReactions).toBe(0);
      expect(result.reactionBreakdown).toHaveLength(0);
    });
  });

  describe('most reacted photos', () => {
    it('returns top 5 most reacted media', () => {
      const media = Array.from({ length: 8 }, (_, i) =>
        createMedia({
          id: `media-${i}`,
          reactions: [{ type: 'heart', count: i, emoji: '❤️' }],
        })
      );

      const result = calculateEnhancedStatistics(media, []);
      expect(result.mostReactedPhotos).toHaveLength(5);
      // Highest reaction count should be first
      const firstItem = result.mostReactedPhotos[0];
      const firstReactions = firstItem.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;
      expect(firstReactions).toBe(7);
    });

    it('handles media with no reactions in sorting', () => {
      const media = [
        createMedia({ reactions: [] }),
        createMedia({ reactions: [{ type: 'heart', count: 5, emoji: '❤️' }] }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.mostReactedPhotos[0].reactions![0].count).toBe(5);
    });
  });

  describe('photo/video ratio', () => {
    it('calculates percentages correctly', () => {
      const media = [
        createMedia({ type: 'image' }),
        createMedia({ type: 'image' }),
        createMedia({ type: 'image' }),
        createMedia({ type: 'video' }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.photoVideoRatio.photos).toBe(3);
      expect(result.photoVideoRatio.videos).toBe(1);
      expect(result.photoVideoRatio.photoPercentage).toBe(75);
      expect(result.photoVideoRatio.videoPercentage).toBe(25);
    });
  });

  describe('peak times', () => {
    it('identifies peak upload day', () => {
      const media = [
        createMedia({ createdAt: new Date('2024-06-15T10:00:00Z') }),
        createMedia({ createdAt: new Date('2024-06-16T10:00:00Z') }),
        createMedia({ createdAt: new Date('2024-06-16T11:00:00Z') }),
        createMedia({ createdAt: new Date('2024-06-16T12:00:00Z') }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.peakUploadCount).toBe(3);
    });

    it('handles empty media with N/A peak day', () => {
      const result = calculateEnhancedStatistics([], []);
      expect(result.peakUploadDay).toBe('N/A');
      expect(result.peakUploadCount).toBe(0);
    });

    it('identifies peak upload hour', () => {
      // Use local time to avoid timezone issues (getHours() returns local time)
      const media = [
        createMedia({ createdAt: new Date(2024, 5, 15, 14, 0) }),
        createMedia({ createdAt: new Date(2024, 5, 15, 14, 30) }),
        createMedia({ createdAt: new Date(2024, 5, 15, 14, 45) }),
        createMedia({ createdAt: new Date(2024, 5, 15, 10, 0) }),
      ];

      const result = calculateEnhancedStatistics(media, []);
      expect(result.peakUploadHour).toBe('14:00');
    });
  });
});

describe('formatStorageSize', () => {
  it('returns MB format for values under 1024 MB', () => {
    expect(formatStorageSize(0)).toBe('0 MB');
    expect(formatStorageSize(512)).toBe('512 MB');
    expect(formatStorageSize(1023)).toBe('1023 MB');
  });

  it('returns GB format for values 1024 MB and above', () => {
    expect(formatStorageSize(1024)).toBe('1.00 GB');
    expect(formatStorageSize(2048)).toBe('2.00 GB');
    expect(formatStorageSize(1536)).toBe('1.50 GB');
  });
});

describe('formatPercentage', () => {
  it('rounds to whole numbers', () => {
    expect(formatPercentage(75.6)).toBe('76%');
    expect(formatPercentage(33.33)).toBe('33%');
    expect(formatPercentage(0)).toBe('0%');
    expect(formatPercentage(100)).toBe('100%');
  });
});
