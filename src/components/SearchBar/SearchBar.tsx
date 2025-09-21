import React from 'react';
import useTextStore from '../../store/textStore';
import './SearchBar.css';

/**
 * A global search bar for PDF text.
 * Allows entering a search term and navigating between matches.
 */
const SearchBar: React.FC = () => {
  const { searchTerm, setSearchTerm, nextMatch, prevMatch, matchDivIndicesByPage, currentPage, currentMatchIndex } = useTextStore();

  const total = (matchDivIndicesByPage[currentPage] ?? []).length;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search text..."
        value={searchTerm}
        onChange={handleChange}
      />
      <button onClick={prevMatch} disabled={total === 0}>
        Previous
      </button>
      <span className="search-count">
        {total > 0
          ? `${currentMatchIndex + 1} of ${total}`
          : '0 of 0'}
      </span>
      <button onClick={nextMatch} disabled={total === 0}>
        Next
      </button>
    </div>
  );
};

export default SearchBar;
