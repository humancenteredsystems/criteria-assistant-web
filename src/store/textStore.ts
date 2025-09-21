// Zustand store for DOM-based PDF text search
import { create } from 'zustand';

interface TextStore {
  textDivsByPage: Record<number, HTMLElement[]>;
  currentPage: number | null;
  searchTerm: string;
  matches: HTMLElement[];
  currentMatchIndex: number;
  setTextDivs: (pageNum: number, divs: HTMLElement[]) => void;
  setSearchTerm: (term: string) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

const useTextStore = create<TextStore>((set: (state: Partial<TextStore> | ((state: TextStore) => Partial<TextStore>)) => void, get: () => TextStore) => ({
  textDivsByPage: {},
  currentPage: null,
  searchTerm: '',
  matches: [],
  currentMatchIndex: -1,

  // Store DOM elements for a given page
  setTextDivs: (pageNum: number, divs: HTMLElement[]) => {
    set((state: TextStore) => {
      const updatedDivs = { ...state.textDivsByPage, [pageNum]: divs };
      const term = state.searchTerm;
      
      // Search in current page's DOM elements
      const matches = term ? divs.filter((div: HTMLElement) => {
        const text = div.textContent || '';
        return text.toLowerCase().includes(term.toLowerCase());
      }) : [];
      
      return {
        textDivsByPage: updatedDivs,
        currentPage: pageNum,
        matches,
        currentMatchIndex: matches.length > 0 ? 0 : -1,
      };
    });
  },

  // Update search term and recompute matches on current page
  setSearchTerm: (term: string) => {
    set((state: TextStore) => {
      const page = state.currentPage;
      const divs = page != null ? state.textDivsByPage[page] || [] : [];
      
      const matches = term ? divs.filter((div: HTMLElement) => {
        const text = div.textContent || '';
        return text.toLowerCase().includes(term.toLowerCase());
      }) : [];
      
      return {
        searchTerm: term,
        matches,
        currentMatchIndex: matches.length > 0 ? 0 : -1,
      };
    });
  },

  // Go to next match
  nextMatch: () => {
    set((state: TextStore) => {
      const count = state.matches.length;
      if (count === 0) return {};
      const next = (state.currentMatchIndex + 1) % count;
      return { currentMatchIndex: next };
    });
  },

  // Go to previous match
  prevMatch: () => {
    set((state: TextStore) => {
      const count = state.matches.length;
      if (count === 0) return {};
      const prev = (state.currentMatchIndex - 1 + count) % count;
      return { currentMatchIndex: prev };
    });
  },
}));

export default useTextStore;
