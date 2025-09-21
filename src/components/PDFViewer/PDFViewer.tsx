// PDFViewer component: displays PDF pages with navigation, zoom, and thumbnail sidebar
import React, { useCallback, useEffect, useRef, useState } from 'react';
import pdfService from '../../services/pdfService';
import './PDFViewer.css';

import SearchBar from '../SearchBar/SearchBar';
import TextLayer from '../TextLayer/TextLayer';
import AlignmentValidator from '../Debug/AlignmentValidator';
import VisualAlignmentValidator from '../Debug/VisualAlignmentValidator';

interface PDFViewerProps {
  file: File;
  overlayOpacity: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file, overlayOpacity }) => {
  const pageElRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const hlLayerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [currentViewport, setCurrentViewport] = useState<{ width: number; height: number; scale: number; rotation?: number } | null>(null);
  const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // 🔥 SINGLETON FIX: Store document in component state
  const [error, setError] = useState<string | null>(null); // 🔥 ERROR HANDLING: Add error state
  const [isLoading, setIsLoading] = useState(false); // 🔥 LOADING STATES: Add loading indicator
  const [isRendering, setIsRendering] = useState(false); // 🔥 LOADING STATES: Add rendering indicator
  const [showAlignmentDebug, setShowAlignmentDebug] = useState(false); // Debug toggle for alignment validation
  const [showVisualValidation, setShowVisualValidation] = useState(false); // Toggle for comprehensive visual validation

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
        
        // Get page and viewport for coordinate system setup
        const page = await pdfDoc.getPage(currentPage);
        const rotation = page.rotate || 0;
        const viewport = page.getViewport({ scale, rotation });
        
        // Lock the page wrapper to the PDF viewport size
        const pageEl = pageElRef.current;
        const canvas = canvasRef.current;
        const textLayerEl = textLayerRef.current;
        const hlLayerEl = hlLayerRef.current;
        
        if (!pageEl || !canvas || !textLayerEl || !hlLayerEl) return;
        
        // Set page wrapper dimensions to match viewport
        pageEl.style.position = 'relative';
        pageEl.style.width = `${viewport.width}px`;
        pageEl.style.height = `${viewport.height}px`;
        
        // Set up canvas with HiDPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        
        // Render canvas
        const context = canvas.getContext('2d');
        if (!context) return;
        
        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0]
        });

        try {
          await renderTask.promise;
        } catch (taskError: any) {
          if (taskError?.name === 'RenderingCancelledException') {
            return;
          }
          throw taskError;
        }

        if (cancelled) return;
        
        // Store the current viewport for use by child components
        setCurrentViewport({
          width: viewport.width,
          height: viewport.height,
          scale: viewport.scale,
          rotation: rotation
        });
        
        // Set up text layer positioning
        textLayerEl.style.position = 'absolute';
        textLayerEl.style.left = '0';
        textLayerEl.style.top = '0';
        textLayerEl.style.width = `${viewport.width}px`;
        textLayerEl.style.height = `${viewport.height}px`;
        
        // Set up highlight layer positioning
        hlLayerEl.style.position = 'absolute';
        hlLayerEl.style.left = '0';
        hlLayerEl.style.top = '0';
        hlLayerEl.style.width = `${viewport.width}px`;
        hlLayerEl.style.height = `${viewport.height}px`;
        
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

  useEffect(() => {
    const textLayerEl = textLayerRef.current;
    const hlLayerEl = hlLayerRef.current;
    const opacityValue = overlayOpacity / 100;

    if (textLayerEl) {
      textLayerEl.style.opacity = `${opacityValue}`;
    }

    if (hlLayerEl) {
      hlLayerEl.style.opacity = `${opacityValue}`;
    }
  }, [overlayOpacity, currentPage, isDocumentLoaded]);

  const goPrev = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const goNext = () => { if (currentPage < pageCount) setCurrentPage(currentPage + 1); };
  const zoomIn = () => setScale(scale + 0.25);
  const zoomOut = () => setScale(Math.max(0.25, scale - 0.25));
  
  const fitToWidth = async () => {
    if (!pdfDoc || !pageElRef.current) return;
    
    try {
      const page = await pdfDoc.getPage(currentPage);
      const baseViewport = page.getViewport({ scale: 1.0, rotation: page.rotate || 0 });
      const containerWidth = pageElRef.current.parentElement?.clientWidth || 800;
      
      // Calculate scale to fit page width to container width (with some padding)
      const padding = 40; // 20px padding on each side
      const availableWidth = containerWidth - padding;
      const fitScale = availableWidth / baseViewport.width;
      
      setScale(Math.max(0.25, Math.min(4.0, fitScale))); // Clamp between 0.25x and 4x
    } catch (error) {
      console.error('Failed to calculate fit-to-width scale:', error);
      setScale(1.0); // Fallback to 1x
    }
  };
  
  const fitToPage = async () => {
    if (!pdfDoc || !pageElRef.current) return;
    
    try {
      const page = await pdfDoc.getPage(currentPage);
      const baseViewport = page.getViewport({ scale: 1.0, rotation: page.rotate || 0 });
      const container = pageElRef.current.parentElement;
      
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calculate scale to fit entire page in container (with padding)
      const padding = 40;
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;
      
      const scaleX = availableWidth / baseViewport.width;
      const scaleY = availableHeight / baseViewport.height;
      const fitScale = Math.min(scaleX, scaleY); // Use smaller scale to fit both dimensions
      
      setScale(Math.max(0.25, Math.min(4.0, fitScale))); // Clamp between 0.25x and 4x
    } catch (error) {
      console.error('Failed to calculate fit-to-page scale:', error);
      setScale(0.75); // Fallback to 0.75x
    }
  };

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
          <button 
            onClick={() => setShowAlignmentDebug(!showAlignmentDebug)}
            style={{ 
              background: showAlignmentDebug ? '#ff6b6b' : '#6c757d',
              color: 'white',
              marginLeft: '16px'
            }}
          >
            {showAlignmentDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
          <button 
            onClick={() => setShowVisualValidation(!showVisualValidation)}
            style={{ 
              background: showVisualValidation ? '#4CAF50' : '#6c757d',
              color: 'white',
              marginLeft: '8px'
            }}
          >
            {showVisualValidation ? 'Hide Validation' : 'Validate Alignment'}
          </button>
        </div>
        <div className="viewer-container">
          {isRendering && (
            <div className="rendering-overlay"><p>Rendering page...</p></div>
          )}
          <div className="page" data-page={currentPage} ref={pageElRef}>
            <canvas ref={canvasRef} className="pdf-canvas"></canvas>
            <div className="textLayer" data-page={currentPage} ref={textLayerRef}></div>
            <div className="highlightLayer" data-page={currentPage} ref={hlLayerRef}></div>
            {pdfDoc && currentViewport && (
              <>
                <TextLayer 
                  pdfDoc={pdfDoc} 
                  pageNum={currentPage} 
                  viewport={currentViewport}
                  textLayerRef={textLayerRef}
                  hlLayerRef={hlLayerRef}
                />
                <AlignmentValidator
                  pageNum={currentPage}
                  viewport={currentViewport}
                  pdfDoc={pdfDoc}
                  hlLayerRef={hlLayerRef}
                  enabled={showAlignmentDebug}
                />
                <VisualAlignmentValidator
                  pageNum={currentPage}
                  viewport={currentViewport}
                  pdfDoc={pdfDoc}
                  hlLayerRef={hlLayerRef}
                  enabled={showVisualValidation}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
