// PDFViewer component: displays PDF pages with navigation, zoom, and thumbnail sidebar
import React, { useCallback, useEffect, useRef, useState } from 'react';
import pdfService from '../../services/pdfService';
import './PDFViewer.css';

import SearchBar from '../SearchBar/SearchBar';
import TextLayer from '../TextLayer/TextLayer';

interface PDFViewerProps {
  file: File;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // 🔥 SINGLETON FIX: Store document in component state
  const [error, setError] = useState<string | null>(null); // 🔥 ERROR HANDLING: Add error state
  const [isLoading, setIsLoading] = useState(false); // 🔥 LOADING STATES: Add loading indicator
  const [isRendering, setIsRendering] = useState(false); // 🔥 LOADING STATES: Add rendering indicator

  const loadDocument = useCallback(async () => {
    try {
      const pdf = await pdfService.loadDocument(file);
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      setCurrentPage(1);
      setIsDocumentLoaded(true);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsDocumentLoaded(false);
    } finally {
      setIsLoading(false);
    }

  }, [file]);

  const initiateLoad = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setIsDocumentLoaded(false);
    void loadDocument();
  }, [loadDocument]);

  // Load document on file change
  useEffect(() => {
    initiateLoad();
  }, [initiateLoad]);

  const handleRetry = () => {
    initiateLoad();
  };

  // Render page when currentPage or scale changes - only after document is loaded
  useEffect(() => {
    if (!isDocumentLoaded || !pdfDoc) return;

    let cancelled = false;
    let renderTask: any | null = null;

    async function render() {
      try {
        setIsRendering(true);
        const { canvas: renderedCanvas, renderTask: task } = await pdfService.renderPage(pdfDoc, currentPage, scale);
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

        const targetCanvas = canvasRef.current;
        if (!targetCanvas) return;
        const context = targetCanvas.getContext('2d');
        if (!context) return;

        // Copy the HiDPI-aware dimensions from the rendered canvas
        targetCanvas.style.width = renderedCanvas.style.width;
        targetCanvas.style.height = renderedCanvas.style.height;
        targetCanvas.width = renderedCanvas.width;
        targetCanvas.height = renderedCanvas.height;

        context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        context.drawImage(renderedCanvas, 0, 0);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('Failed to render page:', err);
        setError(`Failed to render page ${currentPage}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
      if (renderTask && typeof renderTask.cancel === 'function') {
        renderTask.cancel();
      }
    };
  }, [currentPage, scale, isDocumentLoaded, pdfDoc]);

  const goPrev = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const goNext = () => { if (currentPage < pageCount) setCurrentPage(currentPage + 1); };
  const zoomIn = () => setScale(scale + 0.25);
  const zoomOut = () => setScale(Math.max(0.25, scale - 0.25));
  const fitToWidth = () => setScale(1.0);
  const fitToPage = () => setScale(0.75);

  if (error) {
    return (
      <div className="pdf-container">
        <div className="pdf-error">
          <h3>Error Loading PDF</h3>
          <p>{error}</p>
          <button onClick={handleRetry}>Reload Document</button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pdf-container">
        <div className="pdf-loading">
          <h3>Loading PDF...</h3>
          <p>Please wait while the document is being processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-container">
      <nav className="pdf-sidebar">
        <ul className="pdf-thumbnails">
          {isDocumentLoaded && pageCount > 0 ? (
            Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
              <li key={page}>
                <button
                  className={page === currentPage ? 'active' : ''}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              </li>
            ))
          ) : (
            <li><p>No pages available</p></li>
          )}
        </ul>
      </nav>
      <div className="pdf-main">
        {/* Search bar for text */}
        <SearchBar />
        <div className="controls">
          <button onClick={goPrev} disabled={currentPage <= 1}>Previous</button>
          <span>{currentPage} / {pageCount}</span>
          <button onClick={goNext} disabled={currentPage >= pageCount}>Next</button>
          <button onClick={zoomOut}>-</button>
          <button onClick={zoomIn}>+</button>
          <button onClick={fitToWidth}>Fit Width</button>
          <button onClick={fitToPage}>Fit Page</button>
        </div>
        <div className="viewer-container">
          {isRendering && (
            <div className="rendering-overlay"><p>Rendering page...</p></div>
          )}
          <div className="page">
            <canvas ref={canvasRef} className="pdf-canvas"></canvas>
            {pdfDoc && (
              <TextLayer pdfDoc={pdfDoc} pageNum={currentPage} scale={scale} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
