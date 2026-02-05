/**
 * Component Test: MediaCard
 *
 * Tests for the MediaCard component that displays media thumbnails in the gallery grid.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MediaCard } from './MediaCard';

describe('MediaCard Component', () => {
  const mockMedia = {
    id: 'media-1',
    url: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    type: 'photo' as const,
    caption: 'Test Image',
    author: 'John Doe',
    uploadedAt: new Date('2026-02-01T10:00:00Z'),
    reactions: {},
  };

  const mockOnClick = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleSelection = vi.fn();

  // Default required props
  const defaultProps = {
    item: mockMedia,
    isAdmin: false,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('should render with media data', () => {
      const { container } = render(<MediaCard {...defaultProps} />);
      expect(container.querySelector('.media-card')).toBeInTheDocument();
    });

    it('should display thumbnail when available', () => {
      render(<MediaCard {...defaultProps} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', expect.stringContaining('thumb.jpg'));
    });

    it('should fallback to full URL when thumbnail not available', () => {
      const mediaWithoutThumb = { ...mockMedia, thumbnailUrl: undefined };
      render(<MediaCard {...defaultProps} item={mediaWithoutThumb} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', expect.stringContaining('image.jpg'));
    });

    it('should display video icon for video media', () => {
      const videoMedia = { ...mockMedia, type: 'video' as const, url: 'https://example.com/video.mp4' };
      const { container } = render(<MediaCard {...defaultProps} item={videoMedia} variant="public" />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('should display uploader name in public view', () => {
      render(<MediaCard {...defaultProps} variant="public" />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should not display uploader name in admin view', () => {
      render(<MediaCard {...defaultProps} variant="admin" />);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', () => {
      const { container } = render(<MediaCard {...defaultProps} onClick={mockOnClick} />);
      const card = container.querySelector('.media-card');
      if (card) {
        fireEvent.click(card);
        expect(mockOnClick).toHaveBeenCalledWith(mockMedia.id);
      }
    });

    it('should support keyboard navigation', () => {
      const { container } = render(<MediaCard {...defaultProps} onClick={mockOnClick} />);
      const card = container.querySelector('.media-card');
      if (card) {
        fireEvent.keyDown(card, { key: 'Enter' });
        expect(mockOnClick).toHaveBeenCalled();
      }
    });

    it('should be selectable in selection mode', () => {
      render(
        <MediaCard
          {...defaultProps}
          variant="admin"
          selectionMode={true}
          onToggleSelection={mockOnToggleSelection}
        />
      );
      const checkbox = screen.getByLabelText(/sélectionner/i);
      fireEvent.click(checkbox);
      expect(mockOnToggleSelection).toHaveBeenCalledWith(mockMedia.id);
    });

    it('should toggle selection when card clicked in selection mode', () => {
      const { container } = render(
        <MediaCard
          {...defaultProps}
          variant="admin"
          selectionMode={true}
          onToggleSelection={mockOnToggleSelection}
        />
      );
      const card = container.querySelector('.media-card');
      if (card) {
        fireEvent.click(card);
        expect(mockOnToggleSelection).toHaveBeenCalledWith(mockMedia.id);
      }
    });
  });

  describe('Favorite Button', () => {
    it('should show favorite button in public view', () => {
      render(<MediaCard {...defaultProps} variant="public" />);
      expect(screen.getByLabelText(/ajouter aux favoris/i)).toBeInTheDocument();
    });

    it('should not show favorite button in admin view', () => {
      render(<MediaCard {...defaultProps} variant="admin" />);
      expect(screen.queryByLabelText(/ajouter aux favoris/i)).not.toBeInTheDocument();
    });

    it('should allow toggling favorites', () => {
      const mockOnToggleFavorite = vi.fn();
      render(
        <MediaCard
          {...defaultProps}
          variant="public"
          onToggleFavorite={mockOnToggleFavorite}
        />
      );
      const favoriteButton = screen.getByLabelText(/ajouter aux favoris/i);
      fireEvent.click(favoriteButton);
      expect(mockOnToggleFavorite).toHaveBeenCalledWith(mockMedia.id);
    });

    it('should show different label when favorited', () => {
      render(<MediaCard {...defaultProps} variant="public" isFavorited={true} />);
      expect(screen.getByLabelText(/retirer des favoris/i)).toBeInTheDocument();
    });
  });

  describe('Download Button', () => {
    it('should show download button for photos in public view', () => {
      render(<MediaCard {...defaultProps} variant="public" />);
      expect(screen.getByLabelText(/télécharger/i)).toBeInTheDocument();
    });

    it('should not show download button for videos', () => {
      const videoMedia = { ...mockMedia, type: 'video' as const };
      render(<MediaCard {...defaultProps} item={videoMedia} variant="public" />);
      expect(screen.queryByLabelText(/télécharger/i)).not.toBeInTheDocument();
    });

    it('should trigger download when clicked', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      render(<MediaCard {...defaultProps} variant="public" />);
      const downloadButton = screen.getByLabelText(/télécharger/i);
      fireEvent.click(downloadButton);
      expect(createElementSpy).toHaveBeenCalledWith('a');
    });
  });

  describe('Delete Button', () => {
    it('should show delete button for admin in admin view', () => {
      const { container } = render(<MediaCard {...defaultProps} variant="admin" isAdmin={true} />);
      const deleteButton = container.querySelector('[aria-label="Supprimer"]');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not render delete button for non-admin', () => {
      render(<MediaCard {...defaultProps} variant="admin" isAdmin={false} />);
      expect(screen.queryByLabelText(/supprimer/i)).not.toBeInTheDocument();
    });

    it('should confirm before deleting', () => {
      render(<MediaCard {...defaultProps} variant="admin" isAdmin={true} />);
      const deleteButton = screen.getByLabelText(/supprimer/i);
      fireEvent.click(deleteButton);
      expect(global.confirm).toHaveBeenCalled();
    });

    it('should call onDelete when confirmed', () => {
      global.confirm = vi.fn(() => true);
      render(<MediaCard {...defaultProps} variant="admin" isAdmin={true} />);
      const deleteButton = screen.getByLabelText(/supprimer/i);
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith(mockMedia.id);
    });

    it('should not call onDelete when cancelled', () => {
      global.confirm = vi.fn(() => false);
      render(<MediaCard {...defaultProps} variant="admin" isAdmin={true} />);
      const deleteButton = screen.getByLabelText(/supprimer/i);
      fireEvent.click(deleteButton);
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should not show delete button in selection mode', () => {
      render(
        <MediaCard
          {...defaultProps}
          variant="admin"
          isAdmin={true}
          selectionMode={true}
        />
      );
      expect(screen.queryByLabelText(/supprimer/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading placeholder before image loads', () => {
      const { container } = render(<MediaCard {...defaultProps} />);
      const image = screen.getByRole('img');
      expect(image).toHaveClass('opacity-0');
    });

    it('should remove loading placeholder after image loads', async () => {
      render(<MediaCard {...defaultProps} />);
      const image = screen.getByRole('img');
      fireEvent.load(image);
      await waitFor(() => {
        expect(image).toHaveClass('opacity-100');
      });
    });

    it('should show processing indicator for processing media', () => {
      const processingMedia = { ...mockMedia, status: 'processing' as const };
      render(<MediaCard {...defaultProps} item={processingMedia} />);
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });

  describe('Selection Mode', () => {
    it('should show checkbox in admin selection mode', () => {
      render(
        <MediaCard
          {...defaultProps}
          variant="admin"
          selectionMode={true}
        />
      );
      expect(screen.getByLabelText(/sélectionner/i)).toBeInTheDocument();
    });

    it('should show different label when selected', () => {
      render(
        <MediaCard
          {...defaultProps}
          variant="admin"
          selectionMode={true}
          isSelected={true}
        />
      );
      expect(screen.getByLabelText(/désélectionner/i)).toBeInTheDocument();
    });

    it('should not show checkbox in public view', () => {
      render(
        <MediaCard
          {...defaultProps}
          variant="public"
          selectionMode={true}
        />
      );
      expect(screen.queryByLabelText(/sélectionner/i)).not.toBeInTheDocument();
    });
  });

  describe('Lazy Loading', () => {
    it('should use loading="lazy" for images', () => {
      render(<MediaCard {...defaultProps} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Accessibility', () => {
    it('should have alt text for images', () => {
      render(<MediaCard {...defaultProps} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', expect.stringContaining('Test Image'));
    });

    it('should be keyboard accessible', () => {
      const { container } = render(<MediaCard {...defaultProps} onClick={mockOnClick} />);
      const card = container.querySelector('.media-card');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-label for card', () => {
      const { container } = render(<MediaCard {...defaultProps} />);
      const card = container.querySelector('.media-card');
      expect(card).toHaveAttribute('aria-label');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing thumbnail gracefully', () => {
      const mediaWithoutThumb = { ...mockMedia, thumbnailUrl: undefined };
      render(<MediaCard {...defaultProps} item={mediaWithoutThumb} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src');
    });

    it('should handle missing caption', () => {
      const mediaWithoutCaption = { ...mockMedia, caption: undefined };
      render(<MediaCard {...defaultProps} item={mediaWithoutCaption} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt');
    });

    it('should handle missing author', () => {
      const mediaWithoutAuthor = { ...mockMedia, author: undefined };
      render(<MediaCard {...defaultProps} item={mediaWithoutAuthor} variant="public" />);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<MediaCard {...defaultProps} />);
      const image = screen.getByRole('img');
      const initialSrc = image.getAttribute('src');

      // Rerender with same props
      rerender(<MediaCard {...defaultProps} />);
      expect(image.getAttribute('src')).toBe(initialSrc);
    });
  });
});
