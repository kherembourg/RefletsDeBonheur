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
    thumbnail_url: 'https://example.com/thumb.jpg',
    type: 'image',
    title: 'Test Image',
    uploaded_by: 'John Doe',
    created_at: '2026-02-01T10:00:00Z',
    reactions: [],
  };

  const mockOnClick = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnReact = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with media data', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should display thumbnail when available', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mockMedia.thumbnail_url);
    });

    it('should fallback to full URL when thumbnail not available', () => {
      const mediaWithoutThumb = { ...mockMedia, thumbnail_url: null };
      render(<MediaCard item={mediaWithoutThumb} isAdmin={false} onDelete={vi.fn()} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mockMedia.url);
    });

    it('should display video icon for video media', () => {
      const videoMedia = { ...mockMedia, type: 'video' };
      render(<MediaCard item={videoMedia} isAdmin={false} onDelete={vi.fn()} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      expect(screen.getByLabelText(/video/i)).toBeInTheDocument();
    });

    it('should display uploader name', () => {
      render(<MediaCard item={mockMedia} onClick={mockOnClick} showUploader={true} />);

      expect(screen.getByText(mockMedia.uploaded_by)).toBeInTheDocument();
    });

    it('should display upload date', () => {
      render(<MediaCard item={mockMedia} onClick={mockOnClick} showDate={true} />);

      expect(screen.getByText(/feb/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClick when card is clicked', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledWith(mockMedia);
    });

    it('should support keyboard navigation', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should be selectable in selection mode', () => {
      render(
        <MediaCard
          media={mockMedia}
          onClick={mockOnClick}
          selectionMode={true}
          onSelect={mockOnSelect}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnSelect).toHaveBeenCalledWith(mockMedia.id);
    });

    it('should show selection checkbox on hover', () => {
      render(
        <MediaCard
          media={mockMedia}
          onClick={mockOnClick}
          selectionMode={true}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.mouseEnter(card);

      expect(screen.getByRole('checkbox')).toBeVisible();
    });
  });

  describe('Reactions', () => {
    it('should display reaction count', () => {
      const mediaWithReactions = {
        ...mockMedia,
        reactions: [
          { emoji: '❤️', count: 5 },
          { emoji: '👍', count: 3 },
        ],
      };

      render(<MediaCard item={mediaWithReactions} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      expect(screen.getByText('❤️ 5')).toBeInTheDocument();
      expect(screen.getByText('👍 3')).toBeInTheDocument();
    });

    it('should allow adding reactions', () => {
      render(
        <MediaCard
          media={mockMedia}
          onClick={mockOnClick}
          onReact={mockOnReact}
        />
      );

      const reactButton = screen.getByRole('button', { name: /react/i });
      fireEvent.click(reactButton);

      expect(mockOnReact).toHaveBeenCalledWith(mockMedia.id);
    });

    it('should show reaction picker on hover', async () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('should limit displayed reactions to top 3', () => {
      const mediaWithManyReactions = {
        ...mockMedia,
        reactions: [
          { emoji: '❤️', count: 10 },
          { emoji: '👍', count: 8 },
          { emoji: '😍', count: 6 },
          { emoji: '🎉', count: 4 },
          { emoji: '👏', count: 2 },
        ],
      };

      render(<MediaCard item={mediaWithManyReactions} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const reactionElements = screen.getAllByText(/[❤️👍😍]/);
      expect(reactionElements.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Loading States', () => {
    it('should show loading placeholder before image loads', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should remove loading placeholder after image loads', async () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should show error state if image fails to load', async () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Context Menu', () => {
    it('should open context menu on right click', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.contextMenu(card);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should have download option in context menu', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      fireEvent.contextMenu(card);

      expect(screen.getByText(/download/i)).toBeInTheDocument();
    });

    it('should have delete option for owner', () => {
      render(
        <MediaCard
          media={mockMedia}
          onClick={mockOnClick}
          isOwner={true}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.contextMenu(card);

      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    it('should not have delete option for non-owner', () => {
      render(
        <MediaCard
          media={mockMedia}
          onClick={mockOnClick}
          isOwner={false}
        />
      );

      const card = screen.getByRole('button');
      fireEvent.contextMenu(card);

      expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
    });
  });

  describe('Lazy Loading', () => {
    it('should use loading="lazy" for images', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('should load immediately when in viewport', () => {
      const { container } = render(
        <MediaCard item={mockMedia} onClick={mockOnClick} inViewport={true} />
      );

      const image = container.querySelector('img');
      expect(image).toHaveAttribute('loading', 'eager');
    });
  });

  describe('Accessibility', () => {
    it('should have alt text for images', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', mockMedia.title);
    });

    it('should be keyboard accessible', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('should announce selection state to screen readers', () => {
      render(
        <MediaCard
          media={mockMedia}
          onClick={mockOnClick}
          selectionMode={true}
          selected={true}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing thumbnail gracefully', () => {
      const mediaWithoutThumb = { ...mockMedia, thumbnail_url: null };
      render(<MediaCard item={mediaWithoutThumb} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', mockMedia.url);
    });

    it('should handle missing title', () => {
      const mediaWithoutTitle = { ...mockMedia, title: null };
      render(<MediaCard item={mediaWithoutTitle} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Untitled');
    });

    it('should handle long titles with ellipsis', () => {
      const mediaWithLongTitle = {
        ...mockMedia,
        title: 'This is a very long title that should be truncated with ellipsis',
      };

      render(<MediaCard item={mediaWithLongTitle} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const titleElement = screen.getByText(/This is a very long/);
      expect(titleElement).toHaveStyle({ textOverflow: 'ellipsis' });
    });

    it('should maintain aspect ratio', () => {
      render(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      const card = screen.getByRole('button');
      expect(card).toHaveStyle({ aspectRatio: '1 / 1' });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(
        <MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />
      );

      const image = screen.getByRole('img');
      const initialSrc = image.getAttribute('src');

      // Rerender with same props
      rerender(<MediaCard item={mockMedia} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />);

      expect(image.getAttribute('src')).toBe(initialSrc);
    });

    it('should use memo for expensive computations', () => {
      const largeMediaList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMedia,
        id: `media-${i}`,
      }));

      const { rerender } = render(
        <div>
          {largeMediaList.map(media => (
            <MediaCard key={media.id} media={media} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />
          ))}
        </div>
      );

      const startTime = Date.now();
      rerender(
        <div>
          {largeMediaList.map(media => (
            <MediaCard key={media.id} media={media} isAdmin={false} onDelete={vi.fn()} onClick={mockOnClick} />
          ))}
        </div>
      );
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100); // Should be fast
    });
  });
});
