// src/store/textStore.ts
import { create } from 'zustand';
import { PDFRect } from '../utils/coordinateProjection';

interface TextStore {
  searchTerm: string;
  matchDivIndicesByPage: Record<number, number[]>; // indices into textDivs for that page
  pdfRectsByPage: Record<number, PDFRect[]>;       // PDF-space rectangles cached per page
  currentMatchIndex: number;                        // index in the page's list
  currentPage: number;                              // current page number
  setSearchTerm: (term: string) => void;
  setPageMatches: (page: number, divIndices: number[]) => void;
  setPdfRects: (page: number, rects: PDFRect[]) => void;
  setCurrentPage: (page: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
}

const useTextStore = create<TextStore>((set, get) => ({
  searchTerm: '',
  matchDivIndicesByPage: {},
  pdfRectsByPage: {},
  currentMatchIndex: -1,
  currentPage: 1,

  setSearchTerm: (term) => {
    // just set the term and reset position; TextLayer will compute indices
    const normalized = term.normalize('NFKC');
    set({ searchTerm: normalized, currentMatchIndex: -1 });
  },

  setPageMatches: (page, divIndices) => {
    const map = { ...get().matchDivIndicesByPage, [page]: divIndices };
    // Keep currentMatchIndex = -1 until user explicitly navigates with Next/Prev
    // This prevents auto-scroll while typing
    const list = map[page] ?? [];
    const currentIndex = get().currentMatchIndex;
    let newIndex = -1;
    
    if (list.length > 0 && currentIndex >= 0) {
      // Only preserve index if it's still valid, don't auto-set to 0
      if (currentIndex < list.length) {
        newIndex = currentIndex;
      }
    }
    
    set({
      matchDivIndicesByPage: map,
      currentMatchIndex: newIndex,
    });
  },

  setPdfRects: (page, rects) => {
    set({ pdfRectsByPage: { ...get().pdfRectsByPage, [page]: rects } });
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  nextMatch: () => {
    const { currentMatchIndex, matchDivIndicesByPage, currentPage } = get();
    const list = matchDivIndicesByPage[currentPage] ?? [];
    if (list.length === 0) return;
    
    const newIndex = currentMatchIndex < 0 ? 0 : (currentMatchIndex + 1) % list.length;
    set({ currentMatchIndex: newIndex });
    
    // Auto-scroll to the active match
    setTimeout(() => {
      const textLayerEl = document.querySelector(`[data-page="${currentPage}"] .textLayer`) as HTMLElement;
      if (textLayerEl) {
        const textDivs = Array.from(textLayerEl.children) as HTMLElement[];
        const activeDiv = textDivs[list[newIndex]];
        if (activeDiv) {
          activeDiv.scrollIntoView({ block: 'center', inline: 'center' });
        }
      }
    }, 0);
  },

  prevMatch: () => {
    const { currentMatchIndex, matchDivIndicesByPage, currentPage } = get();
    const list = matchDivIndicesByPage[currentPage] ?? [];
    if (list.length === 0) return;
    
    const newIndex = currentMatchIndex < 0 ? list.length - 1 : (currentMatchIndex - 1 + list.length) % list.length;
    set({ currentMatchIndex: newIndex });
    
    // Auto-scroll to the active match
    setTimeout(() => {
      const textLayerEl = document.querySelector(`[data-page="${currentPage}"] .textLayer`) as HTMLElement;
      if (textLayerEl) {
        const textDivs = Array.from(textLayerEl.children) as HTMLElement[];
        const activeDiv = textDivs[list[newIndex]];
        if (activeDiv) {
          activeDiv.scrollIntoView({ block: 'center', inline: 'center' });
        }
      }
    }, 0);
  },
}));

export default useTextStore;
