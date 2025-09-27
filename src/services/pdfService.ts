// PDF Service: wrapper around PDF.js v5 with proper Vite configuration
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import type { 
  PDFDocumentProxy, 
  PDFPageProxy, 
  RenderTask,
  TextContent,
  TextItem as PDFTextItem,
  RenderParameters as PDFRenderParameters
} from 'pdfjs-dist/types/src/display/api';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker for Vite - use ES module worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

import { TextItem, Viewport } from '../types/viewport';

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
      canvas,
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
    return textContent.items
      .filter((item): item is PDFTextItem => 'str' in item) // Filter out TextMarkedContent
      .map((item: PDFTextItem) => {
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

  // Render text layer using PDF.js v5.x TextLayer class
  async renderTextLayer(
    pdfDoc: PDFDocumentProxy,
    pageNum: number,
    scale: number,
    container: HTMLElement
  ): Promise<{ textDivs: HTMLElement[]; renderTask: { promise: Promise<void>; cancel: () => void } }> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale }); // No rotation for now
    const textContent = await page.getTextContent();
    
    // Clear container and set exact dimensions to match viewport
    container.innerHTML = '';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    
    try {
      console.log(`PDFService: Using PDF.js v5 TextLayer class for page ${pageNum}`);
      
      // PDF.js v5 TextLayer class API
      const textLayer = new TextLayer({
        textContentSource: textContent,
        container,
        viewport,
      });
      
      // Render the text layer
      const renderPromise = textLayer.render();
      
      // Create a compatible render task interface
      const renderTask = {
        promise: renderPromise,
        cancel: () => textLayer.cancel()
      };
      
      return { 
        textDivs: textLayer.textDivs, 
        renderTask 
      };
    } catch (error) {
      console.error('PDF.js TextLayer failed:', error);
      throw new Error(`Failed to render text layer for page ${pageNum}: ${error}`);
    }
  }

}

export default new PDFService();
