// PDF Service: wrapper around PDF.js with proper Vite configuration
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for Vite - worker file will be served from public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

import { TextItem } from '../types/text';


export class PDFService {
  // 🔥 SINGLETON FIX: Make service stateless - no shared pdfDoc state

  // Load a PDF document from a File object and return it directly
  async loadDocument(file: File): Promise<any> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdfDoc; // Return the document instead of storing it
  }

  // Get total number of pages from a specific document
  getPageCount(pdfDoc: any): number {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    return pdfDoc.numPages;
  }

  // Render a specific page to a canvas at the given scale
  async renderPage(pdfDoc: any, pageNum: number, scale: number): Promise<HTMLCanvasElement> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
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
}

// Export a singleton instance (now stateless, so safe to share)
export default new PDFService();
