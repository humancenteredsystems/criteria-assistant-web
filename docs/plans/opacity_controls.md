# Opacity controls plan

## Goals
- Add independent opacity sliders in the sidebar for the base PDF canvas, DOM geometry layer, highlight layer, and annotation layer.
- Preserve the existing highlight opacity behavior while breaking it into targeted controls.
- Expose a debug visualization for the DOM geometry layer so increasing its opacity reveals layout boxes.
- Keep the PDF rendering pipeline responsive and avoid unnecessary rerenders.

## Current state recap
- `App.tsx` owns a single `overlayOpacity` state that is passed to `PDFViewer`.
- `PDFViewer` forwards that value to the text and highlight layers by mutating `style.opacity` on refs inside an effect.
- The base canvas is always opaque, and there is not yet a mounted annotation layer.

## State management strategy
1. Replace the single `overlayOpacity` state with a grouped object, e.g.:
   ```ts
   const [opacity, setOpacity] = useState({
     pdfCanvas: 100,
     domGeometry: 0,
     highlights: 70,
     annotations: 100,
   });
   ```
   - Initialize values so the UI matches today’s default highlight-heavy view (PDF fully visible, highlights ~70%).
   - Store percentages (0–100) because that aligns with slider UX. Convert to 0–1 when applying styles.
2. Build a helper updater: `setOpacity(key, value)` that clamps the value and updates state immutably.
3. Pass the full object to `PDFViewer` via a single prop (e.g. `opacitySettings`).
4. Plan for future global access (Zustand) by typing the structure cleanly, but local state is sufficient for this iteration.

## Sidebar UI updates
1. Convert the sidebar slider block into a reusable component (`OpacitySlider`) that takes `id`, `label`, `value`, and `onChange`.
2. Render sliders in this order when a file is loaded:
   - Highlight overlay (existing behavior).
   - Base PDF canvas (`pdfCanvas`).
   - DOM geometry (`domGeometry`).
   - Annotation layer (`annotations`).
3. Add helper copy below or inline with each control explaining what the slider adjusts (optional, but plan for tooltips later).
4. Keep keyboard accessibility by using native `<input type="range">` and associating each with a `<label>`.

## Applying opacity inside `PDFViewer`
1. Extend the component props:
   ```ts
   interface PDFViewerProps {
     file: File;
     opacity: {
       pdfCanvas: number;
       domGeometry: number;
       highlights: number;
       annotations: number;
     };
   }
   ```
2. Base canvas (`canvasRef`): inside the render effect (or a dedicated `useEffect`), set `canvasRef.current.style.opacity` using `opacity.pdfCanvas / 100`.
   - Ensure the effect runs after each slider change but avoids rerendering the canvas bitmap (only update style).
3. Text layer (`textLayerRef`): update `style.opacity` from `opacity.domGeometry / 100`.
4. Highlight layer (`hlLayerRef`): update `style.opacity` from `opacity.highlights / 100` (preserving existing effect).
5. Annotation layer: add a positioned `<div className="annotation-layer" ref={annotationLayerRef} />` adjacent to the highlight layer in the page stack.
   - Apply `style.opacity` from `opacity.annotations / 100` even if the layer is empty today.
6. Consolidate the opacity-sync logic into a single `useEffect` that depends on `opacity` and the relevant refs to avoid repeated code.
7. Guard each update with null checks because the ref might be unset during initial render or document switches.

## DOM geometry debug style
1. Create a CSS modifier class (e.g. `.textLayer.debug-geometry`) that gives each span a subtle translucent background or outline:
   ```css
   .textLayer.debug-geometry span {
     background-color: rgba(0, 128, 255, 0.25);
     outline: 1px solid rgba(0, 128, 255, 0.4);
     color: transparent !important;
   }
   ```
   - Keep text transparent to avoid duplicate glyphs.
2. Toggle the class from `PDFViewer` whenever `opacity.domGeometry` exceeds 0 (or a small threshold like 5 to avoid noise when it is effectively hidden).
   - Use `classList.add('debug-geometry')` / `classList.remove('debug-geometry')` on the `textLayerRef` element inside the opacity effect.
3. Optionally, expose a hard debug toggle later if designers want to see boxes without opacity changes.

## Annotation layer placeholder
1. Define a new ref (`annotationLayerRef`) in `PDFViewer` and include the `<div className="annotation-layer">` in the JSX so the opacity slider has an element to target.
2. Keep pointer events enabled (`pointer-events: auto`) per existing CSS to avoid blocking future annotation interactions.
3. When the real annotation renderer lands, it will mount into this div and inherit the opacity styling automatically.

## Testing checklist
- Load a PDF and confirm each slider updates the appropriate layer independently (visually verify opacity changes).
- Ensure the DOM geometry layer reveals blue boxes when opacity > 0 and hides them again when returning to 0.
- Verify that setting canvas opacity to 0 leaves overlays interactive (no crashes, highlight slider still works).
- Confirm no console errors when switching pages or toggling the alignment debug overlay.
- Run `npm run lint` / `npm run test` to guard against regressions after wiring the new code.

## Follow-up considerations
- Persist user-selected opacity settings in local storage so they survive reloads.
- Replace inline slider list with a dedicated Sidebar component once additional controls (filters, sections) are added.
- Provide numeric inputs or reset buttons for power users who want precise values.
