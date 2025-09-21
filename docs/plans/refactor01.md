Here’s what’s off in the current code, why it drifts when you zoom, and the simple rules to make the DOM overlay always register with the rendered PDF.

Problems in the codebase that cause mis-alignment

1. Wrong Y-axis mapping when caching rects
   You convert CSS rects → PDF units by just dividing by `scale` (no origin flip). PDF coordinates are bottom-left; CSS is top-left. Your `cssToPdfRect` ignores page height, so all cached `pdfRects` have incorrect Y and will re-project wrong at non-default zooms.&#x20;

2. Highlights ignore rotation and page height
   Canvas/text layer use `page.getViewport({ scale, rotation })`. The highlight layer “viewport” is a stub `{ width: 0, height: 0, scale }`, and your projectors don’t incorporate rotation or page height. That guarantees drift on rotated documents and makes any Y inversion impossible. &#x20;

3. Manual text layer fallback applies CSS transforms the extractor never reads
   In the fallback path you apply `transform: scaleX(...) scaleY(...)` to text divs based on the PDF text matrix. Later you read only `left/top/width/height` from inline styles, ignoring the transform. Any page that renders via fallback will cache the wrong geometry. &#x20;

4. Debug crosshairs built with the same Y-assumption bug
   The validator creates “PDF corner” crosshairs and projects them with the same top-left assumption. This can mask the real origin error during debugging. &#x20;

5. Layer sizing is correct, but the projector is the single source of truth—and it’s incomplete
   You do set `pageEl`, `canvas`, `textLayer`, and `highlightLayer` to the exact `viewport.width/height` each render (good), but the projection functions don’t share the same full `viewport` (scale + rotation + height). That mismatch shows up as zoom-dependent drift.&#x20;

6. “Fit Width / Fit Page” are hardcoded scales, not true fit logic
   That’s not an alignment bug, but it can hide them. A real fit-width recomputes `scale` from container width each time; hardcoding keeps scale values that don’t reflect the page box.&#x20;

What “good” looks like: simple, universal principles
Apply these and alignment will hold at any zoom/rotation/DPR.

A) One viewport to rule them all

* Compute `const viewport = page.getViewport({ scale, rotation })` once per render step.
* Use that same `viewport` to:

  * set `pageEl`, `canvas.style.*`, actual `canvas.width/height` (with DPR), and both overlay layer sizes, and
  * project between CSS pixels ↔︎ PDF user units. &#x20;

B) Cache geometry in PDF space; re-project on every draw

* After the text layer is rendered, read each text box once, convert to **PDF user units**, and store.
* On every zoom (or rotation) change, re-project those PDF rects back to CSS using the current `viewport`. Never read live DOM geometry again to “scale by hand.” &#x20;

C) Do the Y-axis properly

* CSS→PDF: `pdfY = (viewport.height - (cssTop + cssHeight)) / scale`
* PDF→CSS: `cssTop = viewport.height - (pdfY * scale + pdfH * scale)`
  Your current `cssToPdfRect`/`pdfToCssRect` only divide/multiply by `scale` and never use `height`. Fix both to respect the origin flip.&#x20;

D) Respect rotation in both directions

* Include `rotation` in the projector. Either:

  * use PDF.js helpers (preferred), or
  * apply a rotation matrix around the page origin consistently for CSS↔︎PDF.
    Right now the canvas/text layer use `rotation`, but the highlight projector ignores it. &#x20;

E) Never rely on CSS transforms for geometry you later read as numbers

* If you must apply a CSS `transform` to text divs in the fallback, bake that scale into the stored rects before caching, or avoid the transform and compute sized boxes numerically. Your extractor doesn’t read transforms. &#x20;

F) Separate device pixels from CSS pixels

* Keep all overlay math in **CSS pixels** sized by `viewport.width/height`.
* Let canvas handle DPR via `transform: [dpr, 0, 0, dpr, 0, 0]` and larger backing store sizes. Don’t apply DPR to overlay coordinates. You already follow this—keep it.&#x20;

G) Zero offsets and no extra CSS

* `pageEl` should be `position:relative; width/height = viewport.*`.
* Overlays must be `position:absolute; left:0; top:0; width/height = viewport.*`.
* No borders/padding/margins on `pageEl` or overlay containers. Your CSS is close; keep it strict. &#x20;

H) One projector function, unit-tested

* Centralize `css↔︎pdf` in one module that takes the full `viewport` (width, height, scale, rotation).
* Unit test at scales 0.75×, 1×, 1.5×, 2× with rotated pages. Your test plan calls for this—implement it.&#x20;

Concrete fixes (surgical)

* Fix the converters to include height and rotation. Replace both calls with a single API that knows the viewport:

  * In `coordinateProjection.ts`, implement correct Y and rotation handling (both directions). Today’s versions are scale-only.&#x20;
* Pass the **real** viewport (with width/height/rotation) into `HighlightLayer` instead of `{ width: 0, height: 0, scale }`.&#x20;
* In the manual text layer fallback, don’t rely on CSS `transform`. Compute `left/top/width/height` numerically from the text matrix and write those values directly so `extractCssRect` reads the final geometry. &#x20;
* Update `AlignmentValidator` to use the corrected projector so the crosshairs reveal, not hide, origin mistakes. &#x20;

Other elements that must align for a solid UX

* Transparent text geometry layer (hit-testing, selection, search scroll-to): same projector and viewport.&#x20;
* Search highlights: as above, projected from cached PDF-space rects every zoom.&#x20;
* SVG annotation layer (boxes/arrows/notes): set `width/height` to `viewport.*` and `viewBox="0 0 viewport.width viewport.height"`. Recompute on zoom; avoid CSS transforms. &#x20;
* Pointer coordinates for creating/moving annotations: convert pointer CSS pixels → PDF units using the same projector so persistence is scale-independent. (Your plan assumes PDF-space storage; keep that.)&#x20;
* Scroll/jump targets (e.g., section outline): store anchors in PDF space (page, y). On navigation, compute CSS `top` from the viewport and scroll the `viewer-container` to it.&#x20;

Bottom line
Fix the projector (Y inversion + rotation + height), pass the actual viewport everywhere, and stop mixing CSS transforms with numerically computed geometry. With those changes, overlays will stay locked to the PDF at any zoom and on rotated pages.
