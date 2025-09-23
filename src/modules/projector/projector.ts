// Single authoritative projector for PDF-space ↔ CSS-space coordinate conversion
// Replaces all ad-hoc coordinate math with one tested, reliable implementation

import { Viewport, PdfRect, CssRect } from '../../types/viewport';

/**
 * Convert PDF user units to CSS pixels with proper Y-axis inversion and rotation
 * This is used every time we need to draw highlights at the current zoom level
 * 
 * PDF coordinates: origin at bottom-left, Y increases upward  
 * CSS coordinates: origin at top-left, Y increases downward
 */
export function pdfToCss(bboxPdf: PdfRect, viewport: Viewport): CssRect {
  const [pdfX, pdfY, pdfW, pdfH] = bboxPdf;
  
  if (viewport.rotation === 0) {
    // Simple case: no rotation
    // Handle Y-axis inversion: CSS Y = viewport.height - (PDF Y * scale + PDF height * scale)
    const cssLeft = pdfX * viewport.scale;
    const cssTop = viewport.height - (pdfY * viewport.scale + pdfH * viewport.scale);
    const cssWidth = pdfW * viewport.scale;
    const cssHeight = pdfH * viewport.scale;
    
    return [cssLeft, cssTop, cssWidth, cssHeight];
  }
  
  // Complex case: handle rotation by rotating rectangle corners
  const corners = getRectangleCorners([pdfX, pdfY, pdfW, pdfH]);
  const rotatedCorners = corners.map(corner => 
    rotatePoint(corner, viewport.rotation, viewport.width / (2 * viewport.scale), viewport.height / (2 * viewport.scale))
  );
  
  // Find bounding box of rotated corners
  const minX = Math.min(...rotatedCorners.map(c => c.x));
  const maxX = Math.max(...rotatedCorners.map(c => c.x));
  const minY = Math.min(...rotatedCorners.map(c => c.y));
  const maxY = Math.max(...rotatedCorners.map(c => c.y));
  
  // Convert to CSS coordinates with Y-axis inversion
  const cssLeft = minX * viewport.scale;
  const cssTop = viewport.height - (maxY * viewport.scale);
  const cssWidth = (maxX - minX) * viewport.scale;
  const cssHeight = (maxY - minY) * viewport.scale;
  
  return [cssLeft, cssTop, cssWidth, cssHeight];
}

/**
 * Convert CSS pixels to PDF user units with proper Y-axis inversion and rotation
 * This is done once after text layer rendering to cache PDF-space rectangles
 * 
 * CSS coordinates: origin at top-left, Y increases downward
 * PDF coordinates: origin at bottom-left, Y increases upward
 */
export function cssToPdf(cssRect: CssRect, viewport: Viewport): PdfRect {
  const [cssLeft, cssTop, cssWidth, cssHeight] = cssRect;
  
  if (viewport.rotation === 0) {
    // Simple case: no rotation
    // Handle Y-axis inversion: PDF Y = (viewport.height - (CSS Y + CSS height)) / scale
    const pdfX = cssLeft / viewport.scale;
    const pdfY = (viewport.height - (cssTop + cssHeight)) / viewport.scale;
    const pdfW = cssWidth / viewport.scale;
    const pdfH = cssHeight / viewport.scale;
    
    return [pdfX, pdfY, pdfW, pdfH];
  }
  
  // Complex case: handle rotation
  // First convert CSS to PDF coordinates (with Y-axis inversion)
  const pdfLeft = cssLeft / viewport.scale;
  const pdfTop = (viewport.height - cssTop) / viewport.scale;
  const pdfWidth = cssWidth / viewport.scale;
  const pdfHeight = cssHeight / viewport.scale;
  
  // Create rectangle in PDF space (note: pdfTop is already inverted)
  const pdfRect: PdfRect = [pdfLeft, pdfTop - pdfHeight, pdfWidth, pdfHeight];
  
  // Apply inverse rotation
  const corners = getRectangleCorners(pdfRect);
  const rotatedCorners = corners.map(corner => 
    rotatePoint(corner, -viewport.rotation, viewport.width / (2 * viewport.scale), viewport.height / (2 * viewport.scale))
  );
  
  // Find bounding box of rotated corners
  const minX = Math.min(...rotatedCorners.map(c => c.x));
  const maxX = Math.max(...rotatedCorners.map(c => c.x));
  const minY = Math.min(...rotatedCorners.map(c => c.y));
  const maxY = Math.max(...rotatedCorners.map(c => c.y));
  
  return [minX, minY, maxX - minX, maxY - minY];
}

/**
 * Get the four corners of a rectangle
 */
function getRectangleCorners(rect: PdfRect): Array<{x: number, y: number}> {
  const [x, y, w, h] = rect;
  return [
    { x: x, y: y },           // bottom-left
    { x: x + w, y: y },       // bottom-right
    { x: x + w, y: y + h },   // top-right
    { x: x, y: y + h }        // top-left
  ];
}

/**
 * Rotate a point around a center by the given angle (in degrees)
 */
function rotatePoint(
  point: {x: number, y: number}, 
  angleDegrees: number, 
  centerX: number, 
  centerY: number
): {x: number, y: number} {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  // Translate to origin
  const relX = point.x - centerX;
  const relY = point.y - centerY;
  
  // Apply rotation matrix
  const rotatedX = relX * cos - relY * sin;
  const rotatedY = relX * sin + relY * cos;
  
  // Translate back
  return {
    x: rotatedX + centerX,
    y: rotatedY + centerY
  };
}

/**
 * Create validation crosshairs at PDF page corners for debugging alignment
 * These should hug the canvas corners at all zoom levels and rotations
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
