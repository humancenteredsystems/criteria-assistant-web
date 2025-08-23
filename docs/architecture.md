## architecture.md

# Criteria Assistant Web - Architecture

## System Overview

A client-side web application that processes PDFs entirely in the browser using PDF.js for rendering and text extraction, with SVG overlay system for annotations.

## Core Architecture: Client-Side Processing

```
User Browser
├── PDF.js Engine
│   ├── PDF Rendering → Canvas
│   ├── Text Extraction → Coordinates + Text
│   └── Page Navigation → Page Objects
├── Annotation System  
│   ├── Keyword Matching → Highlights
│   ├── URL Validation → Status Indicators
│   └── SVG Overlays → Visual Annotations
└── React UI
    ├── PDF Viewer Component
    ├── Annotation Panel
    └── Control Interface
```

## Component Architecture

### 1. PDF Service Layer (`pdfService.ts`)
- **PDF.js Wrapper**: Abstracts PDF.js API
- **Text Extraction**: Gets text with bounding box coordinates
- **Rendering Pipeline**: Converts PDF pages to canvas
- **Page Management**: Handles navigation, zoom, pagination

```typescript
interface PDFService {
  loadDocument(file: File): Promise<PDFDocument>
  renderPage(pageNum: number, scale: number): Promise<Canvas>  
  extractText(pageNum: number): Promise<TextItem[]>
  getPageCount(): number
}
```

### 2. Annotation System (`annotationService.ts`)
- **Pattern Matching**: Find keywords/URLs in extracted text
- **Coordinate Mapping**: Map text matches to page coordinates
- **Category Management**: Handle annotation types and visibility
- **Overlay Generation**: Create SVG highlight elements

```typescript
interface AnnotationService {
  findAnnotations(text: TextItem[]): Annotation[]
  createHighlights(annotations: Annotation[]): SVGElement[]
  toggleCategory(category: string, visible: boolean): void
}
```

### 3. React Component Tree

```
App
├── PDFViewer
│   ├── PDFCanvas (PDF.js rendering)
│   ├── AnnotationLayer (SVG overlays)
│   └── Controls (zoom, navigation)
├── AnnotationPanel  
│   ├── CategoryToggles
│   ├── PageMetadata
│   └── SearchBox
└── Header (file upload, menu)
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

### PDF Rendering Pipeline
```javascript
// Load PDF
const loadingTask = pdfjsLib.getDocument(pdfData)
const pdf = await loadingTask.promise

// Render page
const page = await pdf.getPage(pageNumber)
const viewport = page.getViewport({ scale })
const canvas = document.createElement('canvas')
const context = canvas.getContext('2d')
await page.render({ canvasContext: context, viewport })
```

### Text Extraction with Coordinates
```javascript
// Extract text items with positioning
const textContent = await page.getTextContent()
const textItems = textContent.items.map(item => ({
  text: item.str,
  x: item.transform[4],
  y: item.transform[5], 
  width: item.width,
  height: item.height
}))
```

### SVG Annotation Overlay
```javascript
// Create highlight SVG
const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
highlight.setAttribute('x', textItem.x)
highlight.setAttribute('y', textItem.y)  
highlight.setAttribute('width', textItem.width)
highlight.setAttribute('height', textItem.height)
highlight.setAttribute('fill', 'rgba(255, 255, 0, 0.3)')
```

This architecture provides a scalable, maintainable foundation for the web version while preserving all the functionality of your PyQt application.