// Unit tests for the projector module
// Tests round-trip accuracy at various scales and rotations

import { describe, it, expect } from 'vitest';
import { pdfToCss, cssToPdf, createValidationCrosshairs } from '../projector';
import { Viewport, PdfRect, CssRect } from '../../../types/viewport';

describe('Projector', () => {
  // Test viewports at different scales and rotations
  const testViewports: Viewport[] = [
    { width: 800, height: 600, scale: 0.5, rotation: 0 },
    { width: 800, height: 600, scale: 0.75, rotation: 0 },
    { width: 800, height: 600, scale: 1.0, rotation: 0 },
    { width: 800, height: 600, scale: 1.5, rotation: 0 },
    { width: 800, height: 600, scale: 2.0, rotation: 0 },
    { width: 800, height: 600, scale: 3.0, rotation: 0 },
    { width: 800, height: 600, scale: 1.0, rotation: 90 },
    { width: 800, height: 600, scale: 1.0, rotation: 180 },
    { width: 800, height: 600, scale: 1.0, rotation: 270 },
    { width: 600, height: 800, scale: 1.5, rotation: 90 },
    { width: 600, height: 800, scale: 2.0, rotation: 180 },
  ];

  // Test rectangles in PDF space
  const testRects: PdfRect[] = [
    [0, 0, 100, 50],           // bottom-left corner
    [700, 550, 100, 50],       // top-right corner
    [350, 275, 100, 50],       // center
    [0, 275, 100, 50],         // left edge
    [700, 275, 100, 50],       // right edge
    [350, 0, 100, 50],         // bottom edge
    [350, 550, 100, 50],       // top edge
    [10, 10, 5, 5],            // small rectangle
    [100, 200, 200, 100],      // medium rectangle
  ];

  describe('Round-trip accuracy', () => {
    testViewports.forEach((viewport, vIndex) => {
      testRects.forEach((pdfRect, rIndex) => {
        it(`should maintain accuracy for viewport ${vIndex} rect ${rIndex} (scale: ${viewport.scale}, rotation: ${viewport.rotation})`, () => {
          // PDF → CSS → PDF round trip
          const cssRect = pdfToCss(pdfRect, viewport);
          const roundTripPdfRect = cssToPdf(cssRect, viewport);

          // Check each component with tolerance
          const tolerance = 0.5; // 0.5 PDF units tolerance
          expect(Math.abs(roundTripPdfRect[0] - pdfRect[0])).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(roundTripPdfRect[1] - pdfRect[1])).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(roundTripPdfRect[2] - pdfRect[2])).toBeLessThanOrEqual(tolerance);
          expect(Math.abs(roundTripPdfRect[3] - pdfRect[3])).toBeLessThanOrEqual(tolerance);
        });
      });
    });
  });

  describe('Y-axis inversion', () => {
    it('should correctly invert Y-axis for non-rotated viewport', () => {
      const viewport: Viewport = { width: 800, height: 600, scale: 1.0, rotation: 0 };
      const pdfRect: PdfRect = [100, 100, 50, 30]; // 100 units from bottom, 30 high
      
      const cssRect = pdfToCss(pdfRect, viewport);
      
      // CSS Y should be: 600 - (100 * 1.0 + 30 * 1.0) = 600 - 130 = 470
      expect(cssRect[0]).toBe(100); // X unchanged
      expect(cssRect[1]).toBe(470); // Y inverted
      expect(cssRect[2]).toBe(50);  // Width unchanged
      expect(cssRect[3]).toBe(30);  // Height unchanged
    });

    it('should correctly invert Y-axis with scaling', () => {
      const viewport: Viewport = { width: 1600, height: 1200, scale: 2.0, rotation: 0 };
      const pdfRect: PdfRect = [50, 50, 25, 15]; // 50 units from bottom, 15 high
      
      const cssRect = pdfToCss(pdfRect, viewport);
      
      // CSS Y should be: 1200 - (50 * 2.0 + 15 * 2.0) = 1200 - 130 = 1070
      expect(cssRect[0]).toBe(100); // X scaled: 50 * 2
      expect(cssRect[1]).toBe(1070); // Y inverted and scaled
      expect(cssRect[2]).toBe(50);  // Width scaled: 25 * 2
      expect(cssRect[3]).toBe(30);  // Height scaled: 15 * 2
    });
  });

  describe('Scaling', () => {
    it('should scale coordinates correctly', () => {
      const viewport: Viewport = { width: 1200, height: 900, scale: 1.5, rotation: 0 };
      const pdfRect: PdfRect = [100, 200, 50, 30];
      
      const cssRect = pdfToCss(pdfRect, viewport);
      
      expect(cssRect[0]).toBe(150); // 100 * 1.5
      expect(cssRect[2]).toBe(75);  // 50 * 1.5
      expect(cssRect[3]).toBe(45);  // 30 * 1.5
    });
  });

  describe('Edge cases', () => {
    it('should handle zero-size rectangles', () => {
      const viewport: Viewport = { width: 800, height: 600, scale: 1.0, rotation: 0 };
      const pdfRect: PdfRect = [100, 100, 0, 0];
      
      const cssRect = pdfToCss(pdfRect, viewport);
      const roundTrip = cssToPdf(cssRect, viewport);
      
      expect(cssRect[2]).toBe(0); // Width should be 0
      expect(cssRect[3]).toBe(0); // Height should be 0
      expect(Math.abs(roundTrip[2])).toBeLessThanOrEqual(0.1); // Round trip width
      expect(Math.abs(roundTrip[3])).toBeLessThanOrEqual(0.1); // Round trip height
    });

    it('should handle negative coordinates', () => {
      const viewport: Viewport = { width: 800, height: 600, scale: 1.0, rotation: 0 };
      const pdfRect: PdfRect = [-50, -30, 100, 60];
      
      const cssRect = pdfToCss(pdfRect, viewport);
      const roundTrip = cssToPdf(cssRect, viewport);
      
      const tolerance = 0.5;
      expect(Math.abs(roundTrip[0] - pdfRect[0])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(roundTrip[1] - pdfRect[1])).toBeLessThanOrEqual(tolerance);
    });
  });

  describe('Validation crosshairs', () => {
    it('should create crosshairs at page corners', () => {
      const viewport: Viewport = { width: 800, height: 600, scale: 1.0, rotation: 0 };
      const crosshairs = createValidationCrosshairs(viewport);
      
      expect(crosshairs).toHaveLength(4);
      
      // Check that crosshairs are near the corners
      // Bottom-left should be near (0, 590) in CSS space
      expect(crosshairs[0][0]).toBeLessThanOrEqual(10); // Near left edge
      expect(crosshairs[0][1]).toBeGreaterThanOrEqual(580); // Near bottom
      
      // Top-right should be near (790, 0) in CSS space  
      expect(crosshairs[2][0]).toBeGreaterThanOrEqual(780); // Near right edge
      expect(crosshairs[2][1]).toBeLessThanOrEqual(20); // Near top
    });

    it('should scale crosshairs with viewport', () => {
      const viewport: Viewport = { width: 1600, height: 1200, scale: 2.0, rotation: 0 };
      const crosshairs = createValidationCrosshairs(viewport);
      
      expect(crosshairs).toHaveLength(4);
      
      // At 2x scale, crosshairs should be larger
      expect(crosshairs[0][2]).toBe(10); // Width should be 10 CSS pixels
      expect(crosshairs[0][3]).toBe(10); // Height should be 10 CSS pixels
    });
  });

  describe('Rotation handling', () => {
    it('should handle 90-degree rotation', () => {
      const viewport: Viewport = { width: 800, height: 600, scale: 1.0, rotation: 90 };
      const pdfRect: PdfRect = [100, 100, 50, 30];
      
      const cssRect = pdfToCss(pdfRect, viewport);
      const roundTrip = cssToPdf(cssRect, viewport);
      
      // Round trip should be close to original
      const tolerance = 1.0; // Slightly higher tolerance for rotation
      expect(Math.abs(roundTrip[0] - pdfRect[0])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(roundTrip[1] - pdfRect[1])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(roundTrip[2] - pdfRect[2])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(roundTrip[3] - pdfRect[3])).toBeLessThanOrEqual(tolerance);
    });

    it('should handle 180-degree rotation', () => {
      const viewport: Viewport = { width: 800, height: 600, scale: 1.0, rotation: 180 };
      const pdfRect: PdfRect = [100, 100, 50, 30];
      
      const cssRect = pdfToCss(pdfRect, viewport);
      const roundTrip = cssToPdf(cssRect, viewport);
      
      const tolerance = 1.0;
      expect(Math.abs(roundTrip[0] - pdfRect[0])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(roundTrip[1] - pdfRect[1])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(roundTrip[2] - pdfRect[2])).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(roundTrip[3] - pdfRect[3])).toBeLessThanOrEqual(tolerance);
    });
  });
});
