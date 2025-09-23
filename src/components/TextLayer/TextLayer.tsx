import React, { useEffect } from 'react';
import { searchController, Viewport } from '../../modules';
import pdfService from '../../services/pdfService';
import HighlightLayer from '../HighlightLayer/HighlightLayer';

interface TextLayerProps {
  pdfDoc: any;
  pageNum: number;
  viewport: Viewport;
  textLayerRef: React.RefObject<HTMLDivElement | null>;
  highlightLayerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Clean TextLayer component using the refactored modules
 * Renders text layer and triggers search processing through searchController
 */
const TextLayer: React.FC<TextLayerProps> = ({
  pdfDoc,
  pageNum,
  viewport,
  textLayerRef,
  highlightLayerRef
}) => {
  // Render text layer with PDF.js
  useEffect(() => {
    if (!pdfDoc || !textLayerRef.current) return;
    
    let cancelled = false;
    let renderTask: any = null;

    const renderTextLayer = async () => {
      const container = textLayerRef.current!;
      
      try {
        const { renderTask: task } = await pdfService.renderTextLayer(
          pdfDoc,
          pageNum,
          viewport.scale,
          container
        );
        renderTask = task;
        
        await task.promise;
        
        if (cancelled) return;
        
        console.log(`TextLayer: Rendered text layer for page ${pageNum}`);
        
      } catch (error) {
        if (!cancelled) {
          console.error(`TextLayer: Failed to render text layer for page ${pageNum}:`, error);
        }
      }
    };

    renderTextLayer();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pdfDoc, pageNum, viewport.scale, textLayerRef]);

  // Process search when text layer is ready and search controller has a query
  useEffect(() => {
    if (!textLayerRef.current || !highlightLayerRef.current) return;
    
    const stats = searchController.getSearchStats();
    if (!stats.query.trim()) return;
    
    // Process search for this page
    searchController.processPageSearch(
      pageNum,
      stats.query,
      textLayerRef.current,
      viewport,
      highlightLayerRef.current
    );
    
  }, [pageNum, viewport, textLayerRef, highlightLayerRef]);

  return (
    <HighlightLayer
      pageNum={pageNum}
      viewport={viewport}
      highlightLayerRef={highlightLayerRef}
    />
  );
};

export default TextLayer;
