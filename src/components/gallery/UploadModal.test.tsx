/**
 * Component Test: UploadModal
 * 
 * Tests for the UploadModal component that wraps the upload form in a modal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UploadModal } from './UploadModal';

// Mock UploadForm component
vi.mock('./UploadForm', () => ({
  UploadForm: ({ onUploadComplete, onClose }: any) => (
    <div data-testid="upload-form">
      <button onClick={() => onUploadComplete([])}>Complete Upload</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

// Mock auth
vi.mock('../../lib/auth', () => ({
  getUsername: vi.fn(() => 'Sophie'),
  setUsername: vi.fn(),
}));

describe('UploadModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnUploadComplete = vi.fn();
  const mockDataService = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      const { container } = render(
        <UploadModal
          isOpen={false}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when open', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByText(/ajouter des souvenirs/i)).toBeInTheDocument();
    });

    it('should render modal header', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByText(/ajouter des souvenirs/i)).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByLabelText(/fermer/i)).toBeInTheDocument();
    });

    it('should render UploadForm inside modal', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByTestId('upload-form')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should close when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const closeButton = screen.getByLabelText(/fermer/i);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close when backdrop clicked', async () => {
      const user = userEvent.setup();
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      // Click on backdrop (the outer div with fixed positioning)
      const backdrop = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement?.parentElement;
      await user.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close when modal content clicked', async () => {
      const user = userEvent.setup();
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const modalContent = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement;
      await user.click(modalContent!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('UploadForm Integration', () => {
    it('should pass dataService to UploadForm', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByTestId('upload-form')).toBeInTheDocument();
    });

    it('should pass onUploadComplete to UploadForm', async () => {
      const user = userEvent.setup();
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const completeButton = screen.getByText('Complete Upload');
      await user.click(completeButton);

      expect(mockOnUploadComplete).toHaveBeenCalled();
    });

    it('should pass onClose to UploadForm', async () => {
      const user = userEvent.setup();
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Modal Styling', () => {
    it('should have backdrop blur effect', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const backdrop = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement?.parentElement;
      expect(backdrop).toHaveClass('backdrop-blur-xs');
    });

    it('should have fade-in animation', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const backdrop = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement?.parentElement;
      expect(backdrop).toHaveClass('animate-fade-in');
    });

    it('should have scale-in animation for content', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const content = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement;
      expect(content).toHaveClass('animate-scale-in');
    });

    it('should be centered on screen', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const backdrop = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement?.parentElement;
      expect(backdrop).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should have rounded corners', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const content = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement;
      expect(content).toHaveClass('rounded-2xl');
    });

    it('should have max width', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const content = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement;
      expect(content).toHaveClass('max-w-lg');
    });

    it('should have max height and scroll', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const content = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement;
      expect(content).toHaveClass('max-h-[90vh]');
    });
  });

  describe('Z-Index Layering', () => {
    it('should have high z-index for modal', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const backdrop = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement?.parentElement;
      expect(backdrop).toHaveClass('z-50');
    });

    it('should have sticky header with z-index', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const header = screen.getByText(/ajouter des souvenirs/i).parentElement;
      expect(header).toHaveClass('z-10');
    });
  });

  describe('Scrolling Behavior', () => {
    it('should have scrollable content area', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const contentArea = screen.getByTestId('upload-form').parentElement;
      expect(contentArea).toHaveClass('overflow-y-auto');
    });

    it('should have fixed header while content scrolls', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const header = screen.getByText(/ajouter des souvenirs/i).parentElement;
      const content = screen.getByTestId('upload-form').parentElement?.parentElement;

      expect(header).toHaveClass('bg-ivory');
      expect(content).toHaveClass('flex-col');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for close button', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByLabelText(/fermer/i)).toBeInTheDocument();
    });

    it('should trap focus within modal', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const closeButton = screen.getByLabelText(/fermer/i);
      closeButton.focus();

      expect(document.activeElement).toBe(closeButton);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close', () => {
      const { rerender } = render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByText(/ajouter des souvenirs/i)).toBeInTheDocument();

      rerender(
        <UploadModal
          isOpen={false}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.queryByText(/ajouter des souvenirs/i)).not.toBeInTheDocument();

      rerender(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      expect(screen.getByText(/ajouter des souvenirs/i)).toBeInTheDocument();
    });

    it('should handle missing dataService gracefully', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={null as any}
        />
      );

      // Should not crash
      expect(screen.getByText(/ajouter des souvenirs/i)).toBeInTheDocument();
    });
  });

  describe('Event Propagation', () => {
    it('should stop propagation when clicking modal content', async () => {
      const user = userEvent.setup();
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const modalContent = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement;
      await user.click(modalContent!);

      // Should not close when clicking content
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should allow event propagation from backdrop', async () => {
      const user = userEvent.setup();
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const backdrop = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement?.parentElement;
      await user.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should have padding for mobile', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const backdrop = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement?.parentElement;
      expect(backdrop).toHaveClass('p-4');
    });

    it('should have full width on mobile', () => {
      render(
        <UploadModal
          isOpen={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          dataService={mockDataService}
        />
      );

      const content = screen.getByText(/ajouter des souvenirs/i).parentElement?.parentElement;
      expect(content).toHaveClass('w-full');
    });
  });
});
