// PDF Service: wrapper around PDF.js with proper Vite configuration
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker for Vite - use ES module worker URL
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

// We intentionally do NOT use TextLayerBuilder (API changed). We rely on renderTextLayer (v4/5) and a manual fallback.

import { TextItem } from '../types/text';
import { PDFRect, extractCssRect, cssToPdfRect, PageViewport as ProjectionViewport } from '../utils/coordinateProjection';

// PDF.js v5.x type definitions
interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport(params: { scale: number; rotation?: number }): PageViewport;
  render(params: RenderParameters): RenderTask;
  getTextContent(): Promise<TextContent>;
  rotate?: number;
}

interface PageViewport {
  width: number;
  height: number;
}

interface RenderParameters {
  canvasContext: CanvasRenderingContext2D;
  viewport: PageViewport;
  transform?: number[];
}

interface RenderTask {
  promise: Promise<void>;
  cancel(): void;
}

interface TextContent {
  items: TextContentItem[];
}

interface TextContentItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
  fontName?: string;
}

export class PDFService {
  // 🔥 SINGLETON FIX: Make service stateless - no shared pdfDoc state

  // Load a PDF document from a File object and return it directly
  async loadDocument(file: File): Promise<PDFDocumentProxy> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdfDoc as PDFDocumentProxy;
  }

  // Get total number of pages from a specific document
  getPageCount(pdfDoc: PDFDocumentProxy): number {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    return pdfDoc.numPages;
  }

  // Render a specific page to a canvas at the given scale with HiDPI support
  async renderPage(
    pdfDoc: PDFDocumentProxy,
    pageNum: number,
    scale: number
  ): Promise<{ canvas: HTMLCanvasElement; renderTask: RenderTask }> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });
    const dpr = window.devicePixelRatio || 1;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Set CSS size and actual canvas size for HiDPI
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    
    const renderTask = page.render({
      canvasContext: context,
      viewport,
      transform: [dpr, 0, 0, dpr, 0, 0]
    });

    return { canvas, renderTask };
  }

  // Extract text items with positioning for annotations
  async extractText(pdfDoc: PDFDocumentProxy, pageNum: number): Promise<TextItem[]> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    return textContent.items.map((item: TextContentItem) => {
      const transform = item.transform;
      return {
        str: item.str,
        x: transform[4],
        y: transform[5],
        width: item.width || 0,
        height: item.height || 0
      };
    });
  }

  // Render text layer using PDF.js v5.x compatible approach
  async renderTextLayer(
    pdfDoc: PDFDocumentProxy,
    pageNum: number,
    scale: number,
    container: HTMLElement
  ): Promise<{ textDivs: HTMLElement[]; renderTask: RenderTask | { promise: Promise<void>; cancel: () => void } }> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    const page = await pdfDoc.getPage(pageNum);
    const rotation = page.rotate || 0;
    const viewport = page.getViewport({ scale, rotation });
    const textContent = await page.getTextContent();
    
    // Clear container and set exact dimensions to match viewport
    container.innerHTML = '';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    
    const textDivs: HTMLElement[] = [];
    
    // Prefer official renderTextLayer if present (PDF.js v4/5)
    const renderTextLayerFn = (pdfjsLib as any).renderTextLayer;
    if (renderTextLayerFn && typeof renderTextLayerFn === 'function') {
      try {
        // Single, stable path ─ no builder
        // NOTE: renderTextLayer returns a task with { promise, cancel }
        const renderTask = renderTextLayerFn({
          textContent,
          container,
          viewport,
          textDivs,
        });
        return { textDivs, renderTask };
      } catch (error) {
        console.warn('renderTextLayer failed, using manual text layer:', error);
      }
    }

    // Manual fallback (DOM-only geometry; glyphs hidden by CSS in the app)
    
    textContent.items.forEach((item: any, index: number) => {
      const div = document.createElement('div');
      div.textContent = item.str;
      
      // Use PDF.js transform matrix for positioning
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      const width = item.width || 0;
      const height = item.height || 12;
      
      // Convert PDF coordinates to CSS coordinates (PDF origin is bottom-left, CSS is top-left)
      const cssX = x;
      const cssY = viewport.height - y - height; // Proper Y-axis conversion
      
      div.style.position = 'absolute';
      div.style.left = `${cssX}px`;
      div.style.top = `${cssY}px`;
      div.style.width = `${width}px`;
      div.style.height = `${height}px`;
      div.style.fontSize = `${height}px`;
      div.style.fontFamily = item.fontName || 'sans-serif';
      div.style.whiteSpace = 'pre';
      div.style.pointerEvents = 'none';
      div.style.userSelect = 'none';
      div.style.lineHeight = '1';
      div.style.transformOrigin = '0% 0%';
      
      // Apply any scaling from the transform matrix
      if (transform[0] !== 1 || transform[3] !== 1) {
        div.style.transform = `scaleX(${transform[0]}) scaleY(${transform[3]})`;
      }
      
      container.appendChild(div);
      textDivs.push(div);
    });
    
    // Create a mock render task that resolves immediately
    const mockRenderTask = {
      promise: Promise.resolve(),
      cancel: () => {}
    };

    console.log(`PDFService: Created ${textDivs.length} text divs for page ${pageNum}`);
    return { textDivs, renderTask: mockRenderTask };
  }

  /**
   * Build PDF-space rectangles from text divs after text layer rendering
   * This is done once per page to cache PDF coordinates for alignment
   */
  buildPdfSpaceRects(textDivs: HTMLElement[], viewport: PageViewport): PDFRect[] {
    return textDivs.map(div => {
      const cssRect = extractCssRect(div);
      return cssToPdfRect(cssRect, { 
        width: viewport.width, 
        height: viewport.height, 
        scale: (viewport as any).scale || 1 
      } as ProjectionViewport);
    });
  }
}

export default new PDFService();
