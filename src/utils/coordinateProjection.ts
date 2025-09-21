// Coordinate projection utilities for PDF-space alignment
// Ensures highlights stay aligned with PDF content at any zoom level
//
// COORDINATE SYSTEM CONTRACTS:
//
// 1. PDF Coordinate System (PDF.js native):
//    - Origin: Bottom-left corner of the page
//    - X-axis: Increases rightward (same as CSS)
//    - Y-axis: Increases upward (opposite of CSS)
//    - Units: PDF user units (typically 1/72 inch)
//
// 2. CSS Coordinate System (DOM/Browser):
//    - Origin: Top-left corner of the page
//    - X-axis: Increases rightward (same as PDF)
//    - Y-axis: Increases downward (opposite of PDF)
//    - Units: CSS pixels
//
// 3. Viewport Scaling:
//    - All coordinates are scaled by viewport.scale
//    - CSS pixels = PDF user units × scale
//    - PDF user units = CSS pixels ÷ scale
//
// 4. Y-Axis Conversion Formula:
//    - CSS → PDF: pdfY = (viewport.height - (cssY + cssHeight)) ÷ scale
//    - PDF → CSS: cssY = viewport.height - (pdfY × scale + pdfHeight × scale)
//
// 5. Rotation Handling:
//    - Rotations are applied around the page center
//    - Rotation angles are in degrees (0, 90, 180, 270)
//    - Rotation matrix is applied after coordinate system conversion
//
// 6. Usage Pattern:
//    - Cache geometry: CSS → PDF (done once per page/scale change)
//    - Render highlights: PDF → CSS (done on every search/zoom)
//    - Always use complete viewport with width, height, scale, rotation

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
  rotation?: number;
}

/**
 * Convert CSS pixel coordinates to PDF user units with proper Y-axis inversion
 * This is done once after text layer rendering to cache PDF-space rectangles
 * 
 * CSS coordinates: origin at top-left, Y increases downward
 * PDF coordinates: origin at bottom-left, Y increases upward
 */
export function cssToPdfRect(cssRect: CSSRect, viewport: PageViewport): PDFRect {
  const rotation = viewport.rotation || 0;
  
  // Handle Y-axis inversion: PDF Y = viewport.height - (CSS Y + CSS height)
  const pdfX = cssRect.left / viewport.scale;
  const pdfY = (viewport.height - (cssRect.top + cssRect.height)) / viewport.scale;
  const pdfW = cssRect.width / viewport.scale;
  const pdfH = cssRect.height / viewport.scale;
  
  // Apply rotation transformation if needed
  if (rotation === 0) {
    return { x: pdfX, y: pdfY, w: pdfW, h: pdfH };
  }
  
  // For rotated pages, apply rotation matrix around page center
  const centerX = viewport.width / (2 * viewport.scale);
  const centerY = viewport.height / (2 * viewport.scale);
  
  return applyRotationToPdfRect(
    { x: pdfX, y: pdfY, w: pdfW, h: pdfH },
    rotation,
    centerX,
    centerY
  );
}

/**
 * Project PDF user units to CSS pixels with proper Y-axis inversion
 * This is used every time we need to draw highlights at the current zoom level
 * 
 * PDF coordinates: origin at bottom-left, Y increases upward  
 * CSS coordinates: origin at top-left, Y increases downward
 */
export function pdfToCssRect(pdfRect: PDFRect, viewport: PageViewport): CSSRect {
  const rotation = viewport.rotation || 0;
  let rect = pdfRect;
  
  // Apply inverse rotation transformation if needed
  if (rotation !== 0) {
    const centerX = viewport.width / (2 * viewport.scale);
    const centerY = viewport.height / (2 * viewport.scale);
    rect = applyRotationToPdfRect(pdfRect, -rotation, centerX, centerY);
  }
  
  // Handle Y-axis inversion: CSS Y = viewport.height - (PDF Y * scale + PDF height * scale)
  const cssLeft = rect.x * viewport.scale;
  const cssTop = viewport.height - (rect.y * viewport.scale + rect.h * viewport.scale);
  const cssWidth = rect.w * viewport.scale;
  const cssHeight = rect.h * viewport.scale;
  
  return {
    left: cssLeft,
    top: cssTop,
    width: cssWidth,
    height: cssHeight
  };
}

/**
 * Apply rotation transformation to a PDF rectangle around a center point
 * Used internally by coordinate conversion functions for rotated pages
 */
function applyRotationToPdfRect(
  rect: PDFRect, 
  rotation: number, 
  centerX: number, 
  centerY: number
): PDFRect {
  // Convert rotation from degrees to radians
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  // Translate rectangle to origin (relative to center)
  const relX = rect.x - centerX;
  const relY = rect.y - centerY;
  
  // Apply rotation matrix
  const rotatedX = relX * cos - relY * sin;
  const rotatedY = relX * sin + relY * cos;
  
  // Translate back to original coordinate system
  const finalX = rotatedX + centerX;
  const finalY = rotatedY + centerY;
  
  // For simplicity, we don't rotate the width/height dimensions
  // This works for most text rectangles which are axis-aligned after rotation
  return {
    x: finalX,
    y: finalY,
    w: rect.w,
    h: rect.h
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
