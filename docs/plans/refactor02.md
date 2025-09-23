Here’s the single, unified plan. Hand this to the intern and have them work straight down the list.

Baseline objectives

* One data model.
* One projector.
* Store only PDF-space rects.
* Overlay paints from projected rects at any zoom/rotation/DPR.
* Search/navigation operate on per-match rect indices.

Data model (use everywhere)

```ts
type Viewport = { width: number; height: number; scale: number; rotation: 0|90|180|270 };

type MatchRect = {
  page: number;
  termId: string;
  order: number;            // global ordinal for next/prev
  bboxPdf: [number, number, number, number]; // x,y,w,h in PDF user units (origin bottom-left)
  sourceDivId?: string;     // optional for scroll hint
};
```

Module layout

1. tokenizer/

   * `tokenize(text: string): Token[]`
2. matcher/

   * `findMatches(tokens: Token[], query: string): MatchSpan[]` // spans in char indexes
3. geometry/

   * `measureSubstrings(div: HTMLElement, spans: MatchSpan[]): CssRect[]` // tight rectangles in CSS px for that DIV (may return multiple rects)
4. projector/

   * `pdfToCss(bboxPdf: [x,y,w,h], vp: Viewport): CssRect`
   * `cssToPdf(cssRect: CssRect, vp: Viewport): [x,y,w,h]`
   * implementation rotates all four corners, computes min/max; handles Y-flip with vp.height
5. store/

   * `setMatchRects(page: number, rects: MatchRect[])`
   * `getMatchRects(page: number): MatchRect[]`
   * `setActiveIndex(i: number); getActiveIndex(): number`
6. renderer/

   * `paintHighlights(page: number, vp: Viewport, rects: MatchRect[], layerEl: HTMLElement)`
7. controller/

   * SearchBar wires query → pipeline; Next/Prev updates active index and scroll
   * Zoom/Rotate recompute `Viewport` and call `paintHighlights` (no geometry recalc)
8. textlayer\_fallback/

   * Build numeric `left/top/width/height` from text matrix and viewport; do not use CSS transforms

Implementation order

Phase 0 — prerequisites

* Lock CSS for the page container and overlay layers:

  * `#page { position:relative; width:vp.width; height:vp.height; }`
  * `.overlay { position:absolute; left:0; top:0; width:vp.width; height:vp.height; pointer-events:none; }`
* Canvas handles DPR; overlays never apply DPR math.

Done when: page, text layer, and empty overlay all size to the same `Viewport`.

Phase 1 — single projector (replace all ad-hoc math)

* Implement `pdfToCss` and `cssToPdf`.

  * Rotate rectangle by rotating its four corners around origin based on `vp.rotation`; then Y-flip: `cssY = vp.height - (pdfY * vp.scale) - (pdfH * vp.scale)` when rotation=0; generalize via corner rotation.
* Unit tests:

  * Round-trip a rect at scales 0.75/1/1.5/2 and rotations 0/90/180/270. Max error ≤ 0.5 CSS px.

Done when: tests pass; all other code must import this projector.

Phase 2 — substring-tight geometry in CSS, then cache in PDF

* For each text DIV on a rendered page:

  * Tokenize its `textContent`.
  * Match query → `MatchSpan[]`.
  * `measureSubstrings(div, spans)` returns one or more tight `CssRect`s. Use `range.getClientRects()` when available; else compute via font metrics you already have.
  * For each `CssRect`, call `cssToPdf(rect, viewport)` to get `bboxPdf`.
  * Push a `MatchRect` with `page`, `termId`, `order` (incrementing), `bboxPdf`, `sourceDivId`.
* After the page completes: `store.setMatchRects(page, rects)`.
* Kill any legacy `setPageMatches` / DIV-index lists.

Done when: store contains only `MatchRect[]` in PDF space; no code depends on DIV indexes.

Phase 3 — paint from PDF rects on every render

* `paintHighlights(page, vp, rects, layerEl)`:

  * Clear `layerEl`.
  * For each rect in `rects`: `const r = pdfToCss(rect.bboxPdf, vp)`, create absolutely positioned highlight `<div>` with `left/top/width/height` from `r`.
  * Add an “active” style when index === `getActiveIndex()`.
* Hook zoom/rotation:

  * On any viewport change, re-invoke `paintHighlights` with the same PDF rects; do not recompute geometry.

Done when: highlights stay locked at all zoom levels and rotations.

Phase 4 — search controller and navigation

* Search:

  * On query change, clear store for all pages; re-run Phase 2 during/after text layer render for visible pages; lazy-load others on demand.
* Next/Prev:

  * `const i = getActiveIndex(); setActiveIndex(clamp(i±1))`
  * Scroll: compute `cssTop` from `pdfToCss(active.bboxPdf, currentVp).top` and scroll the page container to that offset; if `sourceDivId` exists, also `div.scrollIntoView({block:'center'})` as a hint.
* Totals:

  * `total = sum(getMatchRects(page).length over pages)`

Done when: search shows total, Next/Prev cycles correctly, and scrolling centers the active match.

Phase 5 — fallback text layer without CSS transforms

* When PDF.js returns text matrices, compute:

  * `left = (tx * vp.scale)`; `top = vp.height - ((ty + h) * vp.scale)`; `width = w * vp.scale`; `height = h * vp.scale` after rotation handling via projector.
* Write numeric `style.left/top/width/height` on each text DIV. Do not set `transform:`. If a transform is unavoidable, do not read geometry from styles; derive from matrices directly and bypass DOM reads.

Done when: substring rects in fallback pages match official text layer pages within 1 px.

Fit modes

* Fit Width: `scale = container.clientWidth / vp.widthAtScale1` where `vp.widthAtScale1` comes from `page.getViewport({scale:1, rotation}).width`.
* Fit Page: `scale = min(container.clientWidth / widthAt1, container.clientHeight / heightAt1)`.

Diagnostics

* “Validate Alignment” button overlays four projected PDF-corner crosshairs and one sample `MatchRect`. If they drift on zoom/rotate, the projector is wrong.
* Log counts: pages processed, rects per page, active index/page.

Acceptance tests (manual)

* Single- and multi-column PDFs.
* Rotations 0/90/180/270.
* Zoom 50%–300%.
* Mixed fonts and ligatures; verify substring boxes hug glyphs.
* Long document navigation: Next/Prev wraps across pages and keeps alignment.

Out-of-scope (defer)

* Multi-page batching/worker threads.
* Heuristics for hyphenation across line breaks.
* OCR fallback.

Deliverables

* PR 1: projector + tests (Phase 1).
* PR 2: substring geometry + PDF-space caching (Phase 2) with sample page working.
* PR 3: paint pipeline + zoom/rotate wiring (Phase 3).
* PR 4: search controller + navigation (Phase 4).
* PR 5: fallback text layer rework (Phase 5) + alignment validator.

Definition of done

* All unit tests green.
* Manual acceptance tests pass.
* No CSS transforms used for any geometry we later read numerically.
* Only PDF-space rects persisted; overlays render solely from `pdfToCss(rect, viewport)`.
