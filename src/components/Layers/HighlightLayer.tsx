import React from 'react';
import useTextStore from '../../store/textStore';

type Props = { 
  textDivs: HTMLElement[]; 
  pageNum: number;
  textLayerRef: React.RefObject<HTMLDivElement | null>;
  hlLayerRef: React.RefObject<HTMLDivElement | null>;
};

const HighlightLayer: React.FC<Props> = ({ textDivs, pageNum, textLayerRef, hlLayerRef }) => {
  const { searchTerm, matchDivIndicesByPage, currentMatchIndex } = useTextStore();
  const indices = matchDivIndicesByPage[pageNum] ?? [];

  // Render highlights directly into the highlight layer element
  React.useEffect(() => {
    const hlLayerEl = hlLayerRef.current;
    const textLayerEl = textLayerRef.current;
    
    if (!hlLayerEl || !textLayerEl) return;
    
    // Clear existing highlights
    hlLayerEl.innerHTML = '';
    
    if (!searchTerm.trim() || indices.length === 0 || textDivs.length === 0) return;

    // Compute highlight rectangles using the same page's text layer
    const base = textLayerEl.getBoundingClientRect();
    const rects = indices.map(i => {
      const textDiv = textDivs[i];
      const r = textDiv.getBoundingClientRect();
      return { 
        left: r.left - base.left, 
        top: r.top - base.top, 
        width: r.width, 
        height: r.height,
        index: i
      };
    });

    // Render the boxes into that page's hlLayerEl
    rects.forEach((rect, k) => {
      const isActive = k === currentMatchIndex;
      const div = document.createElement('div');
      div.className = isActive ? 'highlight active' : 'highlight';
      Object.assign(div.style, {
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        background: 'rgba(255, 235, 59, 0.45)',
        outline: isActive ? '2px solid #f57c00' : 'none',
        pointerEvents: 'none',
      });
      hlLayerEl.appendChild(div);
    });
  }, [textDivs, pageNum, searchTerm, indices, currentMatchIndex, textLayerRef, hlLayerRef]);

  return null; // Highlights are rendered directly into the DOM element
};

export default HighlightLayer;
