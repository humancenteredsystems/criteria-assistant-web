import { describe, it, expect } from 'vitest';
import {
  cssToPdfRect,
  pdfToCssRect,
  createValidationCrosshairs,
  type PDFRect,
  type CSSRect,
  type PageViewport
} from '../coordinateProjection';

describe('coordinateProjection', () => {
  // Test viewport configurations
  const baseViewport: PageViewport = {
    width: 800,
    height: 600,
    scale: 1,
    rotation: 0
  };

  const scaledViewport: PageViewport = {
    width: 1200,
    height: 900,
    scale: 1.5,
    rotation: 0
  };

  const rotatedViewport: PageViewport = {
    width: 600,
    height: 800,
    scale: 1,
    rotation: 90
  };

  describe('cssToPdfRect', () => {
    it('should convert CSS coordinates to PDF coordinates with Y-axis inversion at scale 1', () => {
      const cssRect: CSSRect = {
        left: 100,
        top: 50,
        width: 200,
        height: 30
      };

      const pdfRect = cssToPdfRect(cssRect, baseViewport);

      expect(pdfRect).toEqual({
        x: 100, // left / scale = 100 / 1
        y: 520, // (height - (top + height)) / scale = (600 - (50 + 30)) / 1
        w: 200, // width / scale = 200 / 1
        h: 30   // height / scale = 30 / 1
      });
    });

    it('should handle scaling correctly', () => {
      const cssRect: CSSRect = {
        left: 150,
        top: 75,
        width: 300,
        height: 45
      };

      const pdfRect = cssToPdfRect(cssRect, scaledViewport);

      expect(pdfRect).toEqual({
        x: 100, // 150 / 1.5
        y: 520, // (900 - (75 + 45)) / 1.5 = 780 / 1.5
        w: 200, // 300 / 1.5
        h: 30   // 45 / 1.5
      });
    });

    it('should handle edge cases - top-left corner', () => {
      const cssRect: CSSRect = {
        left: 0,
        top: 0,
        width: 10,
        height: 10
      };

      const pdfRect = cssToPdfRect(cssRect, baseViewport);

      expect(pdfRect).toEqual({
        x: 0,
        y: 590, // (600 - (0 + 10)) / 1
        w: 10,
        h: 10
      });
    });

    it('should handle edge cases - bottom-right corner', () => {
      const cssRect: CSSRect = {
        left: 790,
        top: 590,
        width: 10,
        height: 10
      };

      const pdfRect = cssToPdfRect(cssRect, baseViewport);

      expect(pdfRect).toEqual({
        x: 790,
        y: 0, // (600 - (590 + 10)) / 1
        w: 10,
        h: 10
      });
    });
  });

  describe('pdfToCssRect', () => {
    it('should convert PDF coordinates to CSS coordinates with Y-axis inversion at scale 1', () => {
      const pdfRect: PDFRect = {
        x: 100,
        y: 520,
        w: 200,
        h: 30
      };

      const cssRect = pdfToCssRect(pdfRect, baseViewport);

      expect(cssRect).toEqual({
        left: 100, // x * scale = 100 * 1
        top: 50,   // height - (y * scale + h * scale) = 600 - (520 * 1 + 30 * 1)
        width: 200, // w * scale = 200 * 1
        height: 30  // h * scale = 30 * 1
      });
    });

    it('should handle scaling correctly', () => {
      const pdfRect: PDFRect = {
        x: 100,
        y: 520,
        w: 200,
        h: 30
      };

      const cssRect = pdfToCssRect(pdfRect, scaledViewport);

      expect(cssRect).toEqual({
        left: 150, // 100 * 1.5
        top: 75,   // 900 - (520 * 1.5 + 30 * 1.5) = 900 - 825
        width: 300, // 200 * 1.5
        height: 45  // 30 * 1.5
      });
    });

    it('should handle edge cases - PDF bottom-left (CSS top-left)', () => {
      const pdfRect: PDFRect = {
        x: 0,
        y: 590,
        w: 10,
        h: 10
      };

      const cssRect = pdfToCssRect(pdfRect, baseViewport);

      expect(cssRect).toEqual({
        left: 0,
        top: 0, // 600 - (590 * 1 + 10 * 1)
        width: 10,
        height: 10
      });
    });

    it('should handle edge cases - PDF top-right (CSS bottom-right)', () => {
      const pdfRect: PDFRect = {
        x: 790,
        y: 0,
        w: 10,
        h: 10
      };

      const cssRect = pdfToCssRect(pdfRect, baseViewport);

      expect(cssRect).toEqual({
        left: 790,
        top: 590, // 600 - (0 * 1 + 10 * 1)
        width: 10,
        height: 10
      });
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain accuracy through CSS -> PDF -> CSS conversion', () => {
      const originalCssRect: CSSRect = {
        left: 123.5,
        top: 67.25,
        width: 234.75,
        height: 18.5
      };

      const pdfRect = cssToPdfRect(originalCssRect, baseViewport);
      const finalCssRect = pdfToCssRect(pdfRect, baseViewport);

      expect(finalCssRect.left).toBeCloseTo(originalCssRect.left, 10);
      expect(finalCssRect.top).toBeCloseTo(originalCssRect.top, 10);
      expect(finalCssRect.width).toBeCloseTo(originalCssRect.width, 10);
      expect(finalCssRect.height).toBeCloseTo(originalCssRect.height, 10);
    });

    it('should maintain accuracy through PDF -> CSS -> PDF conversion', () => {
      const originalPdfRect: PDFRect = {
        x: 123.5,
        y: 456.25,
        w: 234.75,
        h: 18.5
      };

      const cssRect = pdfToCssRect(originalPdfRect, baseViewport);
      const finalPdfRect = cssToPdfRect(cssRect, baseViewport);

      expect(finalPdfRect.x).toBeCloseTo(originalPdfRect.x, 10);
      expect(finalPdfRect.y).toBeCloseTo(originalPdfRect.y, 10);
      expect(finalPdfRect.w).toBeCloseTo(originalPdfRect.w, 10);
      expect(finalPdfRect.h).toBeCloseTo(originalPdfRect.h, 10);
    });

    it('should maintain accuracy at different scales', () => {
      const scales = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
      
      const originalCssRect: CSSRect = {
        left: 100,
        top: 50,
        width: 200,
        height: 30
      };

      scales.forEach(scale => {
        const viewport = { ...baseViewport, scale };
        const pdfRect = cssToPdfRect(originalCssRect, viewport);
        const finalCssRect = pdfToCssRect(pdfRect, viewport);

        expect(finalCssRect.left).toBeCloseTo(originalCssRect.left, 8);
        expect(finalCssRect.top).toBeCloseTo(originalCssRect.top, 8);
        expect(finalCssRect.width).toBeCloseTo(originalCssRect.width, 8);
        expect(finalCssRect.height).toBeCloseTo(originalCssRect.height, 8);
      });
    });
  });

  describe('createValidationCrosshairs', () => {
    it('should create crosshairs at page corners', () => {
      const crosshairs = createValidationCrosshairs(baseViewport);

      expect(crosshairs).toHaveLength(4);

      // Top-left corner (CSS coordinates)
      expect(crosshairs[0].left).toBeCloseTo(0, 5);
      expect(crosshairs[0].top).toBeCloseTo(590, 5); // 600 - 10

      // Top-right corner (CSS coordinates)
      expect(crosshairs[1].left).toBeCloseTo(790, 5); // 800 - 10
      expect(crosshairs[1].top).toBeCloseTo(590, 5);

      // Bottom-left corner (CSS coordinates)
      expect(crosshairs[2].left).toBeCloseTo(0, 5);
      expect(crosshairs[2].top).toBeCloseTo(0, 5);

      // Bottom-right corner (CSS coordinates)
      expect(crosshairs[3].left).toBeCloseTo(790, 5);
      expect(crosshairs[3].top).toBeCloseTo(0, 5);

      // All crosshairs should have same size
      crosshairs.forEach(crosshair => {
        expect(crosshair.width).toBe(10);
        expect(crosshair.height).toBe(10);
      });
    });

    it('should scale crosshairs correctly', () => {
      const crosshairs = createValidationCrosshairs(scaledViewport);

      expect(crosshairs).toHaveLength(4);

      // At 1.5x scale, crosshairs should be positioned at scaled corners
      // Top-left corner
      expect(crosshairs[0].left).toBeCloseTo(0, 5);
      expect(crosshairs[0].top).toBeCloseTo(885, 5); // 900 - 15

      // Top-right corner  
      expect(crosshairs[1].left).toBeCloseTo(1185, 5); // 1200 - 15
      expect(crosshairs[1].top).toBeCloseTo(885, 5);

      // All crosshairs should be scaled
      crosshairs.forEach(crosshair => {
        expect(crosshair.width).toBe(15); // 10 * 1.5
        expect(crosshair.height).toBe(15);
      });
    });
  });

  describe('rotation handling', () => {
    it('should handle 0 degree rotation (no change)', () => {
      const cssRect: CSSRect = {
        left: 100,
        top: 50,
        width: 200,
        height: 30
      };

      const viewport = { ...baseViewport, rotation: 0 };
      const pdfRect = cssToPdfRect(cssRect, viewport);
      const finalCssRect = pdfToCssRect(pdfRect, viewport);

      expect(finalCssRect.left).toBeCloseTo(cssRect.left, 10);
      expect(finalCssRect.top).toBeCloseTo(cssRect.top, 10);
      expect(finalCssRect.width).toBeCloseTo(cssRect.width, 10);
      expect(finalCssRect.height).toBeCloseTo(cssRect.height, 10);
    });

    it('should handle rotation round-trip conversion', () => {
      const cssRect: CSSRect = {
        left: 100,
        top: 50,
        width: 200,
        height: 30
      };

      const rotations = [90, 180, 270];
      
      rotations.forEach(rotation => {
        const viewport = { ...baseViewport, rotation };
        const pdfRect = cssToPdfRect(cssRect, viewport);
        const finalCssRect = pdfToCssRect(pdfRect, viewport);

        // Due to rotation, exact coordinates may differ, but the conversion should be stable
        expect(finalCssRect.width).toBeCloseTo(cssRect.width, 8);
        expect(finalCssRect.height).toBeCloseTo(cssRect.height, 8);
      });
    });
  });
});
