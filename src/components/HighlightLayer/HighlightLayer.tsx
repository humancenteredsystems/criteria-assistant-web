import React, { useEffect } from 'react';
import { searchController, Viewport } from '../../modules';
import './HighlightLayer.css';

interface HighlightLayerProps {
  pageNum: number;
  viewport: Viewport;
  highlightLayerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Clean HighlightLayer component using the refactored modules
 * Simply calls the renderer to paint highlights from stored PDF-space rectangles
 */
const HighlightLayer: React.FC<HighlightLayerProps> = ({
  pageNum,
  viewport,
  highlightLayerRef
}) => {
  // Re-render highlights when viewport changes (zoom/rotation)
  useEffect(() => {
    if (highlightLayerRef.current) {
      searchController.renderPageHighlights(
        pageNum,
        viewport,
        highlightLayerRef.current
      );
    }
  }, [pageNum, viewport, highlightLayerRef]);

  return null; // Highlights are rendered directly into the DOM element
};

export default HighlightLayer;
