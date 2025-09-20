import React, { useEffect, useRef, useState } from 'react';
import useTextStore from '../../store/textStore';
import pdfService from '../../services/pdfService';
import HighlightLayer from '../Layers/HighlightLayer';
import './TextLayer.css';

interface TextLayerProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
}

/**
 * Renders transparent text geometry using PDF.js renderTextLayer API for proper alignment.
 * Overlays highlight rectangles for search matches.
 */
const TextLayer: React.FC<TextLayerProps> = ({ pdfDoc, pageNum, scale }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [textDivs, setTextDivs] = useState<HTMLElement[]>([]);
  const { searchTerm, matches, currentMatchIndex } = useTextStore();

  // Render text layer using PDF.js API when page or scale changes
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    const renderText = async () => {
      try {
        const divs = await pdfService.renderTextLayer(pdfDoc, pageNum, scale, containerRef.current!);
        setTextDivs(divs);
      } catch (error) {
        console.error('Failed to render text layer:', error);
        setTextDivs([]);
      }
    };

    renderText();
  }, [pdfDoc, pageNum, scale]);

  // Auto-scroll active match into view
  useEffect(() => {
    if (!searchTerm || currentMatchIndex < 0 || textDivs.length === 0) return;

    const matchingDivs = textDivs.filter(div => {
      const text = div.textContent || '';
      return text.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const activeDiv = matchingDivs[currentMatchIndex];
    if (activeDiv) {
      activeDiv.scrollIntoView({ block: 'center', inline: 'center' });
    }
  }, [currentMatchIndex, searchTerm, textDivs]);

  return (
    <>
      <div ref={containerRef} className="text-layer" />
      <HighlightLayer 
        textDivs={textDivs}
        matches={matches}
        currentMatchIndex={currentMatchIndex}
        searchTerm={searchTerm}
      />
    </>
  );
};

export default TextLayer;
