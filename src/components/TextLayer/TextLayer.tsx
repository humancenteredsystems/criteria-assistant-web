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
  const { searchTerm, currentMatchIndex, setPageMatches, setCurrentPage } = useTextStore();

  // Render text layer using PDF.js API when page or scale changes
  useEffect(() => {
    if (!pdfDoc) return;
    const el = containerRef.current!;
    const run = async () => {
      try {
        const divs = await pdfService.renderTextLayer(pdfDoc, pageNum, scale, el);
        setTextDivs(divs);
      } catch (e) {
        console.error('Failed to render text layer:', e);
        setTextDivs([]);
      }
    };
    run();
  }, [pdfDoc, pageNum, scale]);

  // compute matches whenever term, page, scale, or textDivs change
  useEffect(() => {
    // setCurrentPage must always run
    setCurrentPage(pageNum);

    const norm = (s: string) => s.normalize('NFKC').toLowerCase();
    const term = norm(searchTerm.trim());
    const idx = term
      ? textDivs.map((el, i) => (norm(el.textContent || '').includes(term) ? i : -1))
               .filter(i => i >= 0)
      : [];
    setPageMatches(pageNum, idx);
  }, [textDivs, searchTerm, pageNum, scale, setPageMatches, setCurrentPage]);

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
