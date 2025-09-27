// Single authoritative projector for PDF-space ↔ CSS-space coordinate conversion
// Replaces all ad-hoc coordinate math with one tested, reliable implementation

import { Viewport, PdfRect, CssRect } from '../../types/viewport';

/**
 * Convert PDF user units to CSS pixels with proper Y-axis inversion
 * This is used every time we need to draw highlights at the current zoom level
 * 
 * PDF coordinates: origin at bottom-left, Y increases upward  
 * CSS coordinates: origin at top-left, Y increases downward
 */
export function pdfToCss(bboxPdf: PdfRect, viewport: Viewport): CssRect {
  const [pdfX, pdfY, pdfW, pdfH] = bboxPdf;
  
  // Handle Y-axis inversion: CSS Y = viewport.height - (PDF Y * scale + PDF height * scale)
  const cssLeft = pdfX * viewport.scale;
  const cssTop = viewport.height - (pdfY * viewport.scale + pdfH * viewport.scale);
  const cssWidth = pdfW * viewport.scale;
  const cssHeight = pdfH * viewport.scale;
  
  return [cssLeft, cssTop, cssWidth, cssHeight];
}

/**
 * Convert CSS pixels to PDF user units with proper Y-axis inversion
 * This is done once after text layer rendering to cache PDF-space rectangles
 * 
 * CSS coordinates: origin at top-left, Y increases downward
 * PDF coordinates: origin at bottom-left, Y increases upward
 */
export function cssToPdf(cssRect: CssRect, viewport: Viewport): PdfRect {
  const [cssLeft, cssTop, cssWidth, cssHeight] = cssRect;
  
  // Handle Y-axis inversion: PDF Y = (viewport.height - (CSS Y + CSS height)) / scale
  const pdfX = cssLeft / viewport.scale;
  const pdfY = (viewport.height - (cssTop + cssHeight)) / viewport.scale;
  const pdfW = cssWidth / viewport.scale;
  const pdfH = cssHeight / viewport.scale;
  
  return [pdfX, pdfY, pdfW, pdfH];
}


/**
 * Create validation crosshairs at PDF page corners for debugging alignment
 * These should hug the canvas corners at all zoom levels
 */
export function createValidationCrosshairs(viewport: Viewport): CssRect[] {
  const pageWidth = viewport.width / viewport.scale;
  const pageHeight = viewport.height / viewport.scale;
  const crosshairSize = 10 / viewport.scale; // 10px crosshair in PDF units
  
  const corners: PdfRect[] = [
    [0, 0, crosshairSize, crosshairSize],                                    // bottom-left
    [pageWidth - crosshairSize, 0, crosshairSize, crosshairSize],           // bottom-right  
    [pageWidth - crosshairSize, pageHeight - crosshairSize, crosshairSize, crosshairSize], // top-right
    [0, pageHeight - crosshairSize, crosshairSize, crosshairSize]           // top-left
  ];
  
  return corners.map(corner => pdfToCss(corner, viewport));
}
