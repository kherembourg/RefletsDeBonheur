/**
 * MediaCard Component Tests
 * Tests the gallery media card display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaCard } from './MediaCard';
import type { MediaItem } from '../../lib/services/dataService';

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
      expect(img).toHaveAttribute('alt', mockImageItem.caption);
    });

    it('should render author pill in public view', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(mockImageItem.author!)).toBeInTheDocument();
    });

    it('should not render author pill when no author', () => {
      const itemWithoutAuthor = { ...mockImageItem, author: undefined };
      render(
        <MediaCard
          item={itemWithoutAuthor}
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.queryByText('Test Author')).not.toBeInTheDocument();
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

    it('should call onToggleSelection in selection mode for admin view', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          onClick={mockOnClick}
          selectionMode={true}
          onToggleSelection={mockOnToggleSelection}
          variant="admin"
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
          variant="admin"
        />
      );

      expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
    });

    it('should show delete button for admin', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={true}
          onDelete={mockOnDelete}
          variant="admin"
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
          variant="admin"
        />
      );

      const deleteButton = screen.getByRole('button', { name: /supprimer/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('Supprimer définitivement ce souvenir ?');
      expect(mockOnDelete).toHaveBeenCalledWith(mockImageItem.id);
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
  });

  describe('Selection Mode', () => {
    it('should show selection checkbox in selection mode for admin view', () => {
      render(
        <MediaCard
          item={mockImageItem}
          isAdmin={false}
          onDelete={mockOnDelete}
          selectionMode={true}
          variant="admin"
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
          variant="admin"
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
          variant="admin"
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
          variant="admin"
        />
      );

      const card = container.querySelector('.media-card');
      expect(card).toHaveClass('ring-2');
    });
  });

  describe('Edge Cases', () => {
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
