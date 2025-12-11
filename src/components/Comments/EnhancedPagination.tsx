import React, { useState, useCallback, useMemo } from 'react';
import { formatCount } from '../../utils/formatCount';
import './Comments.scss';

interface EnhancedPaginationProps {
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
    startIndex: number;
    endIndex: number;
    remainingItems: number;
  };
  onPageChange: (page: number) => void;
  loading?: boolean;
  showPageSizeSelector?: boolean;
  showJumpToPage?: boolean;
  showInfo?: boolean;
  maxVisiblePages?: number;
  pageSizeOptions?: number[];
  className?: string;
}

const EnhancedPagination: React.FC<EnhancedPaginationProps> = ({
  pagination,
  onPageChange,
  loading = false,
  showPageSizeSelector = true,
  showJumpToPage = true,
  showInfo = true,
  maxVisiblePages = 7,
  pageSizeOptions = [5, 10, 20, 50],
  className = ''
}) => {
  const [jumpToPageValue, setJumpToPageValue] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const {
    currentPage,
    totalPages,
    total,
    hasNextPage,
    hasPrevPage,
    isFirstPage,
    isLastPage,
    startIndex,
    endIndex
  } = pagination;

  // Generate page numbers with ellipsis for large page counts
  const pageNumbers = useMemo(() => {
    const pages = [];
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);
      
      // Calculate range around current page
      const halfVisible = Math.floor((maxVisiblePages - 3) / 2);
      let start = Math.max(2, currentPage - halfVisible);
      let end = Math.min(totalPages - 1, currentPage + halfVisible);
      
      // Adjust range if we're near the edges
      if (currentPage <= halfVisible + 1) {
        end = maxVisiblePages - 2;
      } else if (currentPage >= totalPages - halfVisible) {
        start = totalPages - maxVisiblePages + 3;
      }
      
      // Add ellipsis if needed
      if (start > 2) {
        pages.push('...');
      }
      
      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages, maxVisiblePages]);

  // Handle page navigation
  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages || loading) return;
    onPageChange(page);
  }, [onPageChange, totalPages, loading]);

  // Handle jump to page
  const handleJumpToPage = useCallback(() => {
    const page = parseInt(jumpToPageValue);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page);
      setJumpToPageValue('');
    }
  }, [jumpToPageValue, totalPages, handlePageChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  }, [handleJumpToPage]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    // This would typically trigger a refetch with new page size
    // For now, we'll just update local state
  }, []);

  // Generate accessible labels
  const getAriaLabel = (action: string, page?: number) => {
    switch (action) {
      case 'first':
        return 'Go to first page';
      case 'prev':
        return 'Go to previous page';
      case 'next':
        return 'Go to next page';
      case 'last':
        return 'Go to last page';
      case 'page':
        return `Go to page ${page}`;
      default:
        return '';
    }
  };

  if (totalPages <= 1 && !showInfo) {
    return null;
  }

  return (
    <div className={`enhanced-pagination ${className}`}>
      {/* Pagination Info */}
      {showInfo && (
        <div className="pagination-info">
          <span className="pagination-text">
            Showing {startIndex}-{endIndex} of {formatCount(total)} items
          </span>
          {totalPages > 1 && (
            <span className="pagination-pages">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Page Size Selector */}
      {showPageSizeSelector && (
        <div className="page-size-selector">
          <label htmlFor="page-size" className="page-size-label">
            Items per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            className="page-size-select"
            disabled={loading}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav 
          className="pagination-controls" 
          role="navigation" 
          aria-label="Pagination navigation"
        >
          <div className="pagination-buttons">
            {/* First Page */}
            <button
              onClick={() => handlePageChange(1)}
              className="pagination-btn pagination-btn-first"
              disabled={isFirstPage || loading}
              aria-label={getAriaLabel('first')}
              title="First page"
            >
              ««
            </button>

            {/* Previous Page */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              className="pagination-btn pagination-btn-prev"
              disabled={!hasPrevPage || loading}
              aria-label={getAriaLabel('prev')}
              title="Previous page"
            >
              ‹
            </button>

            {/* Page Numbers */}
            <div className="pagination-numbers">
              {pageNumbers.map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={`pagination-btn pagination-number ${
                      page === currentPage ? 'active' : ''
                    }`}
                    disabled={loading}
                    aria-label={getAriaLabel('page', page as number)}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>

            {/* Next Page */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              className="pagination-btn pagination-btn-next"
              disabled={!hasNextPage || loading}
              aria-label={getAriaLabel('next')}
              title="Next page"
            >
              ›
            </button>

            {/* Last Page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="pagination-btn pagination-btn-last"
              disabled={isLastPage || loading}
              aria-label={getAriaLabel('last')}
              title="Last page"
            >
              »»
            </button>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="pagination-loading">
              <span className="pagination-spinner"></span>
              Loading...
            </div>
          )}
        </nav>
      )}

      {/* Jump to Page */}
      {showJumpToPage && totalPages > 5 && (
        <div className="jump-to-page">
          <label htmlFor="jump-page" className="jump-label">
            Go to page:
          </label>
          <input
            id="jump-page"
            type="number"
            min="1"
            max={totalPages}
            value={jumpToPageValue}
            onChange={(e) => setJumpToPageValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="jump-input"
            placeholder={currentPage.toString()}
            disabled={loading}
          />
          <button
            onClick={handleJumpToPage}
            className="jump-btn"
            disabled={loading || !jumpToPageValue}
          >
            Go
          </button>
        </div>
      )}

      {/* Additional Info */}
      {showInfo && pagination.remainingItems > 0 && (
        <div className="pagination-remaining">
          <span className="remaining-text">
            {formatCount(pagination.remainingItems)} more items
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedPagination;
