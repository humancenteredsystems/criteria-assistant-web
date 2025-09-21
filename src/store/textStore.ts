// src/store/textStore.ts
import { create } from 'zustand';

interface TextStore {
  searchTerm: string;
  matchDivIndicesByPage: Record<number, number[]>; // indices into textDivs for that page
  currentMatchIndex: number;                        // index in the page's list
  currentPage: number;                              // current page number
  setSearchTerm: (term: string) => void;
  setPageMatches: (page: number, divIndices: number[]) => void;
  setCurrentPage: (page: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

const useTextStore = create<TextStore>((set, get) => ({
  searchTerm: '',
  matchDivIndicesByPage: {},
  currentMatchIndex: -1,
  currentPage: 1,

  setSearchTerm: (term) => {
    // just set the term and reset position; TextLayer will compute indices
    const normalized = term.normalize('NFKC');
    set({ searchTerm: normalized, currentMatchIndex: -1 });
  },

  setPageMatches: (page, divIndices) => {
    const map = { ...get().matchDivIndicesByPage, [page]: divIndices };
    // set active index to first match if matches exist, otherwise -1
    const list = map[page] ?? [];
    const currentIndex = get().currentMatchIndex;
    let newIndex = -1;
    
    if (list.length > 0) {
      // If we had a valid index before, try to keep it within bounds
      if (currentIndex >= 0 && currentIndex < list.length) {
        newIndex = currentIndex;
      } else {
        // Otherwise, start at first match
        newIndex = 0;
      }
    }
    
    set({
      matchDivIndicesByPage: map,
      currentMatchIndex: newIndex,
    });
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  nextMatch: () => {
    const { currentMatchIndex, matchDivIndicesByPage, currentPage } = get();
    const list = matchDivIndicesByPage[currentPage] ?? [];
    if (list.length === 0) return;
    set({ currentMatchIndex: (currentMatchIndex + 1) % list.length });
  },

  prevMatch: () => {
    const { currentMatchIndex, matchDivIndicesByPage, currentPage } = get();
    const list = matchDivIndicesByPage[currentPage] ?? [];
    if (list.length === 0) return;
    set({ currentMatchIndex: (currentMatchIndex - 1 + list.length) % list.length });
  },
}));

export default useTextStore;
