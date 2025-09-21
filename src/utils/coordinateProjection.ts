// Coordinate projection utilities for PDF-space alignment
// Ensures highlights stay aligned with PDF content at any zoom level

export interface PDFRect {
  x: number;  // PDF user units
  y: number;  // PDF user units  
  w: number;  // PDF user units
  h: number;  // PDF user units
}

export interface CSSRect {
  left: number;   // CSS pixels
  top: number;    // CSS pixels
  width: number;  // CSS pixels
  height: number; // CSS pixels
}

export interface PageViewport {
  width: number;
  height: number;
  scale: number;
}

/**
 * Convert CSS pixel coordinates to PDF user units
 * This is done once after text layer rendering to cache PDF-space rectangles
 */
export function cssToPdfRect(cssRect: CSSRect, viewport: PageViewport): PDFRect {
  return {
    x: cssRect.left / viewport.scale,
    y: cssRect.top / viewport.scale,
    w: cssRect.width / viewport.scale,
    h: cssRect.height / viewport.scale
  };
}

/**
 * Project PDF user units to CSS pixels using current viewport
 * This is used every time we need to draw highlights at the current zoom level
 */
export function pdfToCssRect(pdfRect: PDFRect, viewport: PageViewport): CSSRect {
  return {
    left: pdfRect.x * viewport.scale,
    top: pdfRect.y * viewport.scale,
    width: pdfRect.w * viewport.scale,
    height: pdfRect.h * viewport.scale
  };
}

/**
 * Extract CSS rectangle from a DOM element's computed style
 * Used to read text div positions once during initial text layer setup
 */
export function extractCssRect(element: HTMLElement): CSSRect {
  const left = parseFloat(element.style.left) || 0;
  const top = parseFloat(element.style.top) || 0;
  const width = parseFloat(element.style.width) || 0;
  const height = parseFloat(element.style.height) || 0;
  
  return { left, top, width, height };
}

/**
 * Create validation crosshairs at PDF page corners
 * Used for debugging alignment - crosshairs should hug canvas corners at all zoom levels
 */
export function createValidationCrosshairs(viewport: PageViewport): CSSRect[] {
  const corners = [
    { x: 0, y: 0 },                           // top-left
    { x: viewport.width / viewport.scale, y: 0 },                          // top-right  
    { x: 0, y: viewport.height / viewport.scale },                         // bottom-left
    { x: viewport.width / viewport.scale, y: viewport.height / viewport.scale }  // bottom-right
  ];
  
  return corners.map(corner => pdfToCssRect({
    x: corner.x,
    y: corner.y, 
    w: 10 / viewport.scale,  // 10px crosshair in PDF units
    h: 10 / viewport.scale
  }, viewport));
}
