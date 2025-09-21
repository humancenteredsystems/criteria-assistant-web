// src/store/textStore.ts
import { create } from 'zustand';

interface TextStore {
  searchTerm: string;
  matchDivIndicesByPage: Record<number, number[]>; // indices into textDivs for that page
  currentMatchIndex: number;                        // index in the page's list
  setSearchTerm: (term: string) => void;
  setPageMatches: (page: number, divIndices: number[]) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

const useTextStore = create<TextStore>((set, get) => ({
  searchTerm: '',
  matchDivIndicesByPage: {},
  currentMatchIndex: -1,

  setSearchTerm: (term) => {
    // just set the term and reset position; TextLayer will compute indices
    const normalized = term.normalize('NFKC');
    set({ searchTerm: normalized, currentMatchIndex: 0 });
  },

  setPageMatches: (page, divIndices) => {
    const map = { ...get().matchDivIndicesByPage, [page]: divIndices };
    // clamp active index to available matches for the current page
    const list = map[page] ?? [];
    set({
      matchDivIndicesByPage: map,
      currentMatchIndex: list.length > 0 ? Math.min(get().currentMatchIndex, list.length - 1) : -1,
    });
  },

  nextMatch: () => {
    const { currentMatchIndex, matchDivIndicesByPage } = get();
    // caller (TextLayer) ensures current page before invoking navigation UI
    const page = (window as any).__currentPdfPage as number || 1;
    const list = matchDivIndicesByPage[page] ?? [];
    if (list.length === 0) return;
    set({ currentMatchIndex: (currentMatchIndex + 1) % list.length });
  },

  prevMatch: () => {
    const { currentMatchIndex, matchDivIndicesByPage } = get();
    const page = (window as any).__currentPdfPage as number || 1;
    const list = matchDivIndicesByPage[page] ?? [];
    if (list.length === 0) return;
    set({ currentMatchIndex: (currentMatchIndex - 1 + list.length) % list.length });
  },
}));

export default useTextStore;
