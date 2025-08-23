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

  // Load document on file change
  useEffect(() => {
    async function load() {
      const pdf = await pdfService.loadDocument(file);
      setPageCount(pdf.numPages);
      setCurrentPage(1);
    }
    load();
  }, [file]);

  // Render page when currentPage or scale changes
  useEffect(() => {
    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rendered = await pdfService.renderPage(currentPage, scale);
      const context = canvas.getContext('2d')!;
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(rendered, 0, 0);
    }
    render();
  }, [currentPage, scale]);

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

  return (
    <div className="pdf-container">
      <nav className="pdf-sidebar">
        <ul className="pdf-thumbnails">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map(page => (
            <li key={page}>
              <button
                className={page === currentPage ? 'active' : ''}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            </li>
          ))}
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
          <canvas ref={canvasRef}></canvas>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
