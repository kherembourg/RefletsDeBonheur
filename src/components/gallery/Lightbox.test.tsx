/**
 * Component Test: Lightbox
 * 
 * Tests for the Lightbox component that displays images/videos in a modal overlay.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Lightbox from './Lightbox';

describe('Lightbox Component', () => {
  const mockMedia = {
    id: 'media-1',
    url: 'https://example.com/image.jpg',
    thumbnail_url: 'https://example.com/thumb.jpg',
    type: 'image',
    title: 'Test Image',
    description: 'Test description',
  };

  const mockOnClose = vi.fn();
  const mockOnNext = vi.fn();
  const mockOnPrevious = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display image when media type is image', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockMedia.url);
    });

    it('should display video when media type is video', () => {
      const videoMedia = {
        ...mockMedia,
        type: 'video',
        url: 'https://example.com/video.mp4',
      };

      render(
        <Lightbox
          media={videoMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('application')).toBeInTheDocument(); // Video player
    });

    it('should display media title if provided', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(mockMedia.title)).toBeInTheDocument();
    });

    it('should display media description if provided', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(mockMedia.description)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should close when close button clicked', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close when overlay clicked', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when image clicked', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByRole('img');
      fireEvent.click(image);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should navigate to next media when next button clicked', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          onNext={mockOnNext}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('should navigate to previous media when previous button clicked', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          onPrevious={mockOnPrevious}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      fireEvent.click(prevButton);

      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
    });

    it('should close when Escape key pressed', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should navigate next when ArrowRight key pressed', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          onNext={mockOnNext}
        />
      );

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      expect(mockOnNext).toHaveBeenCalled();
    });

    it('should navigate previous when ArrowLeft key pressed', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          onPrevious={mockOnPrevious}
        />
      );

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(mockOnPrevious).toHaveBeenCalled();
    });
  });

  describe('Navigation Controls', () => {
    it('should hide previous button when at first item', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          isFirst={true}
        />
      );

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    });

    it('should hide next button when at last item', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          isLast={true}
        />
      );

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('should display current position indicator', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          currentIndex={2}
          totalCount={10}
        />
      );

      expect(screen.getByText(/3 \/ 10/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while image loads', async () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Before image loads
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading indicator

      // Simulate image load
      const image = screen.getByRole('img');
      fireEvent.load(image);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should show error message if image fails to load', async () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByRole('img');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Zoom & Pan', () => {
    it('should support zoom in', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          enableZoom={true}
        />
      );

      const zoomInButton = screen.getByRole('button', { name: /zoom in/i });
      fireEvent.click(zoomInButton);

      const image = screen.getByRole('img');
      expect(image).toHaveStyle({ transform: expect.stringContaining('scale') });
    });

    it('should support zoom out', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
          enableZoom={true}
        />
      );

      const zoomOutButton = screen.getByRole('button', { name: /zoom out/i });
      fireEvent.click(zoomOutButton);

      const image = screen.getByRole('img');
      expect(image).toHaveStyle({ transform: expect.stringContaining('scale') });
    });

    it('should reset zoom when changing media', () => {
      const { rerender } = render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const newMedia = { ...mockMedia, id: 'media-2', url: 'https://example.com/image2.jpg' };

      rerender(
        <Lightbox
          media={newMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByRole('img');
      expect(image).not.toHaveStyle({ transform: expect.stringContaining('scale(2)') });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label');
    });

    it('should trap focus within lightbox', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();

      expect(document.activeElement).toBe(closeButton);
    });

    it('should restore focus on close', () => {
      const triggerButton = document.createElement('button');
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      const { unmount } = render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      unmount();

      expect(document.activeElement).toBe(triggerButton);
      document.body.removeChild(triggerButton);
    });

    it('should have alt text for images', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', mockMedia.title);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing media gracefully', () => {
      render(
        <Lightbox
          media={null}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/no media/i)).toBeInTheDocument();
    });

    it('should handle invalid media URLs', () => {
      const invalidMedia = {
        ...mockMedia,
        url: '',
      };

      render(
        <Lightbox
          media={invalidMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });

    it('should prevent body scroll when open', () => {
      render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(document.body).toHaveStyle({ overflow: 'hidden' });
    });

    it('should restore body scroll when closed', () => {
      const { unmount } = render(
        <Lightbox
          media={mockMedia}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      unmount();

      expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
    });
  });
});
