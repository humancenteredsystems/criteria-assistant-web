// Viewport type definition for the refactored architecture
// This replaces the PageViewport interface and standardizes viewport handling

export interface Viewport {
  width: number;    // CSS pixels at current scale
  height: number;   // CSS pixels at current scale  
  scale: number;    // zoom factor (1.0 = 100%)
  rotation: 0 | 90 | 180 | 270;  // rotation in degrees
}

// Rectangle types for the unified data model
export type PdfRect = [number, number, number, number]; // [x, y, w, h] in PDF user units
export type CssRect = [number, number, number, number]; // [left, top, width, height] in CSS pixels

// Match rectangle with global ordering for navigation
export interface MatchRect {
  page: number;
  termId: string;
  order: number;
  bboxPdf: PdfRect;
  sourceDivId?: string;
}

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Token and span types for text processing
export interface Token {
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface MatchSpan {
  startIndex: number;
  endIndex: number;
  termId: string;
}
