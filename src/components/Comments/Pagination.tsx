import React from 'react';
import './Comments.scss';

interface PaginationProps {
  pagination: {
    currentPage: number;
    totalPages: number;
    totalComments: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
          disabled={i === currentPage}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      <button
        onClick={() => onPageChange(1)}
        className="pagination-btn"
        disabled={currentPage === 1}
        title="First page"
      >
        «
      </button>

      <button
        onClick={() => onPageChange(currentPage - 1)}
        className="pagination-btn"
        disabled={!hasPrevPage}
        title="Previous page"
      >
        ‹
      </button>

      {renderPageNumbers()}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        className="pagination-btn"
        disabled={!hasNextPage}
        title="Next page"
      >
        ›
      </button>

      <button
        onClick={() => onPageChange(totalPages)}
        className="pagination-btn"
        disabled={currentPage === totalPages}
        title="Last page"
      >
        »
      </button>
    </div>
  );
};

export default Pagination;
