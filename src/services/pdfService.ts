// PDF Service: wrapper around PDF.js with proper Vite configuration
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker for Vite - use ES module worker URL
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

// We intentionally do NOT use TextLayerBuilder (API changed). We rely on renderTextLayer (v4/5) and a manual fallback.

import { TextItem, Viewport } from '../types/viewport';

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
    // IMPORTANT: No CSS transforms - compute final positions numerically to match extractCssRect behavior
    
    textContent.items.forEach((item: any, index: number) => {
      const div = document.createElement('div');
      div.textContent = item.str;
      
      // Use PDF.js transform matrix for positioning
      const transform = item.transform;
      const pdfX = transform[4];
      const pdfY = transform[5];
      const baseWidth = item.width || 0;
      const baseHeight = item.height || 12;
      
      // Apply scaling from transform matrix numerically (no CSS transform)
      const scaleX = transform[0];
      const scaleY = transform[3];
      const finalWidth = baseWidth * Math.abs(scaleX);
      const finalHeight = baseHeight * Math.abs(scaleY);
      
      // Convert PDF coordinates to CSS coordinates (PDF origin is bottom-left, CSS is top-left)
      // Account for scaling in the coordinate conversion
      const cssX = pdfX;
      const cssY = viewport.height - pdfY - finalHeight;
      
      // Set final computed positions directly (no transforms)
      div.style.position = 'absolute';
      div.style.left = `${cssX}px`;
      div.style.top = `${cssY}px`;
      div.style.width = `${finalWidth}px`;
      div.style.height = `${finalHeight}px`;
      div.style.fontSize = `${finalHeight}px`;
      div.style.fontFamily = item.fontName || 'sans-serif';
      div.style.whiteSpace = 'pre';
      div.style.pointerEvents = 'none';
      div.style.userSelect = 'none';
      div.style.lineHeight = '1';
      
      // No CSS transforms - all scaling is baked into the computed positions
      
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

}

export default new PDFService();
