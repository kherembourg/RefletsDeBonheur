/**
 * GalleryGrid Component Tests
 * Tests the main gallery grid display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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
    it('should render the gallery header', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Moments Précieux')).toBeInTheDocument();
      });
    });

    it('should show photo count', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText(/2 souvenirs partagés/)).toBeInTheDocument();
      });
    });

    it('should render media cards', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText('Sophie')).toBeInTheDocument();
        expect(screen.getByText('Thomas')).toBeInTheDocument();
      });
    });

    it('should show upload button when uploads allowed', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /partager/i })).toBeInTheDocument();
      });
    });

    it('should show slideshow button', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /diaporama/i })).toBeInTheDocument();
      });
    });

    it('should show selection mode button', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sélectionner/i })).toBeInTheDocument();
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
        expect(screen.getByText(/partager vos premiers souvenirs/i)).toBeInTheDocument();
      });
    });
  });

  describe('Uploads Disabled', () => {
    it('should show lock message when uploads disabled', async () => {
      mockGetSettings.mockReturnValue({ allowUploads: false });

      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByText(/uploads fermés/i)).toBeInTheDocument();
      });
    });
  });

  describe('Selection Mode', () => {
    it('should toggle selection mode', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sélectionner/i })).toBeInTheDocument();
      });

      const selectButton = screen.getByRole('button', { name: /sélectionner/i });
      fireEvent.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
      });
    });
  });

  describe('Grid Style', () => {
    it('should toggle between masonry and grid view', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        // Should have grid toggle buttons
        expect(screen.getByTitle('Vue mosaïque')).toBeInTheDocument();
        expect(screen.getByTitle('Vue grille')).toBeInTheDocument();
      });

      // Click grid view
      const gridButton = screen.getByTitle('Vue grille');
      fireEvent.click(gridButton);

      // The component should switch to grid view (class changes)
      // This tests that clicking doesn't throw an error
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

  describe('Search Filters', () => {
    it('should render search filters when media exists', async () => {
      render(<GalleryGrid demoMode={true} />);

      await waitFor(() => {
        // Search filters should be present
        const searchInput = screen.getByPlaceholderText(/rechercher/i);
        expect(searchInput).toBeInTheDocument();
      });
    });
  });
});

describe('GalleryGrid - Count Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAlbums.mockResolvedValue([]);
    mockGetFavorites.mockResolvedValue(new Set());
    mockGetSettings.mockReturnValue({ allowUploads: true });
  });

  it('should show singular for single item', async () => {
    mockGetMedia.mockResolvedValue([mockMedia[0]]);

    render(<GalleryGrid demoMode={true} />);

    await waitFor(() => {
      expect(screen.getByText(/1 souvenir partagé$/)).toBeInTheDocument();
    });
  });
});
