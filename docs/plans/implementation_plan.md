# implementation\_plan.md

Purpose: ship a PDF review tool with fast search, aligned highlights, manual annotations, requirement tagging, and section navigation. This plan fixes the earlier worker/import issues and removes the misaligned “second text” problem by using a transparent geometry layer over a canvas-rendered base PDF.

---

## Phase 0 — Guardrails

**Goals**

* Consistent local/build behavior.
* Lock versions that failed on Render.

**Tasks**

* Pin deps: `zustand@^4`, `pdfjs-dist@^4`, `vite@^5`, `typescript@^5`.
* Enforce Zustand imports:

  ```ts
  import { create } from 'zustand';
  ```
* Set the PDF.js worker once:

  ```ts
  // src/services/pdfService.ts
  import * as pdfjsLib from 'pdfjs-dist';
  import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;
  ```

**Exit**

* `npm run build` passes locally and on Render.

---

## Phase 1 — Base PDF (canvas-first)

**Goals**

* Render each page to a HiDPI-correct canvas.
* Provide zoom controls (Fit Width, Fit Page, ±).
* Define layer stacking.

**Tasks**

* Canvas render uses the same `viewport` as all overlays:

  ```ts
  const viewport = page.getViewport({ scale });
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width  = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  canvas.width  = Math.floor(viewport.width  * dpr);
  canvas.height = Math.floor(viewport.height * dpr);

  await page.render({
    canvasContext: ctx,
    viewport,
    transform: [dpr, 0, 0, dpr, 0, 0],
  }).promise;
  ```
* Stacking and container CSS:

  ```css
  .viewer-container { position: relative; }
  .pdf-canvas      { position: relative; z-index: 0; }
  .textLayer       { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
  .highlightLayer  { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
  .annotationLayer { position: absolute; inset: 0; z-index: 3; pointer-events: auto; }
  ```
* Wire zoom and fit to `scale` state.

**Exit**

* Crisp pages at any zoom. No console errors.

---

## Phase 2 — Geometry Overlay + Search (transparent text layer)

**Intent preserved**

* Extract positioned text per page.
* Search and highlight matches.
* Cache extracted text.
* Auto-scroll to active match.
* No visible duplicate glyphs.

**Design**

* Use PDF.js `renderTextLayer` to build DOM spans aligned to the canvas.
* Hide all glyphs (100% transparent); keep layout boxes for geometry.
* Draw highlights on a sibling `.highlightLayer` as positioned `<div>`s.

**Tasks**

1. Geometry layer (transparent)

```ts
const textLayerEl = ensureDiv(pageEl, 'textLayer');
textLayerEl.style.width  = `${viewport.width}px`;
textLayerEl.style.height = `${viewport.height}px`;
textLayerEl.innerHTML = '';

const textContent = await page.getTextContent();
const textDivs: HTMLElement[] = [];
await (pdfjsLib as any).renderTextLayer({
  textContent,
  container: textLayerEl,
  viewport,
  textDivs,
});
```

2. Hide glyphs, keep geometry

```css
.textLayer,
.textLayer span,
.textLayer div {
  color: transparent !important;
  text-shadow: none !important;
  caret-color: transparent;
}
```

3. Highlights

```css
.highlight { position: absolute; background: rgba(255,235,59,.45); }
.highlight.active { outline: 2px solid #f57c00; }
```

```ts
const hl = ensureDiv(pageEl, 'highlightLayer');
hl.innerHTML = '';
getRectsForMatch(textDivs, range, textLayerEl).forEach((b, i) => {
  const d = document.createElement('div');
  d.className = i === activeLocalIndex ? 'highlight active' : 'highlight';
  Object.assign(d.style, { left:`${b.left}px`, top:`${b.top}px`, width:`${b.width}px`, height:`${b.height}px` });
  hl.appendChild(d);
});
```

4. Search UI + state

* Keep existing `SearchBar`.
* Zustand:

  * `textByPage: Record<number, ExtractedSpan[]>`
  * `matchesByPage: Record<number, Match[]>`
  * `activeMatchGlobalIndex: number`

5. Rescale pipeline

* On any `scale` change:

  1. Re-render canvas
  2. Re-render `renderTextLayer` with the same `viewport`
  3. Rebuild highlights from `textDivs`
* Auto-scroll:

  ```ts
  activeEl?.scrollIntoView({ block: 'center', inline: 'center' });
  ```

**Exit**

* Search shows, counts correct, highlights align at all zoom levels, active match centers on Next/Prev. No visible second text copy.

---

## Phase 3 — Annotation Layer (SVG)

**Intent preserved**

* Create boxes/arrows/notes.
* Select, move, resize, delete.
* Persist per page.

**Design**

* SVG in `.annotationLayer`. Use CSS pixels; set `viewBox` to page width/height. No CSS scaling.

**Tasks**

* Types

  ```ts
  type AnnotationId = string;
  type Kind = 'span' | 'box' | 'arrow' | 'note';
  type Annotation = {
    id: AnnotationId; page: number; kind: Kind;
    rect: { x:number; y:number; width:number; height:number };
    labels?: string[]; note?: string; createdAt:number; updatedAt:number;
  };
  ```
* Stores/services

  * `annotationStore` (CRUD, selection).
  * `annotationService` (import/export).
* Toolbar

  * Modes: Select | Box | Arrow | Note | Delete.
* Persistence

  * `localStorage` initially; service hook for backend later.
* Zoom behavior

  * Recompute SVG size and `viewBox` on scale changes; no manual transforms.

**Exit**

* Create and edit annotations with stable alignment across zoom.

---

## Phase 4 — Requirement Tagging

**Intent preserved**

* Tag spans or boxes with requirement classes.
* Color map and counts.
* Filter by label.

**Tasks**

* Extend `Annotation.labels: string[]`.
* Palette: `MUST`, `SHALL`, `SHOULD`, `MAY`, `FORBIDDEN`, etc.
* UI: tag picker on selection; legend with toggles.
* Rendering: stroke/fill by label.
* Stats: counts by label; click-to-filter.

**Exit**

* Apply/remove labels. Filter and count work.

---

## Phase 5 — Document Structure Navigation

**Intent preserved**

* Detect headings and sections from extracted text metadata.
* Jump to section.

**Tasks**

* Derive headings from `textContent.items` (font size/weight/spacing).
* Build outline with page + y-offset.
* Sidebar list → scroll viewer to target; re-sync all layers.

**Exit**

* Sidebar shows sections. Jumps land at correct positions with aligned overlays.

---

## Phase 6 — Export and Share

**Intent preserved**

* Export annotations/labels.
* Optional: export highlighted search hits.

**Tasks**

* JSON export/import for annotations.
* CSV export: `page, bbox, labels, snippet, note, createdAt`.
* Optional image export: rasterize current page + SVG overlay to PNG.

**Exit**

* Round-trip JSON. Download CSV.

---

## Phase 7 — Performance, QA, Accessibility

**Goals**

* Smooth on long PDFs.
* Solid keyboard support.

**Tasks**

* Virtualize pages (only render near viewport).
* Cache `textContent` per page.
* Debounce search and rehighlight.
* Keyboard:

  * `/` focus search, `Enter` next, `Shift+Enter` prev.
  * `Del` delete selection.
* ARIA:

  * Labels for toolbar, search controls.
* Tests:

  * Alignment tests at scales 0.75×, 1×, 1.5×, 2×.
  * Memory check after rapid zoom/scroll.

**Exit**

* 60 FPS feel while scrolling. No leaks across zoom cycles. Shortcuts work.

---

## Phase 8 — Telemetry and Deploy

**Goals**

* Safe usage metrics.
* Stable Render deploy.

**Tasks**

* Env flag gates telemetry.
* Events (anonymous): `search_used`, `annotation_created`, `label_applied`, `section_jump`.
* Sanitize exports/logs.

**Exit**

* Build and deploy on Render with telemetry off by default.

---

## Folder layout

```
src/
  components/
    PDFViewer/
      PDFViewer.tsx
      PDFViewer.css
    SearchBar/
      SearchBar.tsx
      SearchBar.css
    Layers/
      TextLayer.css          // transparent geometry only
      HighlightLayer.tsx     // search rectangles
      AnnotationLayer.tsx    // SVG annotations
  services/
    pdfService.ts
    annotationService.ts
  store/
    textStore.ts
    searchStore.ts
    annotationStore.ts
  utils/
    highlight.ts
    ensure.ts
```

---

## Test plan

* **P1**: load a PDF; zoom ±; Fit Width/Page; text is crisp; no worker errors.
* **P2**: search “final”; count > 0; rectangles align at 100%, 150%, 200%; Next/Prev centers active match; no visible duplicate text.
* **P3**: draw a box; zoom; box stays aligned; reload restores it.
* **P4**: tag a box `SHALL`; legend shows count; filter toggles visibility.
* **P5**: click a heading; viewer scrolls; all layers remain aligned.
* **P6**: export JSON; clear; import; annotations return in place.
* **P7**: open a 300-page PDF; fast scroll; memory remains stable; keyboard shortcuts work.
* **P8**: Render build passes; telemetry flag works.

---

## Definition of done

* Base PDF draws on canvas; overlays align at any zoom.
* Geometry layer is transparent; no duplicate glyphs on screen.
* Search highlights and annotations render on separate layers.
* Worker set via ES module URL; no hardcoded path.
* Zustand imports use `create` named import.
* Build and deploy succeed on Render.
