// Main controller that coordinates search, navigation, and rendering
// Orchestrates the complete pipeline from query to highlights

import { Viewport, MatchRect, MatchSpan } from '../../types/viewport';
import { tokenize } from '../tokenizer/tokenizer';
import { findMatches } from '../matcher/matcher';
import { measureSubstrings } from '../geometry/geometry';
import { cssToPdf } from '../projector/projector';
import { matchStore } from '../store/store';
import { paintHighlights, updateLayerDimensions, getMatchScrollRect } from '../renderer/renderer';

interface PageProcessingState {
  isProcessing: boolean;
  isProcessed: boolean;
  lastQuery: string;
}

class SearchController {
  private pageStates: Map<number, PageProcessingState> = new Map();
  private globalMatchOrder = 0;

  /**
   * Process a search query for a specific page
   * This is the main pipeline: tokenize → match → measure → cache → render
   */
  async processPageSearch(
    page: number,
    query: string,
    textElement: HTMLElement,
    viewport: Viewport,
    highlightLayer: HTMLElement
  ): Promise<void> {
    if (!query.trim()) {
      this.clearPageResults(page, highlightLayer);
      return;
    }

    // Check if we're already processing this page
    const pageState = this.getPageState(page);
    if (pageState.isProcessing) {
      return; // Already processing
    }

    // Check if we already processed this query for this page
    if (pageState.isProcessed && pageState.lastQuery === query) {
      // Just re-render with current viewport
      this.renderPageHighlights(page, viewport, highlightLayer);
      return;
    }

    // Mark as processing
    this.setPageState(page, { isProcessing: true, isProcessed: false, lastQuery: query });

    try {
      // Step 1: Tokenize the text content
      const textContent = textElement.textContent || '';
      const tokens = tokenize(textContent);

      if (tokens.length === 0) {
        this.clearPageResults(page, highlightLayer);
        return;
      }

      // Step 2: Find matches in the tokens
      const matchSpans = findMatches(tokens, query);

      if (matchSpans.length === 0) {
        this.clearPageResults(page, highlightLayer);
        return;
      }

      // Step 3: Measure CSS rectangles for each match
      const cssRects = measureSubstrings(textElement, matchSpans);

      if (cssRects.length === 0) {
        this.clearPageResults(page, highlightLayer);
        return;
      }

      // Step 4: Convert to PDF-space and create MatchRect objects
      const matchRects: MatchRect[] = [];
      
      for (let i = 0; i < Math.min(matchSpans.length, cssRects.length); i++) {
        const span = matchSpans[i];
        const cssRect = cssRects[i];
        const pdfRect = cssToPdf(cssRect, viewport);

        matchRects.push({
          page,
          termId: span.termId,
          order: this.globalMatchOrder++,
          bboxPdf: pdfRect,
          sourceDivId: textElement.id || undefined
        });
      }

      // Step 5: Store the PDF-space rectangles
      matchStore.setMatchRects(page, matchRects);

      // Step 6: Render highlights
      this.renderPageHighlights(page, viewport, highlightLayer);

      // Mark as processed
      this.setPageState(page, { isProcessing: false, isProcessed: true, lastQuery: query });

    } catch (error) {
      console.error(`Error processing search for page ${page}:`, error);
      this.clearPageResults(page, highlightLayer);
      this.setPageState(page, { isProcessing: false, isProcessed: false, lastQuery: '' });
    }
  }

  /**
   * Start a new search across all pages
   * Clears previous results and resets global state
   */
  startNewSearch(query: string): void {
    // Clear all previous results
    matchStore.setQuery(query);
    this.globalMatchOrder = 0;
    this.pageStates.clear();
  }

  /**
   * Render highlights for a specific page using stored PDF rectangles
   * This is called on viewport changes (zoom/rotation) without recalculating geometry
   */
  renderPageHighlights(page: number, viewport: Viewport, highlightLayer: HTMLElement): void {
    // Update layer dimensions to match viewport
    updateLayerDimensions(highlightLayer, viewport);

    // Get stored match rectangles for this page
    const matchRects = matchStore.getMatchRects(page);
    
    // Get active match info
    const activeMatch = matchStore.getActiveMatch();
    const activeIndex = activeMatch && activeMatch.page === page 
      ? matchStore.getPageMatches(page).findIndex(m => m.rect.order === activeMatch.order)
      : -1;

    // Paint highlights from PDF-space coordinates
    paintHighlights(page, viewport, matchRects, highlightLayer, activeIndex);
  }

  /**
   * Navigate to the next match globally
   */
  nextMatch(): void {
    matchStore.nextMatch();
    this.scrollToActiveMatch();
  }

  /**
   * Navigate to the previous match globally
   */
  prevMatch(): void {
    matchStore.prevMatch();
    this.scrollToActiveMatch();
  }

  /**
   * Scroll to the currently active match
   */
  private scrollToActiveMatch(): void {
    const activeMatch = matchStore.getActiveMatch();
    if (!activeMatch) return;

    // Find the page element and viewport
    const pageElement = document.querySelector(`[data-page="${activeMatch.page}"]`);
    if (!pageElement) return;

    // Get current viewport (this would need to be passed in or stored)
    // For now, we'll use a basic scroll approach
    if (activeMatch.sourceDivId) {
      const sourceElement = document.getElementById(activeMatch.sourceDivId);
      if (sourceElement) {
        sourceElement.scrollIntoView({ block: 'center', inline: 'center' });
      }
    }
  }

  /**
   * Get search statistics
   */
  getSearchStats(): { totalMatches: number; activeIndex: number; query: string } {
    return {
      totalMatches: matchStore.getTotalMatches(),
      activeIndex: matchStore.getActiveIndex(),
      query: matchStore.getQuery()
    };
  }

  /**
   * Clear results for a specific page
   */
  private clearPageResults(page: number, highlightLayer: HTMLElement): void {
    matchStore.clearPageMatches(page);
    highlightLayer.innerHTML = '';
    this.setPageState(page, { isProcessing: false, isProcessed: false, lastQuery: '' });
  }

  /**
   * Get page processing state
   */
  private getPageState(page: number): PageProcessingState {
    return this.pageStates.get(page) || { isProcessing: false, isProcessed: false, lastQuery: '' };
  }

  /**
   * Set page processing state
   */
  private setPageState(page: number, state: PageProcessingState): void {
    this.pageStates.set(page, state);
  }

  /**
   * Check if a page needs processing for the current query
   */
  needsProcessing(page: number, query: string): boolean {
    const state = this.getPageState(page);
    return !state.isProcessing && (!state.isProcessed || state.lastQuery !== query);
  }

  /**
   * Process multiple pages in batch (for visible pages)
   */
  async processBatchPages(
    pages: Array<{
      page: number;
      textElement: HTMLElement;
      highlightLayer: HTMLElement;
    }>,
    query: string,
    viewport: Viewport
  ): Promise<void> {
    const promises = pages
      .filter(p => this.needsProcessing(p.page, query))
      .map(p => this.processPageSearch(p.page, query, p.textElement, viewport, p.highlightLayer));

    await Promise.all(promises);
  }

  /**
   * Handle viewport changes (zoom/rotation)
   * Re-renders all processed pages without recalculating geometry
   */
  handleViewportChange(
    viewport: Viewport,
    visiblePages: Array<{ page: number; highlightLayer: HTMLElement }>
  ): void {
    visiblePages.forEach(({ page, highlightLayer }) => {
      const matchRects = matchStore.getMatchRects(page);
      if (matchRects.length > 0) {
        this.renderPageHighlights(page, viewport, highlightLayer);
      }
    });
  }

  /**
   * Subscribe to store changes for UI updates
   */
  subscribe(callback: (stats: { totalMatches: number; activeIndex: number; query: string }) => void): () => void {
    return matchStore.subscribe(() => {
      callback(this.getSearchStats());
    });
  }
}

// Export singleton instance
export const searchController = new SearchController();
