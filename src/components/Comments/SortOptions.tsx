import React from 'react';
import './Comments.scss';

type SortOption = 'newest' | 'mostLiked' | 'mostDisliked';

interface SortOptionsProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const SortOptions: React.FC<SortOptionsProps> = ({ currentSort, onSortChange }) => {
  const sortOptions = [
    { value: 'newest', label: 'Newest', icon: '🕐' },
    { value: 'mostLiked', label: 'Most Liked', icon: '👍' },
    { value: 'mostDisliked', label: 'Most Disliked', icon: '👎' },
  ];

  return (
    <div className="sort-options">
      <label htmlFor="sort-select" className="sort-label">
        Sort by:
      </label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="sort-select"
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.icon} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SortOptions;
