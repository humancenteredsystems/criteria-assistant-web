import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import useTextStore from '../../store/textStore';
import pdfService from '../../services/pdfService';
import HighlightLayer from '../Layers/HighlightLayer';
import './TextLayer.css';

import type { HighlightGeometry } from '../Layers/HighlightLayer';

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
  const textDivsRef = useRef<HTMLElement[]>([]);
  const [textLayerVersion, setTextLayerVersion] = useState(0);
  const [highlights, setHighlights] = useState<HighlightGeometry[]>([]);
  const {
    searchTerm,
    currentMatchIndex,
    matchDivIndicesByPage,
    setPageMatches,
    setCurrentPage,
  } = useTextStore();
  const pageMatchIndices = matchDivIndicesByPage[pageNum] ?? [];

  // Render text layer using PDF.js API when page or scale changes
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    let cancelled = false;
    let renderTask: any | null = null;

    const run = async () => {
      try {
        const divs = await pdfService.renderTextLayer(pdfDoc, pageNum, scale, containerRef.current!);
        textDivsRef.current = divs;
        setTextLayerVersion((v) => v + 1);
      } catch (e) {
        console.error('Failed to render text layer:', e);
        textDivsRef.current = [];
        setTextLayerVersion((v) => v + 1);
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

  useEffect(() => {
    setCurrentPage(pageNum);
  }, [pageNum, setCurrentPage]);

  // compute matches whenever term, page, scale, or rendered text layer changes
  useEffect(() => {
    const norm = (s: string) => s.normalize('NFKC').toLowerCase();
    const term = norm(searchTerm.trim());
    const divs = textDivsRef.current;
    const indices = term
      ? divs
          .map((el, i) => (norm(el.textContent || '').includes(term) ? i : -1))
          .filter((i) => i >= 0)
      : [];
    setPageMatches(pageNum, indices);
  }, [searchTerm, pageNum, scale, setPageMatches, textLayerVersion]);

  // Auto-scroll active match into view
  useEffect(() => {
    const { matchDivIndicesByPage } = useTextStore.getState();
    const indices = matchDivIndicesByPage[pageNum] ?? [];

    if (!searchTerm || currentMatchIndex < 0 || indices.length === 0) return;

    const activeIndex = indices[currentMatchIndex];
    const activeDiv = textDivsRef.current[activeIndex];
    if (activeDiv) {
      activeDiv.scrollIntoView({ block: 'center', inline: 'center' });
    }
  }, [currentMatchIndex, searchTerm, pageNum, textLayerVersion]);

  useLayoutEffect(() => {
    if (!containerRef.current || !searchTerm.trim()) {
      setHighlights([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    if (!pageMatchIndices.length) {
      setHighlights([]);
      return;
    }

    const nextHighlights: HighlightGeometry[] = [];

    pageMatchIndices.forEach((divIndex, order) => {
      const div = textDivsRef.current[divIndex];
      if (!div) return;
      const rect = div.getBoundingClientRect();
      nextHighlights.push({
        id: `hl-${pageNum}-${divIndex}`,
        rect: {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height,
        },
        isActive: order === currentMatchIndex,
      });
    });

    setHighlights(nextHighlights);
  }, [currentMatchIndex, pageMatchIndices, pageNum, searchTerm, textLayerVersion]);

  return (
    <>
      <div ref={containerRef} className="text-layer" />
      <HighlightLayer
        highlights={highlights}
      />
    </>
  );
};

export default TextLayer;
