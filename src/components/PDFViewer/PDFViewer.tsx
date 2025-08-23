// PDFViewer component: displays PDF pages with navigation, zoom, and thumbnail sidebar
import React, { useEffect, useRef, useState } from 'react';
import pdfService from '../../services/pdfService';
import './PDFViewer.css';

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

  // Load document on file change
  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true); // 🔥 LOADING STATES: Show loading indicator
        setIsDocumentLoaded(false);
        setError(null); // Clear previous errors
        const pdf = await pdfService.loadDocument(file);
        setPdfDoc(pdf); // Store the document in component state
        setPageCount(pdf.numPages);
        setCurrentPage(1);
        setIsDocumentLoaded(true);
      } catch (err) {
        // 🔥 ERROR HANDLING: Catch PDF loading failures
        console.error('Failed to load PDF:', err);
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsDocumentLoaded(false);
      } finally {
        setIsLoading(false); // 🔥 LOADING STATES: Hide loading indicator
      }
    }
    load();
  }, [file]);

  // Render page when currentPage or scale changes - BUT ONLY after document is loaded
  useEffect(() => {
    if (!isDocumentLoaded || !pdfDoc) return; // 🔥 RACE CONDITION FIX: Wait for document to load
    
    async function render() {
      try {
        setIsRendering(true); // 🔥 LOADING STATES: Show rendering indicator
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rendered = await pdfService.renderPage(pdfDoc, currentPage, scale); // Pass pdfDoc to service
        const context = canvas.getContext('2d')!;
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(rendered, 0, 0);
      } catch (err) {
        // 🔥 ERROR HANDLING: Catch page rendering failures
        console.error('Failed to render page:', err);
        setError(`Failed to render page ${currentPage}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsRendering(false); // 🔥 LOADING STATES: Hide rendering indicator
      }
    }
    render();
  }, [currentPage, scale, isDocumentLoaded, pdfDoc]); // Added pdfDoc dependency

  const goPrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goNext = () => {
    if (currentPage < pageCount) setCurrentPage(currentPage + 1);
  };
  const zoomIn = () => setScale(scale + 0.25);
  const zoomOut = () => setScale(Math.max(0.25, scale - 0.25));
  const fitToWidth = () => setScale(1.0); // Standard fit-to-width scale
  const fitToPage = () => setScale(0.75); // Standard fit-to-page scale

  // 🔥 LOADING STATES: Show error message if there's an error
  if (error) {
    return (
      <div className="pdf-container">
        <div className="pdf-error">
          <h3>Error Loading PDF</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      </div>
    );
  }

  // 🔥 LOADING STATES: Show loading message while document loads
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
          {/* 🔥 STATE INITIALIZATION FIX: Only render thumbnails when document is loaded */}
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
            <li>
              <p>No pages available</p>
            </li>
          )}
        </ul>
      </nav>
      <div className="pdf-main">
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
          {/* 🔥 LOADING STATES: Show rendering indicator */}
          {isRendering && (
            <div className="rendering-overlay">
              <p>Rendering page...</p>
            </div>
          )}
          <canvas ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
