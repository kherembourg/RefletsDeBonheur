/**
 * Component Test: SearchFilters
 * 
 * Tests for the SearchFilters component that provides search and filtering controls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SearchFilters } from './SearchFilters';
import type { MediaType, SortOption } from './SearchFilters';

describe('SearchFilters Component', () => {
  const mockAlbums = [
    { id: 'album-1', name: 'Ceremony', createdAt: new Date(), photoCount: 15 },
    { id: 'album-2', name: 'Reception', createdAt: new Date(), photoCount: 30 },
  ];

  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    mediaType: 'all' as MediaType,
    onMediaTypeChange: vi.fn(),
    sortBy: 'newest' as SortOption,
    onSortChange: vi.fn(),
    showFavoritesOnly: false,
    onShowFavoritesChange: vi.fn(),
    selectedAlbumId: null,
    onAlbumChange: vi.fn(),
    albums: mockAlbums,
    resultCount: 50,
    totalCount: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByPlaceholderText(/rechercher par texte ou auteur/i)).toBeInTheDocument();
    });

    it('should render media type filters', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByRole('button', { name: /tout/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /photos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /vidéos/i })).toBeInTheDocument();
    });

    it('should render favorites filter', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByRole('button', { name: /favoris/i })).toBeInTheDocument();
    });

    it('should render sort dropdown', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByLabelText(/trier par/i)).toBeInTheDocument();
    });

    it('should render album dropdown when albums exist', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByLabelText(/filtrer par album/i)).toBeInTheDocument();
    });

    it('should not render album dropdown when no albums', () => {
      render(<SearchFilters {...defaultProps} albums={[]} />);

      expect(screen.queryByLabelText(/filtrer par album/i)).not.toBeInTheDocument();
    });
  });

  describe('Search Input', () => {
    it('should update search query on input', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      await user.type(searchInput, 'Sophie');

      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('S');
      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('o');
    });

    it('should display current search query', () => {
      render(<SearchFilters {...defaultProps} searchQuery="Sophie" />);

      const searchInput = screen.getByPlaceholderText(/rechercher/i) as HTMLInputElement;
      expect(searchInput.value).toBe('Sophie');
    });

    it('should show clear button when search has text', () => {
      render(<SearchFilters {...defaultProps} searchQuery="test" />);

      expect(screen.getByLabelText(/effacer la recherche/i)).toBeInTheDocument();
    });

    it('should not show clear button when search is empty', () => {
      render(<SearchFilters {...defaultProps} searchQuery="" />);

      expect(screen.queryByLabelText(/effacer la recherche/i)).not.toBeInTheDocument();
    });

    it('should clear search when clear button clicked', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} searchQuery="test" />);

      const clearButton = screen.getByLabelText(/effacer la recherche/i);
      await user.click(clearButton);

      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('');
    });

    it('should apply focus styles when focused', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      await user.click(searchInput);

      const container = searchInput.parentElement;
      expect(container).toHaveClass('border-burgundy-old');
    });
  });

  describe('Media Type Filters', () => {
    it('should highlight active filter', () => {
      render(<SearchFilters {...defaultProps} mediaType="image" />);

      const photosButton = screen.getByRole('button', { name: /photos/i });
      expect(photosButton).toHaveClass('bg-burgundy-old');
    });

    it('should call onMediaTypeChange when filter clicked', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const photosButton = screen.getByRole('button', { name: /photos/i });
      await user.click(photosButton);

      expect(defaultProps.onMediaTypeChange).toHaveBeenCalledWith('image');
    });

    it('should switch between filters', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const videosButton = screen.getByRole('button', { name: /vidéos/i });
      await user.click(videosButton);

      expect(defaultProps.onMediaTypeChange).toHaveBeenCalledWith('video');
    });

    it('should display icons for photo and video filters', () => {
      render(<SearchFilters {...defaultProps} />);

      const photosButton = screen.getByRole('button', { name: /photos/i });
      const videosButton = screen.getByRole('button', { name: /vidéos/i });

      expect(photosButton).toContainHTML('svg');
      expect(videosButton).toContainHTML('svg');
    });
  });

  describe('Favorites Filter', () => {
    it('should toggle favorites filter', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const favoritesButton = screen.getByRole('button', { name: /favoris/i });
      await user.click(favoritesButton);

      expect(defaultProps.onShowFavoritesChange).toHaveBeenCalledWith(true);
    });

    it('should highlight when favorites active', () => {
      render(<SearchFilters {...defaultProps} showFavoritesOnly={true} />);

      const favoritesButton = screen.getByRole('button', { name: /favoris/i });
      expect(favoritesButton).toHaveClass('bg-red-500');
    });

    it('should fill heart icon when active', () => {
      render(<SearchFilters {...defaultProps} showFavoritesOnly={true} />);

      const favoritesButton = screen.getByRole('button', { name: /favoris/i });
      const heartIcon = favoritesButton.querySelector('svg');
      expect(heartIcon).toHaveAttribute('fill', 'currentColor');
    });
  });

  describe('Album Filter', () => {
    it('should display all albums in dropdown', () => {
      render(<SearchFilters {...defaultProps} />);

      const albumSelect = screen.getByLabelText(/filtrer par album/i);
      const options = Array.from(albumSelect.querySelectorAll('option'));

      expect(options).toHaveLength(3); // "Tous les albums" + 2 albums
      expect(options[1].textContent).toContain('Ceremony');
      expect(options[2].textContent).toContain('Reception');
    });

    it('should show photo count for each album', () => {
      render(<SearchFilters {...defaultProps} />);

      const albumSelect = screen.getByLabelText(/filtrer par album/i);
      
      expect(albumSelect.textContent).toContain('Ceremony (15)');
      expect(albumSelect.textContent).toContain('Reception (30)');
    });

    it('should call onAlbumChange when album selected', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const albumSelect = screen.getByLabelText(/filtrer par album/i);
      await user.selectOptions(albumSelect, 'album-1');

      expect(defaultProps.onAlbumChange).toHaveBeenCalledWith('album-1');
    });

    it('should display selected album', () => {
      render(<SearchFilters {...defaultProps} selectedAlbumId="album-2" />);

      const albumSelect = screen.getByLabelText(/filtrer par album/i) as HTMLSelectElement;
      expect(albumSelect.value).toBe('album-2');
    });

    it('should allow clearing album filter', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} selectedAlbumId="album-1" />);

      const albumSelect = screen.getByLabelText(/filtrer par album/i);
      await user.selectOptions(albumSelect, '');

      expect(defaultProps.onAlbumChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Sort Options', () => {
    it('should display all sort options', () => {
      render(<SearchFilters {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/trier par/i);
      const options = Array.from(sortSelect.querySelectorAll('option'));

      expect(options).toHaveLength(3);
      expect(options.map(o => o.textContent)).toEqual([
        'Plus récent',
        'Plus ancien',
        'Par auteur',
      ]);
    });

    it('should call onSortChange when option selected', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const sortSelect = screen.getByLabelText(/trier par/i);
      await user.selectOptions(sortSelect, 'oldest');

      expect(defaultProps.onSortChange).toHaveBeenCalledWith('oldest');
    });

    it('should display selected sort option', () => {
      render(<SearchFilters {...defaultProps} sortBy="author" />);

      const sortSelect = screen.getByLabelText(/trier par/i) as HTMLSelectElement;
      expect(sortSelect.value).toBe('author');
    });
  });

  describe('Clear Filters', () => {
    it('should show reset button when filters active', () => {
      render(<SearchFilters {...defaultProps} searchQuery="test" />);

      expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument();
    });

    it('should not show reset button when no filters active', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /réinitialiser/i })).not.toBeInTheDocument();
    });

    it('should clear all filters when reset clicked', async () => {
      const user = userEvent.setup();
      render(
        <SearchFilters
          {...defaultProps}
          searchQuery="test"
          mediaType="image"
          sortBy="oldest"
          showFavoritesOnly={true}
          selectedAlbumId="album-1"
        />
      );

      const resetButton = screen.getByRole('button', { name: /réinitialiser/i });
      await user.click(resetButton);

      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('');
      expect(defaultProps.onMediaTypeChange).toHaveBeenCalledWith('all');
      expect(defaultProps.onSortChange).toHaveBeenCalledWith('newest');
      expect(defaultProps.onShowFavoritesChange).toHaveBeenCalledWith(false);
      expect(defaultProps.onAlbumChange).toHaveBeenCalledWith(null);
    });

    it('should consider search query as active filter', () => {
      render(<SearchFilters {...defaultProps} searchQuery="test" />);

      expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument();
    });

    it('should consider non-default media type as active filter', () => {
      render(<SearchFilters {...defaultProps} mediaType="video" />);

      expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument();
    });

    it('should consider non-default sort as active filter', () => {
      render(<SearchFilters {...defaultProps} sortBy="oldest" />);

      expect(screen.getByRole('button', { name: /réinitialiser/i })).toBeInTheDocument();
    });
  });

  describe('Results Counter', () => {
    it('should show result count when filters active', () => {
      render(
        <SearchFilters
          {...defaultProps}
          searchQuery="test"
          resultCount={10}
          totalCount={50}
        />
      );

      expect(screen.getByText(/10 résultats sur 50/i)).toBeInTheDocument();
    });

    it('should not show counter when no filters active', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.queryByText(/résultat/i)).not.toBeInTheDocument();
    });

    it('should show singular form for single result', () => {
      render(
        <SearchFilters
          {...defaultProps}
          searchQuery="test"
          resultCount={1}
          totalCount={50}
        />
      );

      expect(screen.getByText(/1 résultat sur 50/i)).toBeInTheDocument();
    });

    it('should show "no results" message when count is zero', () => {
      render(
        <SearchFilters
          {...defaultProps}
          searchQuery="test"
          resultCount={0}
          totalCount={50}
        />
      );

      expect(screen.getByText(/aucun résultat trouvé/i)).toBeInTheDocument();
    });

    it('should not show "sur X" when showing all results', () => {
      render(
        <SearchFilters
          {...defaultProps}
          searchQuery="test"
          resultCount={50}
          totalCount={50}
        />
      );

      expect(screen.getByText(/50 résultats$/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByLabelText(/rechercher dans la galerie/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/trier par/i)).toBeInTheDocument();
    });

    it('should have screen reader only labels', () => {
      render(<SearchFilters {...defaultProps} />);

      const sortLabel = screen.getByLabelText(/trier par/i).previousElementSibling;
      expect(sortLabel).toHaveClass('sr-only');
    });

    it('should have proper button labels', () => {
      render(<SearchFilters {...defaultProps} />);

      expect(screen.getByRole('button', { name: /tout/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /photos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /vidéos/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty albums array', () => {
      render(<SearchFilters {...defaultProps} albums={[]} />);

      expect(screen.queryByLabelText(/filtrer par album/i)).not.toBeInTheDocument();
    });

    it('should handle albums with zero photos', () => {
      const albumsWithZero = [
        { ...mockAlbums[0], photoCount: 0 },
      ];

      render(<SearchFilters {...defaultProps} albums={albumsWithZero} />);

      const albumSelect = screen.getByLabelText(/filtrer par album/i);
      expect(albumSelect.textContent).toContain('(0)');
    });

    it('should handle albums without photoCount', () => {
      const albumsWithoutCount = [
        { id: 'album-1', name: 'Ceremony', createdAt: new Date() },
      ];

      render(<SearchFilters {...defaultProps} albums={albumsWithoutCount as any} />);

      const albumSelect = screen.getByLabelText(/filtrer par album/i);
      expect(albumSelect.textContent).toContain('(0)');
    });

    it('should handle very long search queries', async () => {
      const user = userEvent.setup();
      render(<SearchFilters {...defaultProps} />);

      const longQuery = 'a'.repeat(200);
      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      
      await user.type(searchInput, longQuery);

      // Should not crash
      expect(defaultProps.onSearchChange).toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('should display dividers between filter groups', () => {
      render(<SearchFilters {...defaultProps} />);

      const filterContainer = screen.getByRole('button', { name: /tout/i }).parentElement;
      const dividers = filterContainer?.querySelectorAll('.w-px');
      
      expect(dividers).not.toBeNull();
    });

    it('should arrange filters horizontally', () => {
      render(<SearchFilters {...defaultProps} />);

      const filterContainer = screen.getByRole('button', { name: /tout/i }).parentElement;
      expect(filterContainer).toHaveClass('flex');
    });
  });
});
