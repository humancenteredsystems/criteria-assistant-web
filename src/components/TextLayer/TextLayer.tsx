import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { searchController, Viewport } from '../../modules';
import { quickValidation } from '../../modules/diagnostics';
import pdfService from '../../services/pdfService';
import HighlightLayer from '../HighlightLayer/HighlightLayer';
import { TextItem } from '../../types/viewport';
import './TextLayer.css';

interface TextLayerProps {
  pdfDoc: any;
  pageNum: number;
  viewport: Viewport;
  textLayerRef: React.RefObject<HTMLDivElement | null>;
  highlightLayerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hybrid TextLayer component combining the best of both approaches:
 * - Uses PDF.js for text extraction (current approach)
 * - Uses direct positioning for rendering (old approach)
 * - Container-level scaling for predictable behavior
 */
const TextLayer: React.FC<TextLayerProps> = ({
  pdfDoc,
  pageNum,
  viewport,
  textLayerRef,
  highlightLayerRef
}) => {
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Memoize text items to prevent infinite loops
  const memoizedTextItems = useMemo(
    () => textItems,
    [textItems.length, pageNum] // Stable comparison
  );

  // Extract text items using direct coordinate approach
  useEffect(() => {
    if (!pdfDoc || !viewport.originalViewport) return;
    
    let cancelled = false;
    setIsLoading(true);
    setIsReady(false);

    const extractTextItems = async () => {
      try {
        console.log(`TextLayer: Extracting text for page ${pageNum} using Portal approach`);
        
        const items = await pdfService.extractTextForDirectRendering(
          pdfDoc,
          pageNum,
          viewport.originalViewport!
        );
        
        if (cancelled) return;
        
        setTextItems(items);
        console.log(`TextLayer: Extracted ${items.length} text items for page ${pageNum}`);
        
        // Mark as ready for search processing
        setTimeout(() => {
          if (!cancelled) {
            setIsReady(true);
          }
        }, 100);
        
      } catch (error) {
        if (!cancelled) {
          console.error(`TextLayer: Failed to extract text for page ${pageNum}:`, error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    extractTextItems();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum, viewport.originalViewport?.scale]); // Stable dependencies

  // Set up container dimensions (NO scaling - coordinates are pre-scaled)
  useEffect(() => {
    if (!textLayerRef.current || !viewport.originalViewport) return;
    
    const container = textLayerRef.current;
    
    // Set container to match current viewport dimensions (already scaled)
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    
    // NO container scaling - coordinates are already viewport-scaled
    container.style.transform = 'none';
    container.style.transformOrigin = '0 0';
    
    console.log(`TextLayer: Set container dimensions ${viewport.width}x${viewport.height} (no scaling)`);
  }, [viewport, textLayerRef]);

  // Process search when text items are ready and stable
  useEffect(() => {
    if (!isReady || !textLayerRef.current || !highlightLayerRef.current) return;
    
    const stats = searchController.getSearchStats();
    if (!stats.query.trim()) return;
    
    console.log(`TextLayer: Processing search for page ${pageNum}, query: "${stats.query}"`);
    
    const timeoutId = setTimeout(() => {
      if (textLayerRef.current && highlightLayerRef.current) {
        searchController.processPageSearch(
          pageNum,
          stats.query,
          textLayerRef.current,
          viewport,
          highlightLayerRef.current
        );
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
    
  }, [pageNum, viewport, textLayerRef, highlightLayerRef, isReady]); // Use isReady instead of textItems

  // Subscribe to search controller changes with stable dependencies
  useEffect(() => {
    if (!isReady) return;
    
    const unsubscribe = searchController.subscribe((stats) => {
      if (!textLayerRef.current || !highlightLayerRef.current) return;
      if (!stats.query.trim()) return;
      
      console.log(`TextLayer: Search changed for page ${pageNum}, query: "${stats.query}"`);
      
      setTimeout(() => {
        if (textLayerRef.current && highlightLayerRef.current) {
          searchController.processPageSearch(
            pageNum,
            stats.query,
            textLayerRef.current,
            viewport,
            highlightLayerRef.current
          );
        }
      }, 100);
    });
    
    return unsubscribe;
  }, [pageNum, viewport, textLayerRef, highlightLayerRef, isReady]); // Stable dependencies

  // Run validation when ready
  useEffect(() => {
    if (isReady && textLayerRef.current && !(window as any).disableTextValidation) {
      setTimeout(() => {
        if (textLayerRef.current) {
          quickValidation(textLayerRef.current, viewport, pageNum);
        }
      }, 200);
    }
  }, [isReady, textLayerRef, viewport, pageNum]);

  // Create Portal content for text items
  const createTextPortal = () => {
    if (!textLayerRef.current || isLoading || memoizedTextItems.length === 0) {
      return null;
    }

    const textSpans = memoizedTextItems.map((item, idx) => (
      <span
        key={`${pageNum}-${idx}`} // Stable key with page prefix
        className="text-item"
        style={{
          position: 'absolute',
          left: `${item.x}px`,
          top: `${item.y}px`,
          color: 'transparent',
          pointerEvents: 'none',
          userSelect: 'none',
          fontSize: `${item.height}px`,
          lineHeight: '1',
          whiteSpace: 'nowrap'
        }}
      >
        {item.str}
      </span>
    ));

    return createPortal(textSpans, textLayerRef.current);
  };

  return (
    <>
      {createTextPortal()}
      <HighlightLayer
        pageNum={pageNum}
        viewport={viewport}
        highlightLayerRef={highlightLayerRef}
      />
    </>
  );
};

export default TextLayer;
