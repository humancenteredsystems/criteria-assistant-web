import React, { useState, useEffect } from 'react';
import useTextStore from '../../store/textStore';
import './SearchBar.css';

/**
 * A global search bar for PDF text.
 * Allows entering a search term and navigating between matches.
 */
const SearchBar: React.FC = () => {
  const { searchTerm, setSearchTerm, nextMatch, prevMatch, matchDivIndicesByPage, currentPage, currentMatchIndex } = useTextStore();
  const [inputValue, setInputValue] = useState(searchTerm);

  const total = (matchDivIndicesByPage[currentPage] ?? []).length;

  // Debounce search term updates (150ms)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue !== searchTerm) {
        console.log(`SearchBar: Debounced search term update to "${inputValue}"`);
        setSearchTerm(inputValue);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [inputValue, searchTerm, setSearchTerm]);

  // Sync input value when search term changes externally
  useEffect(() => {
    setInputValue(searchTerm);
  }, [searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`SearchBar: Input changed to "${e.target.value}"`);
    setInputValue(e.target.value);
  };

  // Debug logging for store state
  console.log(`SearchBar: Page ${currentPage}, Term: "${searchTerm}", Total: ${total}, CurrentIndex: ${currentMatchIndex}`);

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search text..."
        value={inputValue}
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
