// PDF Service: wrapper around PDF.js using the webpack module for automatic worker configuration
import * as pdfjsLib from 'pdfjs-dist/webpack';

export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PDFService {
  private pdfDoc: any = null;

  // Load a PDF document from a File object
  async loadDocument(file: File): Promise<any> {
    const arrayBuffer = await file.arrayBuffer();
    this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return this.pdfDoc;
  }

  // Get total number of pages
  getPageCount(): number {
    if (!this.pdfDoc) {
      throw new Error('PDF document not loaded');
    }
    return this.pdfDoc.numPages;
  }

  // Render a specific page to a canvas at the given scale
  async renderPage(pageNum: number, scale: number): Promise<HTMLCanvasElement> {
    if (!this.pdfDoc) {
      throw new Error('PDF document not loaded');
    }
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas;
  }

  // Extract text items with positioning for annotations
  async extractText(pageNum: number): Promise<TextItem[]> {
    if (!this.pdfDoc) {
      throw new Error('PDF document not loaded');
    }
    const page = await this.pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    return textContent.items.map((item: any) => {
      const transform = item.transform;
      return {
        text: (item as any).str,
        x: transform[4],
        y: transform[5],
        width: (item as any).width,
        height: (item as any).height
      };
    });
  }
}

// Export a singleton instance
export default new PDFService();
