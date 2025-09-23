// Centralized store for PDF-space match rectangles and navigation state
// Replaces DIV-index based storage with MatchRect-based storage

import { MatchRect } from '../../types/viewport';

interface StoreState {
  matchRectsByPage: Record<number, MatchRect[]>;
  activeIndex: number;
  totalMatches: number;
  currentQuery: string;
}

class MatchStore {
  private state: StoreState = {
    matchRectsByPage: {},
    activeIndex: -1,
    totalMatches: 0,
    currentQuery: ''
  };

  private listeners: Array<(state: StoreState) => void> = [];

  /**
   * Set match rectangles for a specific page
   * This is the authoritative storage - only PDF-space coordinates
   */
  setMatchRects(page: number, rects: MatchRect[]): void {
    this.state.matchRectsByPage[page] = rects;
    this.updateTotalMatches();
    this.notifyListeners();
  }

  /**
   * Get match rectangles for a specific page
   */
  getMatchRects(page: number): MatchRect[] {
    return this.state.matchRectsByPage[page] || [];
  }

  /**
   * Get all match rectangles across all pages
   */
  getAllMatchRects(): MatchRect[] {
    const allRects: MatchRect[] = [];
    const pages = Object.keys(this.state.matchRectsByPage)
      .map(Number)
      .sort((a, b) => a - b);
    
    for (const page of pages) {
      allRects.push(...this.state.matchRectsByPage[page]);
    }
    
    return allRects;
  }

  /**
   * Set the active match index (global across all pages)
   */
  setActiveIndex(index: number): void {
    const totalMatches = this.getTotalMatches();
    
    if (totalMatches === 0) {
      this.state.activeIndex = -1;
    } else {
      // Clamp index to valid range
      this.state.activeIndex = Math.max(0, Math.min(index, totalMatches - 1));
    }
    
    this.notifyListeners();
  }

  /**
   * Get the current active match index
   */
  getActiveIndex(): number {
    return this.state.activeIndex;
  }

  /**
   * Get the active match rectangle
   */
  getActiveMatch(): MatchRect | null {
    const allRects = this.getAllMatchRects();
    const activeIndex = this.getActiveIndex();
    
    if (activeIndex >= 0 && activeIndex < allRects.length) {
      return allRects[activeIndex];
    }
    
    return null;
  }

  /**
   * Navigate to the next match
   */
  nextMatch(): void {
    const totalMatches = this.getTotalMatches();
    if (totalMatches === 0) return;
    
    const currentIndex = this.getActiveIndex();
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % totalMatches;
    this.setActiveIndex(nextIndex);
  }

  /**
   * Navigate to the previous match
   */
  prevMatch(): void {
    const totalMatches = this.getTotalMatches();
    if (totalMatches === 0) return;
    
    const currentIndex = this.getActiveIndex();
    const prevIndex = currentIndex < 0 
      ? totalMatches - 1 
      : (currentIndex - 1 + totalMatches) % totalMatches;
    this.setActiveIndex(prevIndex);
  }

  /**
   * Get total number of matches across all pages
   */
  getTotalMatches(): number {
    return this.state.totalMatches;
  }

  /**
   * Get matches for a specific page with their local indices
   */
  getPageMatches(page: number): Array<{ rect: MatchRect; localIndex: number; globalIndex: number }> {
    const pageRects = this.getMatchRects(page);
    const result: Array<{ rect: MatchRect; localIndex: number; globalIndex: number }> = [];
    
    let globalIndex = 0;
    const pages = Object.keys(this.state.matchRectsByPage)
      .map(Number)
      .sort((a, b) => a - b);
    
    for (const p of pages) {
      const rects = this.state.matchRectsByPage[p];
      if (p === page) {
        // This is our target page
        rects.forEach((rect, localIndex) => {
          result.push({ rect, localIndex, globalIndex: globalIndex + localIndex });
        });
        break;
      } else {
        // Count matches from previous pages
        globalIndex += rects.length;
      }
    }
    
    return result;
  }

  /**
   * Clear all matches (e.g., when starting a new search)
   */
  clearAllMatches(): void {
    this.state.matchRectsByPage = {};
    this.state.activeIndex = -1;
    this.state.totalMatches = 0;
    this.notifyListeners();
  }

  /**
   * Clear matches for a specific page
   */
  clearPageMatches(page: number): void {
    delete this.state.matchRectsByPage[page];
    this.updateTotalMatches();
    
    // Reset active index if it's no longer valid
    if (this.state.activeIndex >= this.state.totalMatches) {
      this.state.activeIndex = -1;
    }
    
    this.notifyListeners();
  }

  /**
   * Set the current search query
   */
  setQuery(query: string): void {
    if (this.state.currentQuery !== query) {
      this.state.currentQuery = query;
      this.clearAllMatches(); // Clear matches when query changes
    }
  }

  /**
   * Get the current search query
   */
  getQuery(): string {
    return this.state.currentQuery;
  }

  /**
   * Subscribe to store changes
   */
  subscribe(listener: (state: StoreState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current state snapshot
   */
  getState(): Readonly<StoreState> {
    return { ...this.state };
  }

  /**
   * Update total matches count
   */
  private updateTotalMatches(): void {
    this.state.totalMatches = Object.values(this.state.matchRectsByPage)
      .reduce((total, rects) => total + rects.length, 0);
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Store listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const matchStore = new MatchStore();

// Export types for consumers
export type { StoreState };
