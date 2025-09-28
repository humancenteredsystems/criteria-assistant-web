import React, { useEffect, useState } from 'react';
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

  // Extract text items using direct coordinate approach
  useEffect(() => {
    if (!pdfDoc || !viewport.originalViewport) return;
    
    let cancelled = false;
    setIsLoading(true);

    const extractTextItems = async () => {
      try {
        console.log(`TextLayer: Extracting text for page ${pageNum} using direct positioning`);
        
        const items = await pdfService.extractTextForDirectRendering(
          pdfDoc,
          pageNum,
          viewport.originalViewport!
        );
        
        if (cancelled) return;
        
        setTextItems(items);
        console.log(`TextLayer: Extracted ${items.length} text items for page ${pageNum}`);
        
        // Run alignment validation
        if (!(window as any).disableTextValidation && textLayerRef.current) {
          setTimeout(() => {
            if (textLayerRef.current && !cancelled) {
              quickValidation(textLayerRef.current, viewport, pageNum);
            }
          }, 100);
        }
        
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
  }, [pdfDoc, pageNum, viewport.originalViewport, textLayerRef]);

  // Set up container dimensions and scaling
  useEffect(() => {
    if (!textLayerRef.current || !viewport.originalViewport) return;
    
    const container = textLayerRef.current;
    
    // Set container to match viewport dimensions
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = `${viewport.originalViewport.width}px`;
    container.style.height = `${viewport.originalViewport.height}px`;
    
    // Apply scaling at container level (like old approach)
    container.style.transform = `scale(${viewport.scale})`;
    container.style.transformOrigin = '0 0';
    
    console.log(`TextLayer: Set container dimensions ${viewport.originalViewport.width}x${viewport.originalViewport.height} with scale ${viewport.scale}`);
  }, [viewport, textLayerRef]);

  // Process search when text items are ready
  useEffect(() => {
    if (!textLayerRef.current || !highlightLayerRef.current || textItems.length === 0) return;
    
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
    }, 50);
    
    return () => clearTimeout(timeoutId);
    
  }, [pageNum, viewport, textLayerRef, highlightLayerRef, textItems]);

  // Subscribe to search controller changes
  useEffect(() => {
    const unsubscribe = searchController.subscribe((stats) => {
      if (!textLayerRef.current || !highlightLayerRef.current || textItems.length === 0) return;
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
      }, 50);
    });
    
    return unsubscribe;
  }, [pageNum, viewport, textLayerRef, highlightLayerRef, textItems]);

  // Render text items using direct positioning (like old approach)
  const renderTextItems = () => {
    if (isLoading || textItems.length === 0) {
      return null;
    }

    return textItems.map((item, idx) => (
      <span
        key={`${idx}-${item.x}-${item.y}`}
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
  };

  return (
    <>
      {renderTextItems()}
      <HighlightLayer
        pageNum={pageNum}
        viewport={viewport}
        highlightLayerRef={highlightLayerRef}
      />
    </>
  );
};

export default TextLayer;
