// Single authoritative projector for PDF-space ↔ CSS-space coordinate conversion
// Enhanced to use PDF.js built-in coordinate conversion when available

import { Viewport, PdfRect, CssRect } from '../../types/viewport';

/**
 * Convert PDF user units to CSS pixels with proper Y-axis inversion
 * Uses PDF.js built-in coordinate conversion when available, falls back to manual calculation
 * 
 * PDF coordinates: origin at bottom-left, Y increases upward  
 * CSS coordinates: origin at top-left, Y increases downward
 */
export function pdfToCss(bboxPdf: PdfRect, viewport: Viewport): CssRect {
  const [pdfX, pdfY, pdfW, pdfH] = bboxPdf;
  
  // Use PDF.js built-in coordinate conversion when available
  if (viewport.originalViewport) {
    const [cssLeft, cssTop] = viewport.originalViewport.convertToViewportPoint(pdfX, pdfY);
    const [cssRight, cssBottom] = viewport.originalViewport.convertToViewportPoint(pdfX + pdfW, pdfY + pdfH);
    
    return [
      cssLeft,
      Math.min(cssTop, cssBottom), // Ensure top is the smaller Y value
      cssRight - cssLeft,
      Math.abs(cssBottom - cssTop)
    ];
  }
  
  // Fallback to manual calculation for backward compatibility
  const cssLeft = pdfX * viewport.scale;
  const cssTop = viewport.height - (pdfY * viewport.scale + pdfH * viewport.scale);
  const cssWidth = pdfW * viewport.scale;
  const cssHeight = pdfH * viewport.scale;
  
  return [cssLeft, cssTop, cssWidth, cssHeight];
}

/**
 * Convert CSS pixels to PDF user units with proper Y-axis inversion
 * Uses PDF.js built-in coordinate conversion when available, falls back to manual calculation
 * 
 * CSS coordinates: origin at top-left, Y increases downward
 * PDF coordinates: origin at bottom-left, Y increases upward
 */
export function cssToPdf(cssRect: CssRect, viewport: Viewport): PdfRect {
  const [cssLeft, cssTop, cssWidth, cssHeight] = cssRect;
  
  // Use PDF.js built-in coordinate conversion when available
  if (viewport.originalViewport) {
    const [pdfX1, pdfY1] = viewport.originalViewport.convertToPdfPoint(cssLeft, cssTop);
    const [pdfX2, pdfY2] = viewport.originalViewport.convertToPdfPoint(cssLeft + cssWidth, cssTop + cssHeight);
    
    return [
      Math.min(pdfX1, pdfX2),
      Math.min(pdfY1, pdfY2),
      Math.abs(pdfX2 - pdfX1),
      Math.abs(pdfY2 - pdfY1)
    ];
  }
  
  // Fallback to manual calculation for backward compatibility
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
