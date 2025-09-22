import React, { useEffect, useState } from 'react';
import useTextStore from '../../store/textStore';
import pdfService from '../../services/pdfService';
import HighlightLayer from '../Layers/HighlightLayer';
import { PageViewport, PDFRect, cssToPdfRect } from '../../utils/coordinateProjection';

interface TextLayerProps {
  pdfDoc: any;
  pageNum: number;
  viewport: PageViewport;
  textLayerRef: React.RefObject<HTMLDivElement | null>;
  hlLayerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Renders transparent text geometry with PDF.js renderTextLayer,
 * then computes tight PDF-space rectangles for each substring match.
 */
const TextLayer: React.FC<TextLayerProps> = ({
  pdfDoc,
  pageNum,
  viewport,
  textLayerRef,
  hlLayerRef
}) => {
  const [textDivs, setTextDivs] = useState<HTMLElement[]>([]);
  const { searchTerm, setPdfRects, setCurrentPage } = useTextStore();

  // Render text layer and cache text DIVs
  useEffect(() => {
    if (!pdfDoc || !textLayerRef.current) return;
    let cancelled = false;
    let task: any = null;

    const run = async () => {
      const container = textLayerRef.current!;
      const { textDivs: divs, renderTask } = await pdfService.renderTextLayer(
        pdfDoc,
        pageNum,
        viewport.scale,
        container
      );
      task = renderTask;
      try { await task.promise; } catch {}
      if (cancelled) return;
      setTextDivs(divs);
      // Cache initial rects (full div) if desired, but substring handler below will overwrite
      setCurrentPage(pageNum);
    };
    run();

    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [pdfDoc, pageNum, viewport.scale]);

  // Compute tight PDF-space rects for each match substring
  useEffect(() => {
    if (!textLayerRef.current) return;
    const container = textLayerRef.current;
    const parentRect = container.getBoundingClientRect();
    const term = searchTerm.trim().normalize('NFKC');
    if (!term) {
      setPdfRects(pageNum, []);
      return;
    }
    const rectsAll: PDFRect[] = [];
    textDivs.forEach(div => {
      const text = (div.textContent || '').normalize('NFKC');
      const idxLower = text.toLowerCase();
      const termLower = term.toLowerCase();
      let start = idxLower.indexOf(termLower);
      while (start >= 0) {
        const end = start + termLower.length;
        const range = document.createRange();
        const node = div.firstChild;
        if (node) {
          range.setStart(node, start);
          range.setEnd(node, end);
          const clientRects = Array.from(range.getClientRects());
          clientRects.forEach(cr => {
            const cssRect = {
              left: cr.left - parentRect.left,
              top: cr.top - parentRect.top,
              width: cr.width,
              height: cr.height
            };
            const pdfRect = cssToPdfRect(cssRect, viewport);
            rectsAll.push(pdfRect);
          });
        }
        start = idxLower.indexOf(termLower, end);
      }
    });
    setPdfRects(pageNum, rectsAll);
  }, [textDivs, searchTerm, pageNum, viewport]);

  return (
    <HighlightLayer
      textDivs={textDivs}
      pageNum={pageNum}
      viewport={viewport}
      textLayerRef={textLayerRef}
      hlLayerRef={hlLayerRef}
    />
  );
};

export default TextLayer;
