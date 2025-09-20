import React from 'react';
import { TextItem } from '../../types/text';

interface HighlightLayerProps {
  textDivs: HTMLElement[];
  matches: TextItem[];
  currentMatchIndex: number;
  searchTerm: string;
}

/**
 * Renders highlight rectangles over search matches using geometry from PDF.js renderTextLayer
 */
const HighlightLayer: React.FC<HighlightLayerProps> = ({ 
  textDivs, 
  matches, 
  currentMatchIndex, 
  searchTerm 
}) => {
  if (!searchTerm || matches.length === 0 || textDivs.length === 0) {
    return null;
  }

  // Find matching text divs and create highlight rectangles
  const highlights = textDivs
    .filter(div => {
      const text = div.textContent || '';
      return text.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .map((div, index) => {
      const rect = div.getBoundingClientRect();
      const container = div.closest('.text-layer');
      const containerRect = container?.getBoundingClientRect();
      
      if (!containerRect) return null;
      
      // Calculate position relative to text layer container
      const left = rect.left - containerRect.left;
      const top = rect.top - containerRect.top;
      
      // Check if this is the active match
      const matchIndex = textDivs
        .slice(0, textDivs.indexOf(div))
        .filter(d => (d.textContent || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .length;
      
      const isActive = matchIndex === currentMatchIndex;
      
      return (
        <div
          key={`highlight-${index}`}
          className={`highlight ${isActive ? 'active' : ''}`}
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            background: 'rgba(255, 235, 59, 0.45)',
            outline: isActive ? '2px solid #f57c00' : 'none',
            pointerEvents: 'none',
            zIndex: 2
          }}
        />
      );
    })
    .filter(Boolean);

  return (
    <div 
      className="highlight-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2
      }}
    >
      {highlights}
    </div>
  );
};

export default HighlightLayer;
