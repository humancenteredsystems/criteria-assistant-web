import React from 'react';
import useTextStore from '../../store/textStore';
import { pdfToCssRect } from '../../utils/coordinateProjection';

type Props = { 
  textDivs: HTMLElement[]; 
  pageNum: number;
  scale: number;
  textLayerRef: React.RefObject<HTMLDivElement | null>;
  hlLayerRef: React.RefObject<HTMLDivElement | null>;
};

const HighlightLayer: React.FC<Props> = ({ textDivs, pageNum, scale, textLayerRef, hlLayerRef }) => {
  const { searchTerm, matchDivIndicesByPage, currentMatchIndex, pdfRectsByPage } = useTextStore();
  const raw = matchDivIndicesByPage[pageNum] ?? [];
  const indices = React.useMemo(() => raw.slice(), [raw, pageNum]);
  const pdfRects = pdfRectsByPage[pageNum] ?? [];

  // Render highlights using PDF-space projection (no DOM reading)
  React.useEffect(() => {
    const hlLayerEl = hlLayerRef.current;
    
    if (!hlLayerEl) return;
    
    // Clear existing highlights
    hlLayerEl.innerHTML = '';
    
    if (!searchTerm.trim() || indices.length === 0 || pdfRects.length === 0) return;

    // Project PDF-space rectangles to CSS pixels using current scale
    const viewport = { width: 0, height: 0, scale }; // width/height not needed for projection
    
    indices.forEach((divIndex, k) => {
      if (divIndex >= pdfRects.length) return;
      
      const pdfRect = pdfRects[divIndex];
      const cssRect = pdfToCssRect(pdfRect, viewport);
      
      const isActive = k === currentMatchIndex;
      const div = document.createElement('div');
      div.className = isActive ? 'highlight active' : 'highlight';
      Object.assign(div.style, {
        position: 'absolute',
        left: `${cssRect.left}px`,
        top: `${cssRect.top}px`,
        width: `${cssRect.width}px`,
        height: `${cssRect.height}px`,
        background: 'rgba(255, 235, 59, 0.45)',
        outline: isActive ? '2px solid #f57c00' : 'none',
        pointerEvents: 'none',
      });
      hlLayerEl.appendChild(div);
    });
  }, [pageNum, scale, searchTerm, indices, currentMatchIndex, pdfRects]);

  return null; // Highlights are rendered directly into the DOM element
};

export default HighlightLayer;
