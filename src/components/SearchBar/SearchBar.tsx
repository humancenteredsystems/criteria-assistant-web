import React, { useState, useEffect } from 'react';
import { searchController } from '../../modules';
import './SearchBar.css';

/**
 * Clean SearchBar component using the refactored modules
 * Uses searchController for all search operations and navigation
 */
const SearchBar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [stats, setStats] = useState({ 
    totalMatches: 0, 
    activeIndex: -1, 
    query: '' 
  });

  // Subscribe to search controller state changes
  useEffect(() => {
    const unsubscribe = searchController.subscribe((newStats) => {
      setStats(newStats);
    });
    return unsubscribe;
  }, []);

  // Debounce search term updates (150ms)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue !== stats.query) {
        console.log(`SearchBar: Starting search for "${inputValue}"`);
        searchController.startNewSearch(inputValue);
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [inputValue, stats.query]);

  // Sync input value when query changes externally
  useEffect(() => {
    setInputValue(stats.query);
  }, [stats.query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`SearchBar: Input changed to "${e.target.value}"`);
    setInputValue(e.target.value);
  };

  const handlePrevious = () => {
    console.log('SearchBar: Previous match');
    searchController.prevMatch();
  };

  const handleNext = () => {
    console.log('SearchBar: Next match');
    searchController.nextMatch();
  };

  // Debug logging for search state
  console.log(`SearchBar: Query: "${stats.query}", Total: ${stats.totalMatches}, ActiveIndex: ${stats.activeIndex}`);

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search text..."
        value={inputValue}
        onChange={handleChange}
      />
      <button onClick={handlePrevious} disabled={stats.totalMatches === 0}>
        Previous
      </button>
      <span className="search-count">
        {stats.totalMatches > 0
          ? `${stats.activeIndex + 1} of ${stats.totalMatches}`
          : '0 of 0'}
      </span>
      <button onClick={handleNext} disabled={stats.totalMatches === 0}>
        Next
      </button>
    </div>
  );
};

export default SearchBar;
