/**
 * Component Test: BulkActions
 * 
 * Tests for the BulkActions component that handles bulk operations on media items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BulkActions from './BulkActions';

// Mock JSZip
vi.mock('jszip', () => {
  // Create a proper constructor function
  const MockJSZip = vi.fn(function(this: any) {
    this.file = vi.fn().mockReturnThis();
    this.generateAsync = vi.fn().mockResolvedValue(new Blob(['zip content']));
    return this;
  });

  return {
    default: MockJSZip,
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('BulkActions Component', () => {
  const mockAllItems = [
    {
      id: 'media-1',
      url: 'https://example.com/photo1.jpg',
      type: 'image',
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
      type: 'image',
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
      type: 'video',
      author: 'Marie',
      caption: 'First dance',
      createdAt: new Date('2026-01-17'),
      favoriteCount: 8,
      reactions: [],
      albumIds: [],
    },
  ];

  const mockOnClearSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['image data'])),
    });
  });

  describe('Rendering', () => {
    it('should not render when no items selected', () => {
      const selectedItems = new Set<string>();
      
      const { container } = render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when items are selected', () => {
      const selectedItems = new Set(['media-1', 'media-2']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText(/2 photos sélectionnées/i)).toBeInTheDocument();
    });

    it('should show correct count for single item', () => {
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText(/1 photo sélectionnée$/i)).toBeInTheDocument();
    });

    it('should show download button', () => {
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByRole('button', { name: /télécharger/i })).toBeInTheDocument();
    });

    it('should show clear selection button', () => {
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByLabelText(/effacer la sélection/i)).toBeInTheDocument();
    });

    it('should display selection icon', () => {
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText(/1 photo sélectionnée$/i).parentElement).toContainHTML('svg');
    });
  });

  describe('Clear Selection', () => {
    it('should call onClearSelection when clear button clicked', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const clearButton = screen.getByLabelText(/effacer la sélection/i);
      await user.click(clearButton);

      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });

    it('should not call onClearSelection when disabled', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      // Start download to disable buttons
      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      fireEvent.click(downloadButton);

      const clearButton = screen.getByLabelText(/effacer la sélection/i);
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Bulk Download', () => {
    it('should download selected items as ZIP', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1', 'media-2']);
      
      // Mock URL.createObjectURL and revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document.createElement for download link
      const mockLink = document.createElement('a');
      const clickSpy = vi.spyOn(mockLink, 'click');
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger \(2\)/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(clickSpy).toHaveBeenCalled();
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should show download progress', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1', 'media-2']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/téléchargement\.\.\./i)).toBeInTheDocument();
      });
    });

    it('should disable buttons during download', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(downloadButton).toBeDisabled();
      });

      const clearButton = screen.getByLabelText(/effacer la sélection/i);
      expect(clearButton).toBeDisabled();
    });

    it('should fetch images from URLs', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/photo1.jpg');
      });
    });

    it('should use correct filename format', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1']);
      
      const mockLink = document.createElement('a');
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockLink.download).toMatch(/reflets-de-bonheur-\d{4}-\d{2}-\d{2}-1-photos\.zip/);
      });
    });

    it('should handle download errors gracefully', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const selectedItems = new Set(['media-1']);
      
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Erreur lors de la création du fichier ZIP. Veuillez réessayer.');
      });

      alertSpy.mockRestore();
    });

    it('should clear selection after successful download', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1']);
      
      const mockLink = document.createElement('a');
      vi.spyOn(mockLink, 'click');
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockOnClearSelection).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Display', () => {
    it('should show progress bar during download', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1', 'media-2']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        const progressBar = screen.getByRole('button', { name: /télécharger/i }).parentElement?.querySelector('[class*="bg-burgundy-old"]');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should update progress percentage', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1', 'media-2', 'media-3']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/\d+%/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty selection', () => {
      const selectedItems = new Set<string>();
      
      const { container } = render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle items with missing author', async () => {
      const user = userEvent.setup();
      const itemsWithoutAuthor = [
        { ...mockAllItems[0], author: undefined },
      ];
      const selectedItems = new Set(['media-1']);
      
      const mockLink = document.createElement('a');
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={itemsWithoutAuthor as any}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      // Should not crash and should use fallback name
      await waitFor(() => {
        expect(mockLink.download).toMatch(/reflets-de-bonheur/);
      });
    });

    it('should handle video files', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-3']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/video1.mp4');
      });
    });

    it('should continue download if one file fails', async () => {
      const user = userEvent.setup();
      const selectedItems = new Set(['media-1', 'media-2']);
      
      // Mock fetch to fail for first item but succeed for second
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve({
          blob: () => Promise.resolve(new Blob(['image data'])),
        });
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      const downloadButton = screen.getByRole('button', { name: /télécharger/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const selectedItems = new Set(['media-1']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByLabelText(/effacer la sélection/i)).toBeInTheDocument();
    });

    it('should have descriptive button text', () => {
      const selectedItems = new Set(['media-1', 'media-2']);
      
      render(
        <BulkActions
          selectedItems={selectedItems}
          allItems={mockAllItems}
          onClearSelection={mockOnClearSelection}
        />
      );

      expect(screen.getByText(/télécharger \(2\)/i)).toBeInTheDocument();
    });
  });
});
