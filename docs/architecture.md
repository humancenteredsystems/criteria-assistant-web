# Criteria Assistant Web — Architecture

## 1. Purpose and Scope

Client-side PDF viewer and annotation tool that runs entirely in the browser. It renders pages with PDF.js, extracts text geometry, and projects **PDF-space** rectangles onto DOM overlays for exact alignment at any zoom or rotation. This document states the system architecture from a systems-engineering standpoint: objectives, components, interfaces, data, pipelines, invariants, and V\&V.

---

## 2. Architectural Objectives

* **PDF-space authority:** Store geometry only in PDF user units; never depend on live DOM layout for persisted coordinates.
* **Single projector:** One conversion module handles PDF↔CSS using a `Viewport` that includes width, height, scale, and rotation.
* **Deterministic overlay:** Overlays size to the page `Viewport`; alignment is independent of device pixel ratio (DPR).
* **Search on per-match rects:** Navigation and highlighting operate on rectangles tight to glyphs, not DIVs.
* **Isolation and testability:** Clear module boundaries; unit tests for projector and pipelines; integration tests for zoom/rotation.

---

## 3. System Context

**Environment:** Modern browser with PDF.js and a Web Worker for parsing.
**Inputs:** PDF file (local upload). User queries and commands.
**Outputs:** Canvas render, transparent text geometry for measurement, DOM/SVG overlays for highlights and annotations.
**External Dependencies:** PDF.js only. No server.

---

## 4. Concepts and Invariants

* **PDF user units (PDF-space):** Bottom-left origin coordinates from the PDF page. Canonical storage format.
* **CSS pixels (CSS-space):** Top-left origin coordinates for DOM placement.
* **Viewport:** `{width, height, scale, rotation}` derived from `page.getViewport({scale, rotation})`, expressed in CSS pixels at the current zoom.
* **Alignment invariants**

  1. Page container and all overlay layers have identical `width` and `height` equal to the `Viewport`.
  2. Overlays are absolutely positioned at `(left=0, top=0)` with no margins, borders, or padding.
  3. Canvas manages DPR via backing store size and render transform; overlays do not include DPR math.
  4. All overlay coordinates come from projecting **stored PDF-space** rectangles through the projector. No ad-hoc scaling.

---

## 5. Implementation Structure

### 5.1 Clean File Organization

```
src/
├── types/
│   └── viewport.ts         # Core types: Viewport, PdfRect, CssRect, MatchRect
│
├── styles/
│   └── pageLayout.css      # Standardized CSS for viewport alignment
│
├── modules/                # ✨ ALL BUSINESS LOGIC LIVES HERE
│   ├── index.ts           # Unified module API
│   ├── projector/         # Single source of coordinate conversion
│   │   ├── projector.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── projector.test.ts
│   ├── tokenizer/         # Text tokenization
│   │   ├── tokenizer.ts
│   │   └── index.ts
│   ├── matcher/           # Query matching
│   │   ├── matcher.ts
│   │   └── index.ts
│   ├── geometry/          # Substring measurement
│   │   ├── geometry.ts
│   │   └── index.ts
│   ├── store/            # PDF-space match storage
│   │   ├── store.ts
│   │   └── index.ts
│   ├── renderer/         # Highlight painting
│   │   ├── renderer.ts
│   │   └── index.ts
│   ├── controller/       # Search orchestration
│   │   ├── controller.ts
│   │   └── index.ts
│   ├── textlayer_fallback/  # Fallback text positioning
│   │   ├── textlayer_fallback.ts
│   │   └── index.ts
│   ├── fit_modes/        # Viewport calculations
│   │   ├── fit_modes.ts
│   │   └── index.ts
│   └── diagnostics/      # Debug & performance
│       ├── diagnostics.ts
│       └── index.ts
│
├── services/
│   └── pdfService.ts     # PDF.js wrapper (canvas & text rendering only)
│
├── components/           # ✨ THIN REACT WRAPPERS
│   ├── PDFViewer/
│   │   ├── PDFViewer.tsx       # Main viewer, uses fit_modes
│   │   └── PDFViewer.css
│   ├── SearchBar/
│   │   ├── SearchBar.tsx       # Uses searchController
│   │   └── SearchBar.css
│   ├── TextLayer/
│   │   ├── TextLayer.tsx       # Triggers searchController.processPageSearch
│   │   └── TextLayer.css
│   └── HighlightLayer/
│       ├── HighlightLayer.tsx  # Calls renderer.paintHighlights
│       └── HighlightLayer.css
│
├── App.tsx               # Main app component
├── main.tsx             # Entry point
└── index.css           # Global styles
```

### 5.2 Module Responsibilities

**Projector** (`modules/projector/`)
* Single source of truth for PDF ↔ CSS coordinate conversion
* Handles rotation by rotating rectangle corners and axis-aligning
* Handles Y-axis inversion between PDF and CSS coordinate systems
* Comprehensive unit tests for round-trip accuracy

**Tokenizer** (`modules/tokenizer/`)
* Breaks text content into tokens with precise character offsets
* Preserves exact character mapping needed for substring measurement
* Handles Unicode normalization and text preprocessing

**Matcher** (`modules/matcher/`)
* Finds query matches in tokenized text
* Returns character-based spans for precise substring measurement
* Supports case-insensitive and partial word matching

**Geometry** (`modules/geometry/`)
* Measures tight rectangles around matched substrings using Range API
* Converts CSS measurements to PDF-space using the projector
* Handles multi-line matches and complex text layouts

**Store** (`modules/store/`)
* Centralized storage for PDF-space match rectangles only
* Manages global match ordering for navigation
* Provides subscription-based state updates

**Renderer** (`modules/renderer/`)
* Projects stored PDF rectangles to CSS and paints highlight DOM elements
* Handles viewport changes with repaint-only (no geometry recalculation)
* Optimizes performance with batch DOM updates and viewport culling

**Controller** (`modules/controller/`)
* Orchestrates the complete search pipeline: tokenize → match → measure → cache → render
* Manages lazy processing and page-level state
* Coordinates navigation and viewport changes

**Additional Modules:**
* **textlayer_fallback/**: Numeric positioning from text matrices without CSS transforms
* **fit_modes/**: Viewport calculations for "Fit Width", "Fit Page", custom scaling
* **diagnostics/**: Alignment validation, performance monitoring, debug tools

### 5.3 Data Flow

1. **Search Input**: User enters query → SearchBar → `searchController.startNewSearch(query)`
2. **Processing**: TextLayer → `searchController.processPageSearch(page, query, textEl, viewport, hlLayer)`
   - Tokenizes text content
   - Finds query matches
   - Measures substring rectangles
   - Converts to PDF-space coordinates
   - Stores as `MatchRect[]` in store
3. **Rendering**: HighlightLayer → `renderer.paintHighlights(page, viewport, rects, layer)`
4. **Navigation**: SearchBar → `searchController.nextMatch()` / `prevMatch()`
5. **Viewport Changes**: PDFViewer → `controller.handleViewportChange()` → repaint highlights only

### 5.4 Legacy Code Removed

The following files have been **completely removed** in favor of the clean module architecture:
* ❌ `src/store/textStore.ts` → Replaced by `modules/store`
* ❌ `src/utils/coordinateProjection.ts` → Replaced by `modules/projector`
* ❌ `src/utils/__tests__/` → Tests moved to `modules/projector/__tests__/`
* ❌ `src/components/Layers/` → Merged into `components/HighlightLayer`
* ❌ `src/components/Debug/` → Replaced by `modules/diagnostics`
* ❌ `src/types/text.ts` → Consolidated into `types/viewport.ts`

---

## 6. Data Model (authoritative)

* **Viewport:** `{ width, height, scale, rotation }` (CSS px; rotation in {0,90,180,270}).
* **PdfRect:** `[x, y, w, h]` in PDF user units, origin bottom-left.
* **CssRect:** `[left, top, width, height]` in CSS pixels, origin top-left.
* **MatchRect:** `{ page, termId, order, bboxPdf, sourceDivId? }`

  * `order` is the global ordinal used by next/prev.
  * Only `MatchRect[]` is stored; CSS rectangles are derived per render.

---

## 7. Nominal Pipeline (per page)

1. **Tokenize**: Break `textContent` into tokens with character offsets.
2. **Match**: Compute query match spans over tokens.
3. **Build PDF rects**:

   * Measure tight substring rectangles in **CSS-space** for each span.
   * Convert each to **PDF-space** with the projector.
   * Persist `MatchRect[]` in the store.
4. **Project**: On render (load/zoom/rotation), convert each `bboxPdf` to a **CSS-space** rectangle using the current `Viewport`.
5. **Paint**: Draw absolutely positioned highlight nodes; mark the active match.

Navigation uses `order` to select the active match and scrolls by the projected CSS rectangle’s `top`.

---

## 8. Interfaces (contracts)

### 8.1 PDF Service (stateless)

* `load(file) → PDFDocument`
* `renderPage(pageNum, viewport, canvas) → Promise<void>`
* `renderTextLayer(pageNum, viewport, container) → Promise<TextDiv[]>`

### 8.2 Geometry

* `measureSubstrings(div, spans) → CssRect[]` (tight rectangles per substring)

### 8.3 Projector

* `pdfToCss(pdfRect, viewport) → CssRect`
* `cssToPdf(cssRect, viewport) → PdfRect`

### 8.4 Store

* `setMatchRects(page, rects: MatchRect[])`
* `getMatchRects(page) → MatchRect[]`
* `setActiveIndex(i)` / `getActiveIndex()` / `getTotalMatches()`

### 8.5 Renderer

* `paintHighlights(page, viewport, rects: MatchRect[], layerEl)`

### 8.6 Controller

* `setQuery(q)`; triggers page-level processing as text becomes available.
* `next()` / `prev()`; updates active index and scrolls.

---

## 9. Operational Modes

* **Initial load:** Render canvas and (when available) text layer; process visible pages first.
* **Search:** Clear previous matches; rebuild `MatchRect[]` lazily per page.
* **Zoom/rotation:** Recompute `Viewport`; resize page and overlays; **project and repaint only**.
* **Fallback text layout:** When no official text layer, compute numeric `left/top/width/height` from text matrices and the `Viewport`; avoid CSS transforms for positions used by code.

---

## 10. Performance and Resource Strategy

* Lazy processing by viewport visibility.
* O(N) repaint: project and paint only the visible page’s rectangles on zoom/rotation.
* Batch DOM insertions with fragments to cut layout thrash.
* Cache rendered canvases; discard far-off pages.

---

## 11. Reliability and Observability

* **Alignment validator:** Project page corners and a sample `MatchRect`; verify no drift across zoom/rotation.
* **Counters:** Pages processed, rectangles per page, total matches, active index.
* **Errors:** Surface PDF.js load/render failures and empty-match states in the UI.

---

## 12. Security and Privacy

* No network I/O for files; PDFs remain local to the browser session.
* No persistent storage of content unless the user exports.

---

## 13. Verification & Validation

### Unit

* **Projector round-trip:** CSS→PDF→CSS within ≤0.5 px across scales 0.75×–2× and rotations 0/90/180/270.
* **Substring measurement:** Tight coverage of matched glyphs; multi-run spans yield multiple rectangles.
* **Store semantics:** Order preservation; wraparound navigation.

### Integration

* **Alignment:** Highlights remain registered at 50%–300% zoom and all rotations.
* **Navigation:** Next/prev traverses all matches across pages and keeps the active match centered.
* **Fallback parity:** Fallback text layout matches official layer within 1 px.

---

## 14. Key Risks and Mitigations

* **Mixed index spaces:** Only use per-match rectangles; remove DIV-based indexing.
* **Transform side effects:** Do not rely on CSS transforms for geometry the code reads; compute numeric positions.
* **Partial rotation support:** All conversions go through the single projector that handles rotation and Y-flip.

---

## 15. Glossary

* **PDF-space:** Coordinates in PDF user units with bottom-left origin.
* **CSS-space:** Coordinates in CSS pixels with top-left origin.
* **Viewport:** The page’s size and transform at current zoom/rotation.
* **Per-match rectangle:** Tight box around a matched substring, possibly multiple per line.

---

This architecture fixes alignment at all zoom levels, keeps data flow simple, and isolates responsibilities for reliable maintenance and testing.
