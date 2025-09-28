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

  // Extract text items with viewport-scaled positioning for direct rendering
  async extractTextForDirectRendering(
    pdfDoc: PDFDocumentProxy, 
    pageNum: number, 
    viewport: PageViewport
  ): Promise<TextItem[]> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    return textContent.items
      .filter((item): item is PDFTextItem => 'str' in item)
      .map((item: PDFTextItem) => {
        const transform = item.transform;
        
        // Extract position from transform matrix
        const pdfX = transform[4];
        const pdfY = transform[5];
        
        // Convert PDF coordinates to viewport coordinates
        // PDF.js has built-in coordinate conversion
        const [viewportX, viewportY] = viewport.convertToViewportPoint(pdfX, pdfY);
        
        // Calculate text dimensions in viewport space
        const textWidth = (item.width || 0) * viewport.scale;
        const textHeight = (item.height || 0) * viewport.scale;
        
        return {
          str: item.str,
          x: viewportX,
          y: viewportY,
          width: textWidth,
          height: textHeight
        };
      });
  }

  // Render text layer using PDF.js v5.x TextLayer class with font preservation
  async renderTextLayer(
    pdfDoc: PDFDocumentProxy,
    pageNum: number,
    viewport: PageViewport,
    container: HTMLElement
  ): Promise<{ textDivs: HTMLElement[]; renderTask: { promise: Promise<void>; cancel: () => void } }> {
    if (!pdfDoc) {
      throw new Error('PDF document not provided');
    }
    
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Clear container and set exact dimensions to match viewport
    container.innerHTML = '';
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    
    try {
      console.log(`PDFService: Using PDF.js v5 TextLayer class for page ${pageNum} with font preservation`);
      
      // PDF.js v5 TextLayer class API
      const textLayer = new TextLayer({
        textContentSource: textContent,
        container,
        viewport
      });
      
      // Render the text layer
      const renderPromise = textLayer.render().then(() => {
        // Post-processing: Add font metadata to text elements for CSS targeting
        this.enhanceTextElementsWithFontData(textLayer.textDivs, textContent.items);
        
        console.log(`PDFService: Enhanced ${textLayer.textDivs.length} text elements with font data`);
      });
      
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

  // Private method to enhance text elements with font metadata
  private enhanceTextElementsWithFontData(textDivs: HTMLElement[], textItems: any[]): void {
    textDivs.forEach((div, index) => {
      const item = textItems[index];
      if (item && 'fontName' in item) {
        // Add font name for CSS targeting
        div.setAttribute('data-font-name', item.fontName || '');
        
        // Add font size information
        if (item.height) {
          div.setAttribute('data-font-size', item.height.toString());
        }
        
        // Add transform information for debugging
        if (item.transform && Array.isArray(item.transform)) {
          div.setAttribute('data-transform', item.transform.join(','));
        }
        
        // Ensure the element preserves its calculated styles
        const computedStyle = window.getComputedStyle(div);
        if (computedStyle.fontSize) {
          div.style.setProperty('font-size', computedStyle.fontSize, 'important');
        }
        if (computedStyle.fontFamily) {
          div.style.setProperty('font-family', computedStyle.fontFamily, 'important');
        }
      }
    });
  }

}

export default new PDFService();
