// Main module exports - unified API for the refactored architecture

// Core types
export type { Viewport, PdfRect, CssRect, MatchRect, Token, MatchSpan } from '../types/viewport';

// Projector - single source of truth for coordinate conversion
export { pdfToCss, cssToPdf, createValidationCrosshairs } from './projector';

// Text processing pipeline
export { tokenize, normalizeText } from './tokenizer';
export { findMatches, findPartialMatches, findWholeWordMatches, mergeMatches } from './matcher';
export { measureSubstrings, measureMultiLineSubstring, extractElementRect, isValidRect } from './geometry';

// Storage and state management
export { matchStore } from './store';
export type { StoreState } from './store';

// Rendering system
export { 
  paintHighlights, 
  clearHighlights, 
  updateLayerDimensions, 
  paintDebugCrosshairs,
  paintHighlightsAsync,
  updateActiveHighlight,
  getVisibleHighlights,
  getMatchScrollRect
} from './renderer';

// Main controller - orchestrates the complete pipeline
export { searchController } from './controller';

// Fallback text layer for PDFs without official text layers
export { 
  createFallbackTextLayer, 
  updateFallbackTextLayer, 
  extractFallbackTextContent,
  validateFallbackPositioning,
  needsFallbackTextLayer
} from './textlayer_fallback';

// Fit modes and viewport calculations
export { 
  calculateFitWidth, 
  calculateFitPage, 
  calculateCustomScale,
  getScalePercentage,
  getPredefinedZoomLevels,
  findClosestZoomLevel,
  validateViewport,
  clampScale,
  calculateCenteredViewport,
  calculateRequiredContainer
} from './fit_modes';

// Diagnostics and performance monitoring
export { 
  validateAlignment,
  createAlignmentValidator,
  PerformanceTracker,
  createPerformanceMonitor,
  logAlignmentDetails,
  performanceTracker
} from './diagnostics';
