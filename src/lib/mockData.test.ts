/**
 * MockData Unit Tests
 * Tests the mock data functions for demo mode
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mockMedia,
  mockMessages,
  mockSettings,
  mockAlbums,
  addMediaItem,
  deleteMediaItem,
  addGuestbookMessage,
  deleteGuestbookMessage,
  updateSettings,
  getUserFavorites,
  isFavorited,
  toggleFavorite,
  getFavoriteCount,
  getTotalFavorites,
  REACTION_EMOJIS,
  getUserReactions,
  getUserReaction,
  toggleReaction,
  getTotalReactionCount,
  getReactions,
  getAlbums,
  getAlbum,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  addMediaToAlbum,
  removeMediaFromAlbum,
  getMediaByAlbum,
  getMediaAlbums,
  AUTH_CODES,
} from './mockData';

describe('MockData - Media', () => {
  it('should have initial mock media items', () => {
    expect(Array.isArray(mockMedia)).toBe(true);
    expect(mockMedia.length).toBeGreaterThan(0);
  });

  it('should have correct structure for media items', () => {
    const firstItem = mockMedia[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('url');
    expect(firstItem).toHaveProperty('type');
    expect(firstItem).toHaveProperty('author');
    expect(firstItem).toHaveProperty('createdAt');
    expect(['image', 'video']).toContain(firstItem.type);
    expect(firstItem.createdAt).toBeInstanceOf(Date);
  });

  it('should add a new media item', () => {
    const initialLength = mockMedia.length;
    const newItem = addMediaItem({
      url: 'https://example.com/new-image.jpg',
      type: 'image',
      author: 'Test User',
      caption: 'Test Caption',
      createdAt: new Date(),
    });

    expect(newItem).toHaveProperty('id');
    expect(newItem.url).toBe('https://example.com/new-image.jpg');
    expect(newItem.type).toBe('image');
    expect(newItem.author).toBe('Test User');
    expect(newItem.isDemo).toBe(true);
    expect(mockMedia.length).toBe(initialLength + 1);

    // Clean up
    deleteMediaItem(newItem.id);
  });

  it('should delete a media item', () => {
    const newItem = addMediaItem({
      url: 'https://example.com/to-delete.jpg',
      type: 'image',
      author: 'Test',
      createdAt: new Date(),
    });

    const result = deleteMediaItem(newItem.id);
    expect(result).toBe(true);

    // Try to delete again - should return false
    const result2 = deleteMediaItem(newItem.id);
    expect(result2).toBe(false);
  });
});

describe('MockData - Guestbook Messages', () => {
  it('should have initial mock messages', () => {
    expect(Array.isArray(mockMessages)).toBe(true);
    expect(mockMessages.length).toBeGreaterThan(0);
  });

  it('should have correct structure for messages', () => {
    const firstMessage = mockMessages[0];
    expect(firstMessage).toHaveProperty('id');
    expect(firstMessage).toHaveProperty('author');
    expect(firstMessage).toHaveProperty('text');
    expect(firstMessage).toHaveProperty('createdAt');
    expect(firstMessage.createdAt).toBeInstanceOf(Date);
  });

  it('should add a new guestbook message', () => {
    const initialLength = mockMessages.length;
    const newMessage = addGuestbookMessage({
      author: 'Test Author',
      text: 'This is a test message for the happy couple!',
      createdAt: new Date(),
    });

    expect(newMessage).toHaveProperty('id');
    expect(newMessage.author).toBe('Test Author');
    expect(newMessage.text).toBe('This is a test message for the happy couple!');
    expect(newMessage.isDemo).toBe(true);
    expect(mockMessages.length).toBe(initialLength + 1);

    // Clean up
    deleteGuestbookMessage(newMessage.id);
  });

  it('should delete a guestbook message', () => {
    const newMessage = addGuestbookMessage({
      author: 'To Delete',
      text: 'This will be deleted',
      createdAt: new Date(),
    });

    const result = deleteGuestbookMessage(newMessage.id);
    expect(result).toBe(true);

    // Try to delete again - should return false
    const result2 = deleteGuestbookMessage(newMessage.id);
    expect(result2).toBe(false);
  });
});

describe('MockData - Settings', () => {
  it('should have initial settings', () => {
    expect(mockSettings).toHaveProperty('allowUploads');
    expect(mockSettings).toHaveProperty('weddingDate');
    expect(mockSettings).toHaveProperty('coupleName');
    expect(typeof mockSettings.allowUploads).toBe('boolean');
  });

  it('should update settings', () => {
    const originalAllowUploads = mockSettings.allowUploads;

    updateSettings({ allowUploads: !originalAllowUploads });
    expect(mockSettings.allowUploads).toBe(!originalAllowUploads);

    // Restore
    updateSettings({ allowUploads: originalAllowUploads });
  });

  it('should update couple name', () => {
    const original = mockSettings.coupleName;

    updateSettings({ coupleName: 'New Couple Name' });
    expect(mockSettings.coupleName).toBe('New Couple Name');

    // Restore
    updateSettings({ coupleName: original });
  });
});

describe('MockData - Auth Codes', () => {
  it('should have GUEST and ADMIN codes', () => {
    expect(AUTH_CODES).toHaveProperty('GUEST');
    expect(AUTH_CODES).toHaveProperty('ADMIN');
    expect(typeof AUTH_CODES.GUEST).toBe('string');
    expect(typeof AUTH_CODES.ADMIN).toBe('string');
  });
});

describe('MockData - Favorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return empty set when no favorites', () => {
    const favorites = getUserFavorites();
    expect(favorites).toBeInstanceOf(Set);
    expect(favorites.size).toBe(0);
  });

  it('should check if item is favorited', () => {
    expect(isFavorited('test-id')).toBe(false);
  });

  it('should toggle favorite on and off', () => {
    const mediaId = '1'; // Use a real mock media ID

    // Toggle on
    const result1 = toggleFavorite(mediaId);
    expect(result1).toBe(true);
    expect(isFavorited(mediaId)).toBe(true);

    // Toggle off
    const result2 = toggleFavorite(mediaId);
    expect(result2).toBe(false);
    expect(isFavorited(mediaId)).toBe(false);
  });

  it('should get favorite count', () => {
    const count = getFavoriteCount('1');
    expect(typeof count).toBe('number');
  });

  it('should get total favorites', () => {
    const total = getTotalFavorites();
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(0);
  });
});

describe('MockData - Reactions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have reaction emoji mapping', () => {
    expect(REACTION_EMOJIS).toHaveProperty('heart');
    expect(REACTION_EMOJIS).toHaveProperty('laugh');
    expect(REACTION_EMOJIS).toHaveProperty('wow');
    expect(REACTION_EMOJIS).toHaveProperty('celebrate');
    expect(REACTION_EMOJIS).toHaveProperty('love');
    expect(REACTION_EMOJIS).toHaveProperty('clap');
  });

  it('should return empty map when no user reactions', () => {
    const reactions = getUserReactions();
    expect(reactions).toBeInstanceOf(Map);
    expect(reactions.size).toBe(0);
  });

  it('should get user reaction', () => {
    const reaction = getUserReaction('1');
    expect(reaction === null || typeof reaction === 'string').toBe(true);
  });

  it('should toggle reaction', () => {
    const mediaId = '1';

    // Add reaction
    const result1 = toggleReaction(mediaId, 'heart');
    expect(result1).toBe(true);
    expect(getUserReaction(mediaId)).toBe('heart');

    // Toggle same reaction off
    const result2 = toggleReaction(mediaId, 'heart');
    expect(result2).toBe(false);
    expect(getUserReaction(mediaId)).toBeNull();
  });

  it('should switch reaction type', () => {
    const mediaId = '1';

    // Add heart reaction
    toggleReaction(mediaId, 'heart');
    expect(getUserReaction(mediaId)).toBe('heart');

    // Switch to laugh
    toggleReaction(mediaId, 'laugh');
    expect(getUserReaction(mediaId)).toBe('laugh');

    // Clean up
    toggleReaction(mediaId, 'laugh');
  });

  it('should return false for non-existent media', () => {
    const result = toggleReaction('non-existent', 'heart');
    expect(result).toBe(false);
  });

  it('should get total reaction count', () => {
    const count = getTotalReactionCount('1');
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should get reactions for media', () => {
    const reactions = getReactions('1');
    expect(Array.isArray(reactions)).toBe(true);
  });

  it('should return empty array for non-existent media', () => {
    const reactions = getReactions('non-existent-id');
    expect(reactions).toEqual([]);
  });
});

describe('MockData - Albums', () => {
  it('should have initial mock albums', () => {
    expect(Array.isArray(mockAlbums)).toBe(true);
    expect(mockAlbums.length).toBeGreaterThan(0);
  });

  it('should get albums with photo counts', () => {
    const albums = getAlbums();
    expect(Array.isArray(albums)).toBe(true);

    albums.forEach(album => {
      expect(album).toHaveProperty('photoCount');
      expect(typeof album.photoCount).toBe('number');
    });
  });

  it('should get a specific album', () => {
    const albumId = mockAlbums[0].id;
    const album = getAlbum(albumId);

    expect(album).toBeDefined();
    expect(album!.id).toBe(albumId);
    expect(album).toHaveProperty('photoCount');
  });

  it('should return undefined for non-existent album', () => {
    const album = getAlbum('non-existent-id');
    expect(album).toBeUndefined();
  });

  it('should create a new album', () => {
    const newAlbum = createAlbum('Test Album', 'Test Description', '#FF0000');

    expect(newAlbum).toHaveProperty('id');
    expect(newAlbum.name).toBe('Test Album');
    expect(newAlbum.description).toBe('Test Description');
    expect(newAlbum.color).toBe('#FF0000');
    expect(newAlbum.photoCount).toBe(0);

    // Clean up
    deleteAlbum(newAlbum.id);
  });

  it('should create album with default color', () => {
    const newAlbum = createAlbum('No Color Album');
    expect(newAlbum.color).toBe('#D4AF37');

    // Clean up
    deleteAlbum(newAlbum.id);
  });

  it('should update an album', () => {
    const album = createAlbum('Original Name');

    const updated = updateAlbum(album.id, {
      name: 'Updated Name',
      description: 'New Description',
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.description).toBe('New Description');

    // Clean up
    deleteAlbum(album.id);
  });

  it('should return null when updating non-existent album', () => {
    const result = updateAlbum('non-existent-id', { name: 'New Name' });
    expect(result).toBeNull();
  });

  it('should delete an album', () => {
    const album = createAlbum('To Delete');
    const result = deleteAlbum(album.id);
    expect(result).toBe(true);

    // Try to delete again
    const result2 = deleteAlbum(album.id);
    expect(result2).toBe(false);
  });

  it('should delete album and remove references from media', () => {
    const album = createAlbum('Album with Media');
    const mediaId = mockMedia[0].id;

    // Add media to album
    addMediaToAlbum(mediaId, album.id);

    // Delete album
    deleteAlbum(album.id);

    // Check media no longer references album
    const mediaAlbums = getMediaAlbums(mediaId);
    const found = mediaAlbums.find(a => a.id === album.id);
    expect(found).toBeUndefined();
  });

  it('should add media to album', () => {
    const album = createAlbum('Test Album');
    const mediaId = mockMedia[0].id;

    const result = addMediaToAlbum(mediaId, album.id);
    expect(result).toBe(true);

    // Adding again should return false
    const result2 = addMediaToAlbum(mediaId, album.id);
    expect(result2).toBe(false);

    // Clean up
    removeMediaFromAlbum(mediaId, album.id);
    deleteAlbum(album.id);
  });

  it('should return false for non-existent media or album', () => {
    expect(addMediaToAlbum('non-existent', 'album-1')).toBe(false);
    expect(addMediaToAlbum('1', 'non-existent')).toBe(false);
  });

  it('should remove media from album', () => {
    const album = createAlbum('Test Album');
    const mediaId = mockMedia[0].id;

    addMediaToAlbum(mediaId, album.id);
    const result = removeMediaFromAlbum(mediaId, album.id);
    expect(result).toBe(true);

    // Removing again should return false
    const result2 = removeMediaFromAlbum(mediaId, album.id);
    expect(result2).toBe(false);

    // Clean up
    deleteAlbum(album.id);
  });

  it('should get media by album', () => {
    const albumId = mockAlbums[0].id;
    const media = getMediaByAlbum(albumId);

    expect(Array.isArray(media)).toBe(true);
  });

  it('should get albums for a media item', () => {
    const mediaId = mockMedia[0].id;
    const albums = getMediaAlbums(mediaId);

    expect(Array.isArray(albums)).toBe(true);
  });
});
