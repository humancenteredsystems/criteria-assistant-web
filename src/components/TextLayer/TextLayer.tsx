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
    if (!pdfDoc || !containerRef.current) return;

    let cancelled = false;
    let renderTask: any | null = null;

    const run = async () => {
      try {
        const container = containerRef.current;
        if (!container) return;

        const { textDivs: divs, renderTask: task } = await pdfService.renderTextLayer(
          pdfDoc,
          pageNum,
          scale,
          container
        );
        renderTask = task;

        try {
          await renderTask.promise;
        } catch (taskError: any) {
          if (taskError?.name === 'RenderingCancelledException') {
            return;
          }
          throw taskError;
        }

        if (cancelled) return;

        setTextDivs([...divs]);
      } catch (e: any) {
        if (cancelled) return;
        if (e?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Failed to render text layer:', e);
        setTextDivs([]);
      }
    };
    run();

    return () => {
      cancelled = true;
      if (renderTask && typeof renderTask.cancel === 'function') {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale]);

  // compute matches whenever term, page, scale, or textDivs change
  useEffect(() => {
    // setCurrentPage must always run
    setCurrentPage(pageNum);

    // Only compute matches if we have textDivs populated
    if (textDivs.length === 0) {
      setPageMatches(pageNum, []);
      return;
    }

    const norm = (s: string) => s.normalize('NFKC').toLowerCase();
    const term = norm(searchTerm.trim());
    
    if (!term) {
      setPageMatches(pageNum, []);
      return;
    }

    const idx = textDivs
      .map((el, i) => (norm(el.textContent || '').includes(term) ? i : -1))
      .filter(i => i >= 0);
    
    // Debug logging
    console.log(`TextLayer: Page ${pageNum}, Term: "${term}", TextDivs: ${textDivs.length}, Matches: ${idx.length}`);
    
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
