// Fallback text layer implementation without CSS transforms
// Builds numeric positioning from PDF text matrices and viewport

import { Viewport, CssRect } from '../../types/viewport';
import { pdfToCss } from '../projector/projector';

interface TextMatrix {
  tx: number;  // x translation
  ty: number;  // y translation
  a: number;   // x scale
  b: number;   // xy skew
  c: number;   // yx skew
  d: number;   // y scale
}

interface TextItem {
  str: string;
  transform: number[];  // [a, b, c, d, tx, ty] matrix
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
}

/**
 * Create fallback text layer elements with numeric positioning
 * Does not use CSS transforms - computes left/top/width/height directly
 */
export function createFallbackTextLayer(
  textItems: TextItem[],
  viewport: Viewport,
  container: HTMLElement
): HTMLElement[] {
  const elements: HTMLElement[] = [];
  
  // Clear existing content
  container.innerHTML = '';
  
  textItems.forEach((item, index) => {
    const element = createTextElement(item, viewport, index);
    if (element) {
      elements.push(element);
      container.appendChild(element);
    }
  });
  
  return elements;
}

/**
 * Create a single text element with computed positioning
 */
function createTextElement(
  item: TextItem,
  viewport: Viewport,
  index: number
): HTMLElement | null {
  try {
    // Extract matrix components
    const [a, b, c, d, tx, ty] = item.transform;
    const matrix: TextMatrix = { tx, ty, a, b, c, d };
    
    // Compute element dimensions and position in PDF space
    const pdfRect = computePdfRect(item, matrix);
    
    // Project to CSS space using the projector
    const cssRect = pdfToCss(pdfRect, viewport);
    const [left, top, width, height] = cssRect;
    
    // Create DOM element
    const div = document.createElement('div');
    div.textContent = item.str;
    div.id = `fallback-text-${index}`;
    
    // Apply computed styles (no transforms)
    Object.assign(div.style, {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${computeFontSize(item.fontSize, viewport)}px`,
      fontFamily: normalizeFontName(item.fontName),
      color: 'transparent',  // Hide text but preserve geometry
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      // Ensure no margin, border, padding
      margin: '0',
      border: '0',
      padding: '0'
    });
    
    // Add data attributes for debugging
    div.setAttribute('data-text-index', index.toString());
    div.setAttribute('data-pdf-x', pdfRect[0].toString());
    div.setAttribute('data-pdf-y', pdfRect[1].toString());
    
    return div;
    
  } catch (error) {
    console.warn(`Failed to create fallback text element ${index}:`, error);
    return null;
  }
}

/**
 * Compute PDF-space rectangle from text item and matrix
 */
function computePdfRect(item: TextItem, matrix: TextMatrix): [number, number, number, number] {
  // Base position from matrix translation
  const x = matrix.tx;
  const y = matrix.ty;
  
  // Compute width and height considering matrix scaling
  const scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
  const scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
  
  const width = item.width * scaleX;
  const height = item.height * scaleY;
  
  return [x, y, width, height];
}

/**
 * Compute font size for CSS from PDF font size and viewport
 */
function computeFontSize(pdfFontSize: number, viewport: Viewport): number {
  // Font size scales with viewport but may need adjustment
  return pdfFontSize * viewport.scale;
}

/**
 * Normalize font name for CSS
 */
function normalizeFontName(fontName: string): string {
  // Remove PDF font prefixes and normalize
  const normalized = fontName
    .replace(/^[A-Z]{6}\+/, '') // Remove subset prefix like "ABCDEF+"
    .replace(/[,\-]/g, ' ')     // Replace commas and hyphens with spaces
    .trim();
  
  // Map common PDF fonts to web-safe fonts
  const fontMap: Record<string, string> = {
    'TimesRoman': 'Times, serif',
    'Times': 'Times, serif',
    'Helvetica': 'Arial, sans-serif',
    'Arial': 'Arial, sans-serif',
    'Courier': 'Courier New, monospace',
    'Symbol': 'Symbol',
    'ZapfDingbats': 'Zapf Dingbats'
  };
  
  return fontMap[normalized] || `"${normalized}", sans-serif`;
}

/**
 * Update fallback text layer for viewport changes
 * Recomputes all positions without changing the DOM structure
 */
export function updateFallbackTextLayer(
  elements: HTMLElement[],
  textItems: TextItem[],
  viewport: Viewport
): void {
  elements.forEach((element, index) => {
    if (index >= textItems.length) return;
    
    const item = textItems[index];
    const [a, b, c, d, tx, ty] = item.transform;
    const matrix: TextMatrix = { tx, ty, a, b, c, d };
    
    // Recompute positioning
    const pdfRect = computePdfRect(item, matrix);
    const cssRect = pdfToCss(pdfRect, viewport);
    const [left, top, width, height] = cssRect;
    
    // Update styles
    Object.assign(element.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${computeFontSize(item.fontSize, viewport)}px`
    });
  });
}

/**
 * Extract text content from fallback elements for search
 */
export function extractFallbackTextContent(elements: HTMLElement[]): string {
  return elements
    .map(el => el.textContent || '')
    .join(' ');
}

/**
 * Validate fallback positioning against reference implementation
 * Returns differences in pixels for debugging
 */
export function validateFallbackPositioning(
  fallbackElements: HTMLElement[],
  referenceElements: HTMLElement[]
): Array<{ index: number; deltaX: number; deltaY: number; deltaW: number; deltaH: number }> {
  const differences: Array<{ index: number; deltaX: number; deltaY: number; deltaW: number; deltaH: number }> = [];
  
  const maxLength = Math.min(fallbackElements.length, referenceElements.length);
  
  for (let i = 0; i < maxLength; i++) {
    const fallback = fallbackElements[i];
    const reference = referenceElements[i];
    
    const fallbackRect = {
      left: parseFloat(fallback.style.left) || 0,
      top: parseFloat(fallback.style.top) || 0,
      width: parseFloat(fallback.style.width) || 0,
      height: parseFloat(fallback.style.height) || 0
    };
    
    const referenceRect = {
      left: parseFloat(reference.style.left) || 0,
      top: parseFloat(reference.style.top) || 0,
      width: parseFloat(reference.style.width) || 0,
      height: parseFloat(reference.style.height) || 0
    };
    
    const deltaX = Math.abs(fallbackRect.left - referenceRect.left);
    const deltaY = Math.abs(fallbackRect.top - referenceRect.top);
    const deltaW = Math.abs(fallbackRect.width - referenceRect.width);
    const deltaH = Math.abs(fallbackRect.height - referenceRect.height);
    
    // Only report significant differences (> 1px)
    if (deltaX > 1 || deltaY > 1 || deltaW > 1 || deltaH > 1) {
      differences.push({ index: i, deltaX, deltaY, deltaW, deltaH });
    }
  }
  
  return differences;
}

/**
 * Check if fallback text layer is needed
 * Returns true if PDF.js text layer is unavailable or incomplete
 */
export function needsFallbackTextLayer(
  officialTextLayer: HTMLElement | null,
  textItems: TextItem[]
): boolean {
  if (!officialTextLayer) return true;
  
  const officialElements = officialTextLayer.children.length;
  const expectedElements = textItems.length;
  
  // Use fallback if official layer has significantly fewer elements
  return officialElements < expectedElements * 0.8;
}
