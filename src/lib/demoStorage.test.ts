/**
 * Tests for demoStorage.ts - localStorage-based demo data persistence
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDemoMedia,
  saveDemoMedia,
  deleteDemoMedia,
  clearDemoMedia,
  getDemoMessages,
  saveDemoMessage,
  deleteDemoMessage,
  clearDemoMessages,
  isDemoInitialized,
  markDemoInitialized,
  resetDemo,
} from './demoStorage';
import type { MediaItem, GuestbookMessage } from './mockData';

// The test environment has jsdom which provides localStorage

function createMediaItem(id = 'test-id'): MediaItem {
  return {
    id,
    url: `https://example.com/${id}.jpg`,
    type: 'image',
    author: 'Test Author',
    caption: 'Test Caption',
    createdAt: new Date('2024-06-15T10:00:00Z'),
    reactions: [],
    favoriteCount: 0,
    albumIds: [],
  };
}

function createMessage(id = 'msg-id'): GuestbookMessage {
  return {
    id,
    author: 'Test Guest',
    content: 'Beautiful wedding!',
    createdAt: new Date('2024-06-15T10:00:00Z'),
  };
}

describe('demoStorage - Media', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getDemoMedia', () => {
    it('returns empty array when no media stored', () => {
      expect(getDemoMedia()).toEqual([]);
    });

    it('returns stored media items', () => {
      const item = createMediaItem('media-1');
      saveDemoMedia(item);

      const result = getDemoMedia();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('media-1');
    });

    it('converts createdAt strings back to Date objects', () => {
      const item = createMediaItem('media-date');
      saveDemoMedia(item);

      const result = getDemoMedia();
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('returns empty array when localStorage has corrupt data', () => {
      localStorage.setItem('reflets_demo_media', '{invalid json}');
      expect(getDemoMedia()).toEqual([]);
    });
  });

  describe('saveDemoMedia', () => {
    it('saves a media item to localStorage', () => {
      const item = createMediaItem('saved-1');
      saveDemoMedia(item);

      const stored = getDemoMedia();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('saved-1');
    });

    it('prepends new items (most recent first)', () => {
      saveDemoMedia(createMediaItem('item-1'));
      saveDemoMedia(createMediaItem('item-2'));

      const stored = getDemoMedia();
      expect(stored[0].id).toBe('item-2'); // Last saved is first
      expect(stored[1].id).toBe('item-1');
    });

    it('saves multiple items', () => {
      saveDemoMedia(createMediaItem('a'));
      saveDemoMedia(createMediaItem('b'));
      saveDemoMedia(createMediaItem('c'));

      expect(getDemoMedia()).toHaveLength(3);
    });
  });

  describe('deleteDemoMedia', () => {
    it('returns false when media not found', () => {
      expect(deleteDemoMedia('nonexistent')).toBe(false);
    });

    it('deletes a media item and returns true', () => {
      saveDemoMedia(createMediaItem('delete-me'));
      expect(deleteDemoMedia('delete-me')).toBe(true);
      expect(getDemoMedia()).toHaveLength(0);
    });

    it('only deletes the specified item', () => {
      saveDemoMedia(createMediaItem('keep'));
      saveDemoMedia(createMediaItem('delete-me'));

      deleteDemoMedia('delete-me');
      const remaining = getDemoMedia();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('keep');
    });
  });

  describe('clearDemoMedia', () => {
    it('removes all media from storage', () => {
      saveDemoMedia(createMediaItem('a'));
      saveDemoMedia(createMediaItem('b'));

      clearDemoMedia();
      expect(getDemoMedia()).toEqual([]);
    });

    it('works when no media is stored', () => {
      expect(() => clearDemoMedia()).not.toThrow();
    });
  });
});

describe('demoStorage - Messages', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getDemoMessages', () => {
    it('returns empty array when no messages stored', () => {
      expect(getDemoMessages()).toEqual([]);
    });

    it('returns stored messages', () => {
      const msg = createMessage('msg-1');
      saveDemoMessage(msg);

      const result = getDemoMessages();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('msg-1');
    });

    it('converts createdAt strings back to Date objects', () => {
      saveDemoMessage(createMessage('msg-date'));
      const result = getDemoMessages();
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });

    it('returns empty array when localStorage has corrupt data', () => {
      localStorage.setItem('reflets_demo_messages', 'invalid');
      expect(getDemoMessages()).toEqual([]);
    });
  });

  describe('saveDemoMessage', () => {
    it('saves a message to localStorage', () => {
      saveDemoMessage(createMessage('msg-save'));

      const stored = getDemoMessages();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('msg-save');
    });

    it('prepends messages (most recent first)', () => {
      saveDemoMessage(createMessage('first'));
      saveDemoMessage(createMessage('second'));

      const stored = getDemoMessages();
      expect(stored[0].id).toBe('second');
      expect(stored[1].id).toBe('first');
    });
  });

  describe('deleteDemoMessage', () => {
    it('returns false when message not found', () => {
      expect(deleteDemoMessage('nonexistent')).toBe(false);
    });

    it('deletes a message and returns true', () => {
      saveDemoMessage(createMessage('del-msg'));
      expect(deleteDemoMessage('del-msg')).toBe(true);
      expect(getDemoMessages()).toHaveLength(0);
    });

    it('only deletes the specified message', () => {
      saveDemoMessage(createMessage('keep-msg'));
      saveDemoMessage(createMessage('del-msg'));

      deleteDemoMessage('del-msg');
      const remaining = getDemoMessages();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('keep-msg');
    });
  });

  describe('clearDemoMessages', () => {
    it('removes all messages from storage', () => {
      saveDemoMessage(createMessage('a'));
      saveDemoMessage(createMessage('b'));

      clearDemoMessages();
      expect(getDemoMessages()).toEqual([]);
    });

    it('works when no messages are stored', () => {
      expect(() => clearDemoMessages()).not.toThrow();
    });
  });
});

describe('demoStorage - Initialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isDemoInitialized', () => {
    it('returns false when not initialized', () => {
      expect(isDemoInitialized()).toBe(false);
    });

    it('returns true after marking initialized', () => {
      markDemoInitialized();
      expect(isDemoInitialized()).toBe(true);
    });
  });

  describe('markDemoInitialized', () => {
    it('marks the demo as initialized', () => {
      markDemoInitialized();
      expect(localStorage.getItem('reflets_demo_initialized')).toBe('true');
    });
  });

  describe('resetDemo', () => {
    it('clears all demo data from localStorage', () => {
      saveDemoMedia(createMediaItem('m1'));
      saveDemoMessage(createMessage('msg1'));
      markDemoInitialized();

      resetDemo();

      expect(getDemoMedia()).toEqual([]);
      expect(getDemoMessages()).toEqual([]);
      expect(isDemoInitialized()).toBe(false);
    });

    it('works when nothing is stored', () => {
      expect(() => resetDemo()).not.toThrow();
    });
  });
});
