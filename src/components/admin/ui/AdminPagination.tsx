import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../../styles/admin-theme';

export interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showItemCount?: boolean;
  siblingCount?: number;
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showFirstLast = true,
  showItemCount = true,
  siblingCount = 1,
}: AdminPaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);

    const showLeftEllipsis = leftSibling > 2;
    const showRightEllipsis = rightSibling < totalPages - 1;

    if (totalPages <= 5 + siblingCount * 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (showLeftEllipsis) {
        pages.push('ellipsis');
      } else if (leftSibling > 1) {
        for (let i = 2; i < leftSibling; i++) {
          pages.push(i);
        }
      }

      // Show siblings and current page
      for (let i = leftSibling; i <= rightSibling; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (showRightEllipsis) {
        pages.push('ellipsis');
      } else if (rightSibling < totalPages) {
        for (let i = rightSibling + 1; i < totalPages; i++) {
          pages.push(i);
        }
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const buttonBase =
    'px-3 py-2 text-sm rounded-md transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed';
  const buttonDefault = 'text-charcoal hover:bg-charcoal/5';
  const buttonActive = 'bg-burgundy-old text-white';

  if (totalPages <= 1) {
    return showItemCount ? (
      <div className="text-sm text-charcoal/60">
        {totalItems} {totalItems === 1 ? 'resultat' : 'resultats'}
      </div>
    ) : null;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {showItemCount && (
        <p className="text-sm text-charcoal/60">
          {startItem}-{endItem} sur {totalItems}
        </p>
      )}

      <div className="flex items-center gap-1">
        {/* First page */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className={cn(buttonBase, buttonDefault)}
            aria-label="Premiere page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}

        {/* Previous page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(buttonBase, buttonDefault)}
          aria-label="Page precedente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-charcoal/40">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(buttonBase, page === currentPage ? buttonActive : buttonDefault)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}

        {/* Next page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(buttonBase, buttonDefault)}
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={cn(buttonBase, buttonDefault)}
            aria-label="Derniere page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
