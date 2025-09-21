## architecture.md

# Criteria Assistant Web - Architecture

## System Overview

A client-side web application that processes PDFs entirely in the browser using PDF.js for rendering and text extraction, with a **PDF-space coordinate projection system** for precise highlight alignment.

## Core Architecture: PDF-Space Projection System

```
User Browser
├── PDF.js Engine
│   ├── PDF Canvas Rendering → HiDPI Canvas
│   ├── Text Layer Rendering → Transparent DOM Geometry
│   └── PDF-Space Coordinates → User Units
├── Projection System
│   ├── Coordinate Conversion → PDF Units ↔ CSS Pixels  
│   ├── Viewport Scaling → Zoom-Independent Alignment
│   └── Highlight Projection → Positioned DOM Elements
├── Search & Navigation
│   ├── Text Matching → Debounced Search (150ms)
│   ├── Controlled Auto-scroll → Next/Prev Only
│   └── Match Highlighting → PDF-Space Projection
└── React Component Tree
    ├── PDFViewer → Canvas + Layer Management
    ├── TextLayer → Transparent Geometry
    ├── HighlightLayer → Search Result Projection
    └── Debug Tools → Alignment Validation
```

## Current Stable State (Milestone)

**Status**: Fully functional highlight overlay system with perfect alignment
- ✅ PDF-space coordinate authority established
- ✅ Projection-based highlighting (no DOM reading for geometry)
- ✅ Stable rendering pipeline (no infinite loops)
- ✅ Controlled auto-scroll prevents PDF disappearing
- ✅ Debug validation tools for alignment verification

## Component Architecture

### 1. PDF Service Layer (`pdfService.ts`)
- **PDF.js Wrapper**: Stateless service abstracting PDF.js API
- **Text Layer Rendering**: Creates transparent DOM geometry using `renderTextLayer`
- **PDF-Space Rectangle Caching**: Converts DOM positions to PDF user units
- **Canvas Rendering**: HiDPI-aware page rendering with proper viewport scaling

```typescript
interface PDFService {
  loadDocument(file: File): Promise<PDFDocumentProxy>
  renderTextLayer(pdfDoc, pageNum, scale, container): Promise<{textDivs, renderTask}>
  buildPdfSpaceRects(textDivs: HTMLElement[], viewport): PDFRect[]
}
```

### 2. Coordinate Projection System (`coordinateProjection.ts`)
- **PDF-Space Authority**: All coordinates stored in PDF user units
- **Viewport Projection**: Converts PDF units to CSS pixels using current scale
- **Alignment Utilities**: Ensures highlights stay aligned at any zoom level

```typescript
interface ProjectionSystem {
  cssToPdfRect(cssRect: CSSRect, viewport: PageViewport): PDFRect
  pdfToCssRect(pdfRect: PDFRect, viewport: PageViewport): CSSRect
  createValidationCrosshairs(viewport: PageViewport): CSSRect[]
}
```

### 3. Actual React Component Tree

```
App
├── PDFViewer
│   ├── Canvas (PDF.js HiDPI rendering)
│   ├── TextLayer (transparent geometry + PDF rect caching)
│   ├── HighlightLayer (projection-based search highlights)
│   ├── AlignmentValidator (debug crosshairs)
│   └── Controls (zoom, navigation, debug toggle)
├── SearchBar (debounced input + Next/Prev navigation)
└── File Upload Interface
```

### 4. State Management (`textStore.ts`)
- **Search State**: Debounced search terms and match indices
- **PDF Rectangle Cache**: Cached PDF-space coordinates per page
- **Controlled Navigation**: Next/Prev with auto-scroll, no auto-scroll on typing

```typescript
interface TextStore {
  searchTerm: string
  matchDivIndicesByPage: Record<number, number[]>
  pdfRectsByPage: Record<number, PDFRect[]>
  currentMatchIndex: number
  nextMatch(): void // includes auto-scroll
  prevMatch(): void // includes auto-scroll
}
```

## Data Flow

1. **File Upload**: User selects PDF → PDF.js loads document
2. **Page Render**: PDF.js renders page to canvas
3. **Text Extraction**: PDF.js extracts text with coordinates  
4. **Annotation Processing**: Match text against keyword/URL patterns
5. **Overlay Creation**: Generate SVG highlights positioned over canvas
6. **User Interaction**: Toggle categories, navigate pages, zoom

## Technology Choices

### PDF.js vs Alternatives
- **Chosen**: PDF.js - Mozilla's battle-tested library
- **Why**: Native text extraction, precise coordinates, no server needed
- **Rejected**: PDFium (requires server), react-pdf (limited features)

### SVG vs Canvas for Annotations
- **Chosen**: SVG overlays positioned absolutely over PDF canvas
- **Why**: Precise positioning, CSS styling, interactive elements
- **Alternative**: Canvas drawing (harder to style, less interactive)

### State Management: Zustand
- **Why**: Lightweight, TypeScript-friendly, simple API
- **Alternative**: Redux (overkill), React Context (performance issues)

## Performance Considerations

### Client-Side Benefits
- **No Server Load**: All processing in browser
- **Instant Response**: No network latency for PDF operations  
- **Privacy**: Files never leave user's device
- **Scalability**: Scales with user's device, not server capacity

### Optimization Strategies  
- **Lazy Loading**: Only render visible pages
- **Worker Threads**: PDF.js uses web workers for parsing
- **Caching**: Cache rendered pages and extracted text
- **Virtual Scrolling**: Handle large documents efficiently

## Implementation Details

### PDF-Space Coordinate System (Key Innovation)

The alignment solution uses **PDF user units** as the single source of truth:

```javascript
// 1. Render transparent text layer with PDF.js
const { textDivs, renderTask } = await pdfService.renderTextLayer(pdfDoc, pageNum, scale, container)
await renderTask.promise

// 2. Cache PDF-space rectangles (done once per page/scale)
const viewport = page.getViewport({ scale, rotation })
const pdfRects = textDivs.map(div => {
  const cssRect = extractCssRect(div) // read DOM positions once
  return cssToPdfRect(cssRect, viewport) // convert to PDF units
})

// 3. Project to CSS pixels for highlighting (done on every search)
const cssRect = pdfToCssRect(pdfRect, viewport) // mathematical projection
```

### Controlled Rendering Pipeline
```javascript
// Canvas rendering (stable, only on page/zoom changes)
const dpr = window.devicePixelRatio || 1
canvas.style.width = `${viewport.width}px`
canvas.style.height = `${viewport.height}px`
canvas.width = Math.floor(viewport.width * dpr)
canvas.height = Math.floor(viewport.height * dpr)

await page.render({
  canvasContext: context,
  viewport,
  transform: [dpr, 0, 0, dpr, 0, 0] // HiDPI scaling
})
```

### Search Highlight Projection
```javascript
// No DOM reading - pure mathematical projection
indices.forEach((divIndex, k) => {
  const pdfRect = pdfRects[divIndex] // cached PDF coordinates
  const cssRect = pdfToCssRect(pdfRect, { scale }) // project to current zoom
  
  const highlight = document.createElement('div')
  highlight.style.position = 'absolute'
  highlight.style.left = `${cssRect.left}px`
  highlight.style.top = `${cssRect.top}px`
  highlight.style.width = `${cssRect.width}px`
  highlight.style.height = `${cssRect.height}px`
  highlight.style.background = 'rgba(255, 235, 59, 0.45)'
})
```

### Alignment Validation System
```javascript
// Debug crosshairs at PDF page corners
const corners = [
  { x: 0, y: 0 },
  { x: pageWidth/scale, y: 0 },
  { x: 0, y: pageHeight/scale },
  { x: pageWidth/scale, y: pageHeight/scale }
]

corners.forEach(corner => {
  const cssRect = pdfToCssRect({
    x: corner.x, y: corner.y, w: 10/scale, h: 10/scale
  }, viewport)
  // Crosshairs should hug canvas corners at all zoom levels
})
```

This architecture provides a scalable, maintainable foundation for the web version while preserving all the functionality of your PyQt application.
