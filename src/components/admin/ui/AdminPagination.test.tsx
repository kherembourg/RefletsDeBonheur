import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminPagination } from './AdminPagination';

describe('AdminPagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    itemsPerPage: 10,
    onPageChange: vi.fn(),
  };

  describe('rendering', () => {
    it('should not render when totalPages is 1', () => {
      const { container } = render(
        <AdminPagination {...defaultProps} totalPages={1} />
      );
      expect(container.querySelector('button')).toBeNull();
    });

    it('should render pagination controls when totalPages > 1', () => {
      render(<AdminPagination {...defaultProps} />);
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });

    it('should show item count when showItemCount is true', () => {
      render(<AdminPagination {...defaultProps} showItemCount />);
      expect(screen.getByText('1-10 sur 50')).toBeInTheDocument();
    });

    it('should not show item count when showItemCount is false', () => {
      render(<AdminPagination {...defaultProps} showItemCount={false} />);
      expect(screen.queryByText('1-10 sur 50')).not.toBeInTheDocument();
    });
  });

  describe('page numbers', () => {
    it('should show current page as active', () => {
      render(<AdminPagination {...defaultProps} currentPage={3} />);
      const activePage = screen.getByText('3');
      expect(activePage.className).toContain('bg-burgundy-old');
    });

    it('should show all pages when total is small', () => {
      render(<AdminPagination {...defaultProps} totalPages={3} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show ellipsis for large page counts', () => {
      render(<AdminPagination {...defaultProps} totalPages={10} currentPage={5} />);
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('navigation buttons', () => {
    it('should disable previous button on first page', () => {
      render(<AdminPagination {...defaultProps} currentPage={1} />);
      const prevButton = screen.getByLabelText('Page precedente');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(<AdminPagination {...defaultProps} currentPage={5} />);
      const nextButton = screen.getByLabelText('Page suivante');
      expect(nextButton).toBeDisabled();
    });

    it('should enable previous button when not on first page', () => {
      render(<AdminPagination {...defaultProps} currentPage={3} />);
      const prevButton = screen.getByLabelText('Page precedente');
      expect(prevButton).not.toBeDisabled();
    });

    it('should enable next button when not on last page', () => {
      render(<AdminPagination {...defaultProps} currentPage={3} />);
      const nextButton = screen.getByLabelText('Page suivante');
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('first/last buttons', () => {
    it('should show first/last buttons by default', () => {
      render(<AdminPagination {...defaultProps} />);
      expect(screen.getByLabelText('Premiere page')).toBeInTheDocument();
      expect(screen.getByLabelText('Derniere page')).toBeInTheDocument();
    });

    it('should hide first/last buttons when showFirstLast is false', () => {
      render(<AdminPagination {...defaultProps} showFirstLast={false} />);
      expect(screen.queryByLabelText('Premiere page')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Derniere page')).not.toBeInTheDocument();
    });

    it('should disable first button on first page', () => {
      render(<AdminPagination {...defaultProps} currentPage={1} />);
      expect(screen.getByLabelText('Premiere page')).toBeDisabled();
    });

    it('should disable last button on last page', () => {
      render(<AdminPagination {...defaultProps} currentPage={5} />);
      expect(screen.getByLabelText('Derniere page')).toBeDisabled();
    });
  });

  describe('onPageChange', () => {
    it('should call onPageChange when clicking a page number', () => {
      const onPageChange = vi.fn();
      render(<AdminPagination {...defaultProps} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByText('3'));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('should call onPageChange when clicking previous', () => {
      const onPageChange = vi.fn();
      render(
        <AdminPagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Page precedente'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when clicking next', () => {
      const onPageChange = vi.fn();
      render(
        <AdminPagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Page suivante'));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should call onPageChange when clicking first', () => {
      const onPageChange = vi.fn();
      render(
        <AdminPagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Premiere page'));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange when clicking last', () => {
      const onPageChange = vi.fn();
      render(
        <AdminPagination
          {...defaultProps}
          currentPage={3}
          onPageChange={onPageChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Derniere page'));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });
  });

  describe('item count calculation', () => {
    it('should show correct range for first page', () => {
      render(<AdminPagination {...defaultProps} currentPage={1} />);
      expect(screen.getByText('1-10 sur 50')).toBeInTheDocument();
    });

    it('should show correct range for middle page', () => {
      render(<AdminPagination {...defaultProps} currentPage={3} />);
      expect(screen.getByText('21-30 sur 50')).toBeInTheDocument();
    });

    it('should show correct range for last page', () => {
      render(<AdminPagination {...defaultProps} currentPage={5} />);
      expect(screen.getByText('41-50 sur 50')).toBeInTheDocument();
    });

    it('should handle partial last page', () => {
      render(
        <AdminPagination
          {...defaultProps}
          totalItems={45}
          currentPage={5}
        />
      );
      expect(screen.getByText('41-45 sur 45')).toBeInTheDocument();
    });
  });
});
