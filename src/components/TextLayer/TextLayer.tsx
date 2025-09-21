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
  const { searchTerm, currentMatchIndex, setPageMatches } = useTextStore();

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

  // compute matches whenever term, page, scale, or textDivs change
  useEffect(() => {
    if (!containerRef.current) return;
    // expose current page for nav (keeps SearchBar simple)
    (window as any).__currentPdfPage = pageNum;

    const term = searchTerm.trim().toLowerCase();
    if (!term || textDivs.length === 0) {
      setPageMatches(pageNum, []);
      return;
    }
    const indices: number[] = [];
    for (let i = 0; i < textDivs.length; i++) {
      const t = (textDivs[i].textContent || '').toLowerCase();
      if (t.includes(term)) indices.push(i);
    }
    setPageMatches(pageNum, indices);
  }, [searchTerm, pageNum, scale, textDivs, setPageMatches]);

  // Auto-scroll active match into view
  useEffect(() => {
    const { matchDivIndicesByPage } = useTextStore.getState();
    const indices = matchDivIndicesByPage[pageNum] ?? [];
    
    if (!searchTerm || currentMatchIndex < 0 || indices.length === 0) return;

    const activeIndex = indices[currentMatchIndex];
    const activeDiv = textDivs[activeIndex];
    if (activeDiv) {
      activeDiv.scrollIntoView({ block: 'center', inline: 'center' });
    }
  }, [currentMatchIndex, searchTerm, textDivs, pageNum]);

  return (
    <>
      <div ref={containerRef} className="text-layer" />
      <HighlightLayer
        textDivs={textDivs}
        pageNum={pageNum}
      />
    </>
  );
};

export default TextLayer;
