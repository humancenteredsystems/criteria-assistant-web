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
  async renderPage(pdfDoc: any, pageNum: number, scale: number): Promise<HTMLCanvasElement> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const dpr = window.devicePixelRatio || 1;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    // Set CSS size and actual canvas size for HiDPI
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    
    await page.render({
      canvasContext: context,
      viewport,
      transform: [dpr, 0, 0, dpr, 0, 0]
    }).promise;
    
    return canvas;
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

  // Render text layer using PDF.js renderTextLayer API for proper alignment
  async renderTextLayer(pdfDoc: any, pageNum: number, scale: number, container: HTMLElement): Promise<HTMLElement[]> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();
    
    // Clear container and set dimensions
    container.innerHTML = '';
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    
    const textDivs: HTMLElement[] = [];
    await (pdfjsLib as any).renderTextLayer({
      textContent,
      container,
      viewport,
      textDivs
    });
    
    return textDivs;
  }
}

export default new PDFService();
