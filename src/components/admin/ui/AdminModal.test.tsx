import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminModal } from './AdminModal';

describe('AdminModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  describe('visibility', () => {
    it('should render when isOpen is true', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <p>Modal content</p>
        </AdminModal>
      );
      
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <AdminModal isOpen={false} onClose={mockOnClose} title="Hidden">
          <p>Content</p>
        </AdminModal>
      );
      
      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    it('should return null when closed', () => {
      const { container } = render(
        <AdminModal isOpen={false} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('title and content', () => {
    it('should render with title', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="My Modal">
          <p>Content</p>
        </AdminModal>
      );
      
      expect(screen.getByText('My Modal')).toBeInTheDocument();
    });

    it('should render without title', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content only</p>
        </AdminModal>
      );
      
      expect(screen.getByText('Content only')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <div data-testid="modal-content">Test Content</div>
        </AdminModal>
      );
      
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('should show close button by default', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="Modal">
          <p>Content</p>
        </AdminModal>
      );
      
      expect(screen.getByLabelText('Fermer')).toBeInTheDocument();
    });

    it('should hide close button when showCloseButton is false', () => {
      render(
        <AdminModal 
          isOpen={true} 
          onClose={mockOnClose} 
          title="Modal"
          showCloseButton={false}
        >
          <p>Content</p>
        </AdminModal>
      );
      
      expect(screen.queryByLabelText('Fermer')).not.toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="Modal">
          <p>Content</p>
        </AdminModal>
      );
      
      await user.click(screen.getByLabelText('Fermer'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('backdrop interaction', () => {

    it('should not close on backdrop click when closeOnOverlayClick is false', () => {
      render(
        <AdminModal 
          isOpen={true} 
          onClose={mockOnClose} 
          title="Modal"
          closeOnOverlayClick={false}
        >
          <p>Content</p>
        </AdminModal>
      );
      
      const dialog = screen.getByRole('dialog');
      const backdrop = dialog.parentElement;
      
      if (backdrop) {
        fireEvent.click(backdrop, { target: backdrop, currentTarget: backdrop });
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });

    it('should not close when clicking inside modal content', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="Modal">
          <p>Content</p>
        </AdminModal>
      );
      
      fireEvent.click(screen.getByText('Content'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interaction', () => {
    it('should close on Escape key by default', async () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="Modal">
          <p>Content</p>
        </AdminModal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not close on Escape when closeOnEscape is false', async () => {
      render(
        <AdminModal 
          isOpen={true} 
          onClose={mockOnClose} 
          title="Modal"
          closeOnEscape={false}
        >
          <p>Content</p>
        </AdminModal>
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      }, { timeout: 500 });
    });

    it('should not close on other keys', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="Modal">
          <p>Content</p>
        </AdminModal>
      );
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('footer', () => {
    it('should render footer when provided', () => {
      render(
        <AdminModal 
          isOpen={true} 
          onClose={mockOnClose}
          footer={
            <button>Save</button>
          }
        >
          <p>Content</p>
        </AdminModal>
      );
      
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should not render footer when not provided', () => {
      const { container } = render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      const footer = container.querySelector('.border-t');
      expect(footer).toBeNull();
    });
  });

  describe('size variants', () => {
    it('should apply small size', () => {
      const { container } = render(
        <AdminModal isOpen={true} onClose={mockOnClose} size="sm">
          <p>Small</p>
        </AdminModal>
      );
      
      const modal = container.querySelector('.max-w-sm');
      expect(modal).toBeInTheDocument();
    });

    it('should apply medium size by default', () => {
      const { container } = render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Medium</p>
        </AdminModal>
      );
      
      const modal = container.querySelector('.max-w-lg');
      expect(modal).toBeInTheDocument();
    });

    it('should apply large size', () => {
      const { container } = render(
        <AdminModal isOpen={true} onClose={mockOnClose} size="lg">
          <p>Large</p>
        </AdminModal>
      );
      
      const modal = container.querySelector('.max-w-2xl');
      expect(modal).toBeInTheDocument();
    });

    it('should apply xl size', () => {
      const { container } = render(
        <AdminModal isOpen={true} onClose={mockOnClose} size="xl">
          <p>XL</p>
        </AdminModal>
      );
      
      const modal = container.querySelector('.max-w-4xl');
      expect(modal).toBeInTheDocument();
    });

    it('should apply full size', () => {
      const { container } = render(
        <AdminModal isOpen={true} onClose={mockOnClose} size="full">
          <p>Full</p>
        </AdminModal>
      );
      
      const modal = container.querySelector('[class*="max-w-"]');
      expect(modal?.className).toContain('max-w-[calc(100%-2rem)]');
    });
  });

  describe('body overflow management', () => {
    it('should hide body overflow when modal opens', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body overflow when modal closes', () => {
      const { rerender } = render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
      
      rerender(
        <AdminModal isOpen={false} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      expect(document.body.style.overflow).toBe('');
    });

    it('should restore body overflow on unmount', () => {
      const { unmount } = render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
      
      unmount();
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('accessibility', () => {
    it('should have dialog role', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should link title with aria-labelledby', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose} title="My Modal">
          <p>Content</p>
        </AdminModal>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(screen.getByText('My Modal')).toHaveAttribute('id', 'modal-title');
    });

    it('should not have aria-labelledby when no title', () => {
      render(
        <AdminModal isOpen={true} onClose={mockOnClose}>
          <p>Content</p>
        </AdminModal>
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });
  });
});
