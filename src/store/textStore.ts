// Zustand store for PDF text extraction and search
import create from 'zustand';
import PDFService from '../services/pdfService';
import { TextItem } from '../types/text';

interface TextStore {
  textCache: Record<number, TextItem[]>;
  currentPage: number | null;
  searchTerm: string;
  matches: TextItem[];
  currentMatchIndex: number;
  loadText: (pdfDoc: any, pageNum: number) => Promise<void>;
  setSearchTerm: (term: string) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

const useTextStore = create<TextStore>((set: (state: Partial<TextStore> | ((state: TextStore) => Partial<TextStore>)) => void, get: () => TextStore) => ({
  textCache: {},
  currentPage: null,
  searchTerm: '',
  matches: [],
  currentMatchIndex: -1,

  // Load and cache text for a given page
  loadText: async (pdfDoc: any, pageNum: number) => {
    const items: TextItem[] = await PDFService.extractText(pdfDoc, pageNum);
    set((state: TextStore) => {
      const updatedCache = { ...state.textCache, [pageNum]: items };
      const term = state.searchTerm;
      const matches = term ? items.filter((item: TextItem) => item.str.includes(term)) : [];
      return {
        textCache: updatedCache,
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
      const items = page != null ? state.textCache[page] || [] : [];
      const matches = term ? items.filter((item: TextItem) => item.str.includes(term)) : [];
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
