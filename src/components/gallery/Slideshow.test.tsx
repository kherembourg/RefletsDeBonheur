/**
 * Component Test: Slideshow
 * 
 * Tests for the Slideshow component that displays media in presentation mode.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Slideshow } from './Slideshow';

describe('Slideshow Component', () => {
  const mockMedia = [
    {
      id: 'media-1',
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
      id: 'media-2',
      url: 'https://example.com/photo2.jpg',
      type: 'image' as const,
      author: 'Thomas',
      caption: 'Wedding dance',
      createdAt: new Date('2026-01-16'),
      favoriteCount: 3,
      reactions: [],
      albumIds: [],
    },
    {
      id: 'media-3',
      url: 'https://example.com/video1.mp4',
      type: 'video' as const,
      author: 'Marie',
      caption: 'First dance video',
      createdAt: new Date('2026-01-17'),
      favoriteCount: 8,
      reactions: [],
      albumIds: [],
    },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render slideshow container', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText('Sophie')).toBeInTheDocument();
    });

    it('should display first image by default', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByAltText(/photo par sophie/i)).toBeInTheDocument();
    });

    it('should start at specified initial index', () => {
      render(<Slideshow media={mockMedia} initialIndex={1} onClose={mockOnClose} />);

      expect(screen.getByText('Thomas')).toBeInTheDocument();
    });

    it('should display author name', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText('Sophie')).toBeInTheDocument();
    });

    it('should display caption when available', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText('Beautiful moment')).toBeInTheDocument();
    });

    it('should display progress bar', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText(/1 \/ 3/i)).toBeInTheDocument();
    });

    it('should display close button', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByLabelText(/fermer le diaporama/i)).toBeInTheDocument();
    });
  });

  describe('Auto-advance', () => {
    it('should auto-advance to next image', async () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText('Sophie')).toBeInTheDocument();

      // Advance time by 5 seconds (default speed)
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText('Thomas')).toBeInTheDocument();
      });
    });

    it('should loop back to first image after last', async () => {
      render(<Slideshow media={mockMedia} initialIndex={2} onClose={mockOnClose} />);

      expect(screen.getByText('Marie')).toBeInTheDocument();

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText('Sophie')).toBeInTheDocument();
      });
    });

    it('should stop auto-advance when paused', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const pauseButton = screen.getByLabelText(/pause/i);
      await user.click(pauseButton);

      const currentAuthor = screen.getByText('Sophie');

      vi.advanceTimersByTime(10000);

      // Should still be on same image
      expect(currentAuthor).toBeInTheDocument();
    });

    it('should resume auto-advance when play clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      // Pause
      const pauseButton = screen.getByLabelText(/pause/i);
      await user.click(pauseButton);

      // Resume
      const playButton = screen.getByLabelText(/lecture/i);
      await user.click(playButton);

      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText('Thomas')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Controls', () => {
    it('should go to next image when next button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const nextButton = screen.getByLabelText(/photo suivante/i);
      await user.click(nextButton);

      expect(screen.getByText('Thomas')).toBeInTheDocument();
    });

    it('should go to previous image when previous button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} initialIndex={1} onClose={mockOnClose} />);

      const prevButton = screen.getByLabelText(/photo précédente/i);
      await user.click(prevButton);

      expect(screen.getByText('Sophie')).toBeInTheDocument();
    });

    it('should loop to last when going previous from first', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const prevButton = screen.getByLabelText(/photo précédente/i);
      await user.click(prevButton);

      expect(screen.getByText('Marie')).toBeInTheDocument();
    });

    it('should loop to first when going next from last', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} initialIndex={2} onClose={mockOnClose} />);

      const nextButton = screen.getByLabelText(/photo suivante/i);
      await user.click(nextButton);

      expect(screen.getByText('Sophie')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close on Escape key', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should go to next on ArrowRight', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText('Sophie')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      expect(screen.getByText('Thomas')).toBeInTheDocument();
    });

    it('should go to previous on ArrowLeft', () => {
      render(<Slideshow media={mockMedia} initialIndex={1} onClose={mockOnClose} />);

      expect(screen.getByText('Thomas')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      expect(screen.getByText('Sophie')).toBeInTheDocument();
    });

    it('should toggle play/pause on Space key', async () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByLabelText(/pause/i)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: ' ' });

      await waitFor(() => {
        expect(screen.getByLabelText(/lecture/i)).toBeInTheDocument();
      });
    });

    it('should prevent default on Space key', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const event = new KeyboardEvent('keydown', { key: ' ' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Speed Settings', () => {
    it('should show settings button', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByLabelText(/paramètres/i)).toBeInTheDocument();
    });

    it('should open settings menu when button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const settingsButton = screen.getByLabelText(/paramètres/i);
      await user.click(settingsButton);

      expect(screen.getByText(/vitesse du diaporama/i)).toBeInTheDocument();
    });

    it('should display all speed options', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const settingsButton = screen.getByLabelText(/paramètres/i);
      await user.click(settingsButton);

      expect(screen.getByText(/rapide \(3s\)/i)).toBeInTheDocument();
      expect(screen.getByText(/normal \(5s\)/i)).toBeInTheDocument();
      expect(screen.getByText(/lent \(7s\)/i)).toBeInTheDocument();
      expect(screen.getByText(/très lent \(10s\)/i)).toBeInTheDocument();
    });

    it('should change speed when option selected', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const settingsButton = screen.getByLabelText(/paramètres/i);
      await user.click(settingsButton);

      const fastOption = screen.getByText(/rapide \(3s\)/i);
      await user.click(fastOption);

      // Settings should close
      await waitFor(() => {
        expect(screen.queryByText(/vitesse du diaporama/i)).not.toBeInTheDocument();
      });

      // Should advance after 3 seconds instead of 5
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.getByText('Thomas')).toBeInTheDocument();
      });
    });

    it('should highlight current speed', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const settingsButton = screen.getByLabelText(/paramètres/i);
      await user.click(settingsButton);

      const normalOption = screen.getByText(/normal \(5s\)/i);
      expect(normalOption).toHaveClass('bg-burgundy-old');
    });
  });

  describe('Fullscreen', () => {
    it('should show fullscreen button', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByLabelText(/plein écran/i)).toBeInTheDocument();
    });

    it('should request fullscreen when button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
      
      HTMLElement.prototype.requestFullscreen = requestFullscreenMock;

      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const fullscreenButton = screen.getByLabelText(/plein écran/i);
      await user.click(fullscreenButton);

      expect(requestFullscreenMock).toHaveBeenCalled();
    });

    it('should toggle fullscreen on f key', () => {
      const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
      HTMLElement.prototype.requestFullscreen = requestFullscreenMock;

      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      fireEvent.keyDown(window, { key: 'f' });

      expect(requestFullscreenMock).toHaveBeenCalled();
    });
  });

  describe('Progress Display', () => {
    it('should show current position', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText(/1 \/ 3/i)).toBeInTheDocument();
    });

    it('should show progress percentage', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText(/33%/i)).toBeInTheDocument();
    });

    it('should update progress bar width', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const nextButton = screen.getByLabelText(/photo suivante/i);
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/67%/i)).toBeInTheDocument();
      });
    });

    it('should show 100% on last image', () => {
      render(<Slideshow media={mockMedia} initialIndex={2} onClose={mockOnClose} />);

      expect(screen.getByText(/100%/i)).toBeInTheDocument();
    });
  });

  describe('Video Handling', () => {
    it('should display video element for video media', () => {
      render(<Slideshow media={mockMedia} initialIndex={2} onClose={mockOnClose} />);

      const video = screen.getByRole('application') || document.querySelector('video');
      expect(video).toBeInTheDocument();
    });

    it('should autoplay videos', () => {
      render(<Slideshow media={mockMedia} initialIndex={2} onClose={mockOnClose} />);

      const video = document.querySelector('video');
      expect(video).toHaveAttribute('autoPlay');
    });

    it('should advance to next when video ends', async () => {
      render(<Slideshow media={mockMedia} initialIndex={2} onClose={mockOnClose} />);

      expect(screen.getByText('Marie')).toBeInTheDocument();

      const video = document.querySelector('video');
      fireEvent.ended(video!);

      await waitFor(() => {
        expect(screen.getByText('Sophie')).toBeInTheDocument();
      });
    });
  });

  describe('Body Scroll', () => {
    it('should prevent body scroll when mounted', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when unmounted', () => {
      const { unmount } = render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Keyboard Shortcuts Hint', () => {
    it('should display keyboard shortcuts on desktop', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      // Check for hints (they should exist in the DOM even if hidden on mobile)
      const hintsContainer = screen.getByText(/espace pour pause/i).closest('div');
      expect(hintsContainer).toBeInTheDocument();
    });

    it('should show space, arrow, f, and esc shortcuts', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByText(/espace pour pause/i)).toBeInTheDocument();
      expect(screen.getByText(/← → pour naviguer/i)).toBeInTheDocument();
      expect(screen.getByText(/f pour plein écran/i)).toBeInTheDocument();
      expect(screen.getByText(/esc pour fermer/i)).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText(/fermer le diaporama/i);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single media item', () => {
      render(<Slideshow media={[mockMedia[0]]} onClose={mockOnClose} />);

      expect(screen.getByText(/1 \/ 1/i)).toBeInTheDocument();
    });

    it('should handle media without caption', () => {
      const mediaWithoutCaption = [{ ...mockMedia[0], caption: '' }];
      render(<Slideshow media={mediaWithoutCaption} onClose={mockOnClose} />);

      expect(screen.queryByText('Beautiful moment')).not.toBeInTheDocument();
    });

    it('should cleanup interval on unmount', () => {
      const { unmount } = render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle initial index out of bounds', () => {
      render(<Slideshow media={mockMedia} initialIndex={10} onClose={mockOnClose} />);

      // Should default to a valid index (implementation dependent)
      expect(screen.getByText(/\d+ \/ 3/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      expect(screen.getByLabelText(/fermer le diaporama/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/photo suivante/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/photo précédente/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/pause/i)).toBeInTheDocument();
    });

    it('should have alt text for images', () => {
      render(<Slideshow media={mockMedia} onClose={mockOnClose} />);

      const image = screen.getByAltText(/photo par sophie/i);
      expect(image).toBeInTheDocument();
    });
  });
});
