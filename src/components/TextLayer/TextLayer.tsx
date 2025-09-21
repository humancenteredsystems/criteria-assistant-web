import React, { useEffect, useState } from 'react';
import useTextStore from '../../store/textStore';
import pdfService from '../../services/pdfService';
import HighlightLayer from '../Layers/HighlightLayer';

interface TextLayerProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  textLayerRef: React.RefObject<HTMLDivElement | null>;
  hlLayerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Renders transparent text geometry using PDF.js renderTextLayer API for proper alignment.
 * Overlays highlight rectangles for search matches.
 */
const TextLayer: React.FC<TextLayerProps> = ({ pdfDoc, pageNum, scale, textLayerRef, hlLayerRef }) => {
  const [textDivs, setTextDivs] = useState<HTMLElement[]>([]);
  const { searchTerm, currentMatchIndex, setPageMatches, setCurrentPage, setPdfRects } = useTextStore();

  // Render text layer only when pdfDoc/pageNum/scale change
  useEffect(() => {
    if (!pdfDoc || !textLayerRef.current) return;

    let cancelled = false;
    let renderTask: any | null = null;

    const run = async () => {
      try {
        const container = textLayerRef.current;
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
        
        // Cache PDF-space rectangles after text layer rendering
        // This is done once per page/scale to enable projection-based highlighting
        if (divs.length > 0) {
          try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });
            const pdfRects = pdfService.buildPdfSpaceRects(divs, viewport);
            setPdfRects(pageNum, pdfRects);
            console.log(`TextLayer: Cached ${pdfRects.length} PDF rects for page ${pageNum}`);
          } catch (error) {
            console.error('Failed to cache PDF rects:', error);
          }
        }
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
  }, [pdfDoc, pageNum, scale]); // ❗ remove ref from deps; ref object identity is stable enough here

  // keep current page in store, but write only when it actually changes
  const lastPageRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (lastPageRef.current !== pageNum) {
      setCurrentPage(pageNum);
      lastPageRef.current = pageNum;
    }
  }, [pageNum, setCurrentPage]);

  // compute matches ONLY when textDivs, term, or page change
  useEffect(() => {
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
    
    setPageMatches(pageNum, idx);
  }, [textDivs, searchTerm, pageNum, setPageMatches]);

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
    <HighlightLayer
      textDivs={textDivs}
      pageNum={pageNum}
      scale={scale}
      textLayerRef={textLayerRef}
      hlLayerRef={hlLayerRef}
    />
  );
};

export default TextLayer;
