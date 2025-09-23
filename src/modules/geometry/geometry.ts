// Geometry measurement for text elements
// Measures tight rectangles around matched substrings in CSS space

import { MatchSpan, CssRect } from '../../types/viewport';

/**
 * Measure tight rectangles for matched substrings within a text element
 * Uses Range API for precise glyph-level measurements
 */
export function measureSubstrings(element: HTMLElement, spans: MatchSpan[]): CssRect[] {
  if (!element || spans.length === 0) {
    return [];
  }

  const rects: CssRect[] = [];
  const textContent = element.textContent || '';
  
  for (const span of spans) {
    const rect = measureSingleSubstring(element, textContent, span.startIndex, span.endIndex);
    if (rect) {
      rects.push(rect);
    }
  }
  
  return rects;
}

/**
 * Measure a single substring using the Range API
 * Returns the tightest possible rectangle around the text
 */
function measureSingleSubstring(
  element: HTMLElement, 
  textContent: string, 
  startIndex: number, 
  endIndex: number
): CssRect | null {
  try {
    // Try Range API first (most accurate)
    const range = document.createRange();
    const textNode = findTextNodeContaining(element, startIndex);
    
    if (textNode) {
      const nodeStartIndex = getTextNodeStartIndex(element, textNode);
      const relativeStart = startIndex - nodeStartIndex;
      const relativeEnd = endIndex - nodeStartIndex;
      
      // Ensure indices are within the text node
      if (relativeStart >= 0 && relativeEnd <= textNode.textContent!.length) {
        range.setStart(textNode, relativeStart);
        range.setEnd(textNode, relativeEnd);
        
        const domRect = range.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Convert to element-relative coordinates
        const cssRect: CssRect = [
          domRect.left - elementRect.left,
          domRect.top - elementRect.top,
          domRect.width,
          domRect.height
        ];
        
        range.detach();
        return cssRect;
      }
    }
    
    // Fallback to element-based measurement
    return measureWithElementFallback(element, textContent, startIndex, endIndex);
    
  } catch (error) {
    console.warn('Range measurement failed, using fallback:', error);
    return measureWithElementFallback(element, textContent, startIndex, endIndex);
  }
}

/**
 * Fallback measurement using element positioning and font metrics
 * Less accurate but more compatible
 */
function measureWithElementFallback(
  element: HTMLElement,
  textContent: string,
  startIndex: number,
  endIndex: number
): CssRect | null {
  try {
    const computedStyle = window.getComputedStyle(element);
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontFamily = computedStyle.fontFamily;
    
    // Create a temporary canvas for text measurement
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    
    // Measure the substring
    const substring = textContent.substring(startIndex, endIndex);
    const metrics = ctx.measureText(substring);
    
    // Estimate position based on preceding text
    const precedingText = textContent.substring(0, startIndex);
    const precedingWidth = ctx.measureText(precedingText).width;
    
    // Get element positioning
    const elementRect = element.getBoundingClientRect();
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    
    // Estimate rectangle (this is approximate)
    const cssRect: CssRect = [
      paddingLeft + precedingWidth,
      paddingTop,
      metrics.width,
      fontSize * 1.2 // Approximate line height
    ];
    
    return cssRect;
    
  } catch (error) {
    console.warn('Fallback measurement failed:', error);
    return null;
  }
}

/**
 * Find the text node that contains the given character index
 */
function findTextNodeContaining(element: HTMLElement, charIndex: number): Text | null {
  let currentIndex = 0;
  
  function traverse(node: Node): Text | null {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const textLength = textNode.textContent?.length || 0;
      
      if (charIndex >= currentIndex && charIndex < currentIndex + textLength) {
        return textNode;
      }
      
      currentIndex += textLength;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        const result = traverse(node.childNodes[i]);
        if (result) return result;
      }
    }
    
    return null;
  }
  
  return traverse(element);
}

/**
 * Get the starting character index of a text node within its parent element
 */
function getTextNodeStartIndex(element: HTMLElement, targetTextNode: Text): number {
  let index = 0;
  
  function traverse(node: Node): boolean {
    if (node === targetTextNode) {
      return true; // Found it
    }
    
    if (node.nodeType === Node.TEXT_NODE) {
      index += (node as Text).textContent?.length || 0;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverse(node.childNodes[i])) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  traverse(element);
  return index;
}

/**
 * Measure multiple rectangles for a span that crosses line breaks
 * Returns an array of rectangles, one for each line segment
 */
export function measureMultiLineSubstring(
  element: HTMLElement,
  startIndex: number,
  endIndex: number
): CssRect[] {
  const rects: CssRect[] = [];
  
  try {
    const range = document.createRange();
    const textNode = findTextNodeContaining(element, startIndex);
    
    if (!textNode) return rects;
    
    const nodeStartIndex = getTextNodeStartIndex(element, textNode);
    const relativeStart = startIndex - nodeStartIndex;
    const relativeEnd = Math.min(endIndex - nodeStartIndex, textNode.textContent!.length);
    
    range.setStart(textNode, relativeStart);
    range.setEnd(textNode, relativeEnd);
    
    // Get all client rectangles (one per line)
    const clientRects = range.getClientRects();
    const elementRect = element.getBoundingClientRect();
    
    for (let i = 0; i < clientRects.length; i++) {
      const domRect = clientRects[i];
      const cssRect: CssRect = [
        domRect.left - elementRect.left,
        domRect.top - elementRect.top,
        domRect.width,
        domRect.height
      ];
      rects.push(cssRect);
    }
    
    range.detach();
    
  } catch (error) {
    console.warn('Multi-line measurement failed:', error);
    // Fallback to single rectangle
    const singleRect = measureSingleSubstring(element, element.textContent || '', startIndex, endIndex);
    if (singleRect) {
      rects.push(singleRect);
    }
  }
  
  return rects;
}

/**
 * Extract CSS rectangle from element's computed style
 * Used for elements with explicit positioning
 */
export function extractElementRect(element: HTMLElement): CssRect {
  const style = element.style;
  const left = parseFloat(style.left) || 0;
  const top = parseFloat(style.top) || 0;
  const width = parseFloat(style.width) || element.offsetWidth;
  const height = parseFloat(style.height) || element.offsetHeight;
  
  return [left, top, width, height];
}

/**
 * Check if a rectangle is valid (has positive dimensions)
 */
export function isValidRect(rect: CssRect): boolean {
  const [left, top, width, height] = rect;
  return width > 0 && height > 0 && !isNaN(left) && !isNaN(top);
}
