// Renderer for highlight overlays
// Paints highlights purely from projected PDF-space coordinates

import { MatchRect, Viewport } from '../../types/viewport';
import { pdfToCss } from '../projector/projector';

/**
 * Paint highlights from PDF-space rectangles onto a DOM layer
 * This is called on every viewport change (zoom/rotation) but does NOT recalculate geometry
 */
export function paintHighlights(
  page: number,
  viewport: Viewport,
  rects: MatchRect[],
  layerElement: HTMLElement,
  activeIndex: number = -1
): void {
  // Clear existing highlights
  clearHighlights(layerElement);
  
  if (rects.length === 0) {
    return;
  }
  
  // Create document fragment for batch DOM insertion
  const fragment = document.createDocumentFragment();
  
  // Project each PDF rectangle to CSS and create highlight element
  rects.forEach((matchRect, index) => {
    const cssRect = pdfToCss(matchRect.bboxPdf, viewport);
    const highlightElement = createHighlightElement(cssRect, index === activeIndex, matchRect);
    fragment.appendChild(highlightElement);
  });
  
  // Insert all highlights at once
  layerElement.appendChild(fragment);
}

/**
 * Create a single highlight DOM element from CSS coordinates
 */
function createHighlightElement(
  cssRect: [number, number, number, number],
  isActive: boolean,
  matchRect: MatchRect
): HTMLElement {
  const [left, top, width, height] = cssRect;
  
  const div = document.createElement('div');
  div.className = isActive ? 'highlight active' : 'highlight';
  
  // Set position and dimensions
  Object.assign(div.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: 'none',
    // No margin, border, or padding (enforced by CSS)
    margin: '0',
    border: '0',
    padding: '0'
  });
  
  // Add data attributes for debugging
  div.setAttribute('data-page', matchRect.page.toString());
  div.setAttribute('data-term-id', matchRect.termId);
  div.setAttribute('data-order', matchRect.order.toString());
  
  return div;
}

/**
 * Clear all highlight elements from a layer
 */
export function clearHighlights(layerElement: HTMLElement): void {
  // Remove all child elements
  while (layerElement.firstChild) {
    layerElement.removeChild(layerElement.firstChild);
  }
}

/**
 * Update highlight layer dimensions to match viewport
 * This ensures the overlay layer is exactly the same size as the page
 */
export function updateLayerDimensions(layerElement: HTMLElement, viewport: Viewport): void {
  Object.assign(layerElement.style, {
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    position: 'absolute',
    left: '0',
    top: '0',
    // Enforce no margin, border, or padding
    margin: '0',
    border: '0',
    padding: '0'
  });
}

/**
 * Paint debug crosshairs for alignment validation
 * These should appear at the page corners at all zoom levels
 */
export function paintDebugCrosshairs(
  layerElement: HTMLElement,
  viewport: Viewport,
  crosshairRects: [number, number, number, number][]
): void {
  const fragment = document.createDocumentFragment();
  
  crosshairRects.forEach((cssRect, index) => {
    const crosshair = createDebugCrosshair(cssRect, index);
    fragment.appendChild(crosshair);
  });
  
  layerElement.appendChild(fragment);
}

/**
 * Create a debug crosshair element
 */
function createDebugCrosshair(
  cssRect: [number, number, number, number],
  index: number
): HTMLElement {
  const [left, top, width, height] = cssRect;
  
  const div = document.createElement('div');
  div.className = 'debug-crosshair';
  
  Object.assign(div.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: 'none',
    zIndex: '999',
    // No margin, border, or padding
    margin: '0',
    border: '0',
    padding: '0'
  });
  
  div.setAttribute('data-crosshair-index', index.toString());
  
  return div;
}

/**
 * Batch update highlights with performance optimization
 * Uses requestAnimationFrame to avoid layout thrashing
 */
export function paintHighlightsAsync(
  page: number,
  viewport: Viewport,
  rects: MatchRect[],
  layerElement: HTMLElement,
  activeIndex: number = -1
): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      paintHighlights(page, viewport, rects, layerElement, activeIndex);
      resolve();
    });
  });
}

/**
 * Update only the active highlight without repainting all highlights
 * Performance optimization for navigation
 */
export function updateActiveHighlight(
  layerElement: HTMLElement,
  previousActiveIndex: number,
  newActiveIndex: number
): void {
  const highlights = layerElement.querySelectorAll('.highlight');
  
  // Remove active class from previous highlight
  if (previousActiveIndex >= 0 && previousActiveIndex < highlights.length) {
    highlights[previousActiveIndex].classList.remove('active');
  }
  
  // Add active class to new highlight
  if (newActiveIndex >= 0 && newActiveIndex < highlights.length) {
    highlights[newActiveIndex].classList.add('active');
  }
}

/**
 * Check if highlights are visible within the viewport
 * Used for viewport culling optimization
 */
export function getVisibleHighlights(
  rects: MatchRect[],
  viewport: Viewport,
  visibleArea: { left: number; top: number; width: number; height: number }
): MatchRect[] {
  return rects.filter(rect => {
    const cssRect = pdfToCss(rect.bboxPdf, viewport);
    const [left, top, width, height] = cssRect;
    
    // Check if rectangle intersects with visible area
    return !(
      left + width < visibleArea.left ||
      left > visibleArea.left + visibleArea.width ||
      top + height < visibleArea.top ||
      top > visibleArea.top + visibleArea.height
    );
  });
}

/**
 * Get the CSS rectangle for scrolling to a specific match
 * Used by navigation to center the active match
 */
export function getMatchScrollRect(matchRect: MatchRect, viewport: Viewport): { left: number; top: number; width: number; height: number } {
  const [left, top, width, height] = pdfToCss(matchRect.bboxPdf, viewport);
  return { left, top, width, height };
}
