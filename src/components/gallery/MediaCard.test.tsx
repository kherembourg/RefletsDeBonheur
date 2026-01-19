/**
 * MediaCard Component Tests
 * Tests the gallery media card display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaCard } from './MediaCard';
import type { MediaItem } from '../../lib/services/dataService';

// Mock ReactionsPanel
vi.mock('./ReactionsPanel', () => ({
  default: () => <div data-testid="reactions-panel">Reactions Panel</div>,
}));

const mockImageItem: MediaItem = {
  id: 'img-1',
  url: 'https://example.com/photo.jpg',
  type: 'image',
  author: 'Test Author',
  caption: 'Beautiful wedding photo',
  createdAt: new Date('2026-01-15'),
  favoriteCount: 5,
};

const mockVideoItem: MediaItem = {
  id: 'vid-1',
  url: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  type: 'video',
  author: 'Video Author',
  caption: 'Wedding dance video',
  createdAt: new Date('2026-01-15'),
};

describe('MediaCard Component', () => {
  const mockOnDelete = vi.fn();
  const mockOnClick = vi.fn();
  const mockOnToggleSelection = vi.fn();
  const mockOnToggleFavorite = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Image Rendering', () => {
    it('should render image media item', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockImageItem.url);
      // When caption is available, it's used as alt text
      expect(img).toHaveAttribute('alt', mockImageItem.caption);
    });

    it('should use caption as alt text when available', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', mockImageItem.caption);
    });

    it('should render caption with quotes', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(`"${mockImageItem.caption}"`)).toBeInTheDocument();
    });

    it('should render author name', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(mockImageItem.author!)).toBeInTheDocument();
    });

    it('should render "Anonyme" when no author', () => {
      const itemWithoutAuthor = { ...mockImageItem, author: undefined };
      render(
        <MediaCard
          item={itemWithoutAuthor}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Anonyme')).toBeInTheDocument();
    });
  });

  describe('Video Rendering', () => {
    it('should render video element', () => {
      const { container } = render(
        <MediaCard
          item={mockVideoItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', mockVideoItem.url);
      expect(video).toHaveAttribute('poster', mockVideoItem.thumbnailUrl);
    });

    it('should have video controls', () => {
      const { container } = render(
        <MediaCard
          item={mockVideoItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('controls');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when card is clicked', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByRole('img').closest('.media-card');
      fireEvent.click(card!);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should call onToggleSelection in selection mode', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          onClick={mockOnClick}
          selectionMode={true}
          onToggleSelection={mockOnToggleSelection}
        />
      );

      const card = screen.getByRole('img').closest('.media-card');
      fireEvent.click(card!);

      expect(mockOnToggleSelection).toHaveBeenCalledWith(mockImageItem.id);
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Admin Features', () => {
    it('should not show delete button for non-admin', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
    });

    it('should show delete button for admin on hover', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /supprimer/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should call onDelete with confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /supprimer/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('Supprimer définitivement ce souvenir ?');
      expect(mockOnDelete).toHaveBeenCalledWith(mockImageItem.id);
    });

    it('should not call onDelete when cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /supprimer/i });
      fireEvent.click(deleteButton);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should not show delete button in selection mode', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={true}
          onDelete={mockOnDelete}
          selectionMode={true}
        />
      );

      expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
    });
  });

  describe('Favorite Feature', () => {
    it('should render favorite button', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const favoriteButton = screen.getByRole('button', { name: /favoris/i });
      expect(favoriteButton).toBeInTheDocument();
    });

    it('should show "Ajouter aux favoris" when not favorited', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          isFavorited={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Ajouter aux favoris' })).toBeInTheDocument();
    });

    it('should show "Retirer des favoris" when favorited', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          isFavorited={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Retirer des favoris' })).toBeInTheDocument();
    });

    it('should call onToggleFavorite when clicking favorite button', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favoriteButton = screen.getByRole('button', { name: /favoris/i });
      fireEvent.click(favoriteButton);

      expect(mockOnToggleFavorite).toHaveBeenCalledWith(mockImageItem.id);
    });

    it('should display favorite count when > 0', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not display favorite count when 0', () => {
      const itemWithNoFavorites = { ...mockImageItem, favoriteCount: 0 };
      render(
        <MediaCard
          item={itemWithNoFavorites}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Selection Mode', () => {
    it('should show selection checkbox in selection mode', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          selectionMode={true}
        />
      );

      expect(screen.getByRole('button', { name: /sélectionner/i })).toBeInTheDocument();
    });

    it('should call onToggleSelection when checkbox clicked', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          selectionMode={true}
          onToggleSelection={mockOnToggleSelection}
        />
      );

      const checkbox = screen.getByRole('button', { name: /sélectionner/i });
      fireEvent.click(checkbox);

      expect(mockOnToggleSelection).toHaveBeenCalledWith(mockImageItem.id);
    });

    it('should show different text when selected', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          selectionMode={true}
          isSelected={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Désélectionner' })).toBeInTheDocument();
    });

    it('should apply selected styling', () => {
      const { container } = render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          selectionMode={true}
          isSelected={true}
        />
      );

      const card = container.querySelector('.media-card');
      expect(card).toHaveClass('ring-2');
    });
  });

  describe('Hover Interactions', () => {
    it('should show ReactionsPanel on hover', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      const card = screen.getByRole('img').closest('.media-card');
      fireEvent.mouseEnter(card!);

      expect(screen.getByTestId('reactions-panel')).toBeInTheDocument();
    });

    it('should hide ReactionsPanel when not hovering', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Initially not hovered
      expect(screen.queryByTestId('reactions-panel')).not.toBeInTheDocument();
    });

    it('should not show ReactionsPanel in selection mode', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          selectionMode={true}
        />
      );

      const card = screen.getByRole('img').closest('.media-card');
      fireEvent.mouseEnter(card!);

      expect(screen.queryByTestId('reactions-panel')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle item without caption', () => {
      const itemWithoutCaption = { ...mockImageItem, caption: undefined };
      render(
        <MediaCard
          item={itemWithoutCaption}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      // Should not render caption paragraph
      expect(screen.queryByText(/".*"/)).not.toBeInTheDocument();
    });

    it('should stop propagation on favorite button click', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          onClick={mockOnClick}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favoriteButton = screen.getByRole('button', { name: /favoris/i });
      fireEvent.click(favoriteButton);

      expect(mockOnToggleFavorite).toHaveBeenCalled();
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });
});
