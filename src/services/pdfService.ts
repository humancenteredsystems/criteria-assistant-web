// PDF Service: wrapper around PDF.js with proper Vite configuration
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker for Vite - use ES module worker URL
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

import { TextItem } from '../types/text';

export class PDFService {
  // 🔥 SINGLETON FIX: Make service stateless - no shared pdfDoc state

  // Load a PDF document from a File object and return it directly
  async loadDocument(file: File): Promise<any> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdfDoc;
  }

  // Get total number of pages from a specific document
  getPageCount(pdfDoc: any): number {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    return pdfDoc.numPages;
  }

  // Render a specific page to a canvas at the given scale with HiDPI support
  async renderPage(
    pdfDoc: any,
    pageNum: number,
    scale: number
  ): Promise<{ canvas: HTMLCanvasElement; renderTask: any }> {
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
  async extractText(pdfDoc: any, pageNum: number): Promise<TextItem[]> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    return textContent.items.map((item: any) => {
      const transform = item.transform;
      return {
        str: (item as any).str,
        x: transform[4],
        y: transform[5],
        width: (item as any).width,
        height: (item as any).height
      };
    });
  }

  // Render text layer using PDF.js v5.x compatible approach
  async renderTextLayer(
    pdfDoc: any,
    pageNum: number,
    scale: number,
    container: HTMLElement
  ): Promise<{ textDivs: HTMLElement[]; renderTask: any }> {
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
    
    // Check if renderTextLayer is available in PDF.js v5.x
    const renderTextLayerFn = (pdfjsLib as any).renderTextLayer;
    
    if (renderTextLayerFn && typeof renderTextLayerFn === 'function') {
      // Use official PDF.js renderTextLayer API if available
      console.log(`PDFService: Using official renderTextLayer for page ${pageNum}`);
      const renderTask = renderTextLayerFn({
        textContent,
        container,
        viewport,
        textDivs,
      });
      return { textDivs, renderTask };
    } else {
      // Fallback: Use enhanced manual text layer creation with proper alignment
      console.log(`PDFService: Using enhanced manual text layer for page ${pageNum}`);
      
      textContent.items.forEach((item: any, index: number) => {
        const div = document.createElement('div');
        div.textContent = item.str;
        
        // Use PDF.js transform matrix for positioning
        const transform = item.transform;
        const x = transform[4];
        const y = transform[5];
        
        // Convert PDF coordinates to CSS coordinates (PDF origin is bottom-left, CSS is top-left)
        const cssX = x;
        const cssY = viewport.height - y - (item.height || 12); // Subtract item height for proper alignment
        
        div.style.position = 'absolute';
        div.style.left = `${cssX}px`;
        div.style.top = `${cssY}px`;
        div.style.fontSize = `${item.height || 12}px`;
        div.style.fontFamily = item.fontName || 'sans-serif';
        div.style.whiteSpace = 'pre';
        div.style.pointerEvents = 'none';
        div.style.userSelect = 'none';
        
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
}

export default new PDFService();
