/**
 * GalleryGrid Component Tests
 * Tests the main gallery grid display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Define mock data (hoisted)
const mockMedia = [
  {
    id: 'img-1',
    url: 'https://example.com/photo1.jpg',
    type: 'image' as const,
    author: 'Sophie',
    caption: 'Beautiful moment',
    createdAt: new Date('2026-01-15'),
    favoriteCount: 5,
    reactions: [],
    albumIds: [],
  },
  {
    id: 'img-2',
    url: 'https://example.com/photo2.jpg',
    type: 'image' as const,
    author: 'Thomas',
    caption: 'Wedding dance',
    createdAt: new Date('2026-01-16'),
    favoriteCount: 3,
    reactions: [],
    albumIds: [],
  },
];

const mockAlbums = [
  { id: 'album-1', name: 'Ceremony', createdAt: new Date(), photoCount: 5 },
];

// Mock functions
const mockGetMedia = vi.fn();
const mockGetAlbums = vi.fn();
const mockGetFavorites = vi.fn();
const mockGetSettings = vi.fn();
const mockInitializeDemoStorage = vi.fn();

// Mock the auth module
vi.mock('../../lib/auth', () => ({
  requireAuth: vi.fn(),
  isAdmin: vi.fn(() => false),
  getUsername: vi.fn(() => ''),
  setUsername: vi.fn(),
}));

// Mock Supabase client
vi.mock('../../lib/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

// Mock DataService class - use a class constructor
vi.mock('../../lib/services/dataService', () => ({
  DataService: class MockDataService {
    getMedia = mockGetMedia;
    getAlbums = mockGetAlbums;
    getFavorites = mockGetFavorites;
    getSettings = mockGetSettings;
    initializeDemoStorage = mockInitializeDemoStorage;
    toggleFavorite = vi.fn().mockResolvedValue(true);
    addMedia = vi.fn().mockResolvedValue({});
    deleteMedia = vi.fn().mockResolvedValue(undefined);
    toggleReaction = vi.fn().mockReturnValue(true);
    getUserReaction = vi.fn().mockReturnValue(null);
    getReactions = vi.fn().mockReturnValue([]);
    syncToggleFavorite = vi.fn().mockReturnValue(true);
    isFavorited = vi.fn().mockReturnValue(false);
  },
  useDataService: vi.fn(() => ({
    getMedia: mockGetMedia,
    getAlbums: mockGetAlbums,
    getFavorites: mockGetFavorites,
    getSettings: mockGetSettings,
  })),
}));

import { GalleryGrid } from './GalleryGrid';

describe('GalleryGrid Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMedia.mockResolvedValue(mockMedia);
    mockGetAlbums.mockResolvedValue(mockAlbums);
    mockGetFavorites.mockResolvedValue(new Set());
    mockGetSettings.mockReturnValue({ allowUploads: true });
  });

  describe('Rendering', () => {
    it('should render the gallery label', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Galerie Photos')).toBeInTheDocument();
      });
    });

    it('should render media cards', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Sophie')).toBeInTheDocument();
        expect(screen.getByText('Thomas')).toBeInTheDocument();
      });
    });

    it('should show contribute button when uploads allowed', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /contribuer à la galerie/i })).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      render(<GalleryGrid demoMode={true} />);

      expect(screen.getByText('Chargement des photos...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no media', async () => {
      mockGetMedia.mockResolvedValue([]);

      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Votre galerie vous attend')).toBeInTheDocument();
      });
    });

    it('should show upload prompt in empty state', async () => {
      mockGetMedia.mockResolvedValue([]);

      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText(/contribuer à la galerie/i)).toBeInTheDocument();
      });
    });
  });

  describe('Demo Mode', () => {
    it('should initialize demo storage in demo mode', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(mockInitializeDemoStorage).toHaveBeenCalled();
      });
    });
  });

  describe('Admin Variant', () => {
    it('should show bulk actions in admin view', async () => {
      render(<GalleryGrid demoMode={true} variant="admin" />);

      await waitFor(() => {
        expect(screen.getByText('Actions groupées')).toBeInTheDocument();
      });
    });
  });
});
