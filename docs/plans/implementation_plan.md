# Implementation Plan

This document outlines a step-by-step implementation plan for the Criteria Assistant Web application. Each phase builds on the previous, ensuring modular, maintainable code with consistent patterns and best practices.

---

## Project-Wide Best Practices Checklist
- [ ] Initialize Git repository and configure `.gitignore`
- [ ] Configure ESLint, Prettier, and Husky + lint-staged
- [ ] Establish folder structure:
  ```
  src/
  ├── assets/
  ├── components/
  ├── hooks/
  ├── services/
  ├── types/
  └── utils/
  ```
- [ ] Set up CI pipeline to run lint, type-check, and tests on each push
- [ ] Use TypeScript interfaces/types for all code
- [ ] Write unit tests (Vitest + React Testing Library) for services and core components
- [ ] Use Context7 MCP to fetch documentation for external libraries before implementation
- [ ] Enforce modular design: single responsibility, small focused components and hooks

---

## Phase 1: Foundation – Basic PDF Display
- [ ] Create new Vite project (React + TypeScript)
- [ ] Install dependencies:
  - `pdfjs-dist`
  - `@mui/material` + `@emotion/react` + `@emotion/styled`
  - `zustand`
- [ ] Build `pdfService.ts` in `src/services/` as a PDF.js wrapper
- [ ] Create `PDFViewer` component:
  - Canvas container, render page via `pdfService.renderPage`
  - Controls: Next/Previous page, Zoom In/Out, Fit-to-Width, Fit-to-Page
- [ ] Implement file-upload component (`FileUpload.tsx`)
- [ ] Add page thumbnails sidebar (`ThumbnailList.tsx`)
- [ ] Verify PDF loading and navigation in dev server

---

## Phase 2: Text Extraction & Search
- [ ] Extend `pdfService.extractText(pageNum)` to return text items with coordinates
- [ ] Create `TextLayer` component to overlay selectable text
- [ ] Implement global search bar (`SearchBar.tsx`):
  - Highlight matches in `TextLayer`
  - Navigate match occurrences
- [ ] Store extracted text in Zustand store for caching
- [ ] Test text selection, copy-to-clipboard, and search functionality

---

## Phase 3: Manual Annotation System
- [ ] Define `Annotation` type in `src/types/annotation.ts`
- [ ] Implement `annotationService.ts`:
  - Methods: `create`, `edit`, `delete`, `list`, `toggleVisibility`
- [ ] Build `AnnotationLayer` component (SVG overlays)
- [ ] Create `AnnotationToolbar` for category/colors
- [ ] Persist annotations to `localStorage` via a custom hook (`useAnnotations`)
- [ ] Export/import annotations JSON (`ExportControls.tsx`)
- [ ] Add annotation visibility toggles in sidebar

---

## Phase 4: Deontic Classification Engine
- [ ] Create `deonticKeywords.ts` in `src/utils/` with lists of “must/shall”, “should/may”, etc.
- [ ] Extend `annotationService.findAnnotations` to auto-detect deontic statements
- [ ] Add `ClassificationService` for tokenization + rule engine
- [ ] Color-code hard vs soft vs informational requirements in `AnnotationLayer`
- [ ] Build `StatsPanel` component to show counts by category

---

## Phase 5: Document Structure Extraction
- [ ] Implement heading detection in `StructureService`:
  - Analyze font-size/style from `textContent` metadata
  - Identify titles, headings, subheadings
- [ ] Build `OutlinePanel` component with hierarchical tree view (MUI TreeView)
- [ ] Add “Jump to Section” by scrolling canvas and text layer
- [ ] Test detection on sample federal facility PDFs

---

## Phase 6: Named Entity Recognition & References
- [ ] Define regex patterns in `namedEntityConfig.ts` for:
  - Document references (UFC/UFGS codes)
  - Standards (ASTM, ISO, IEEE)
  - Organizations/agencies
- [ ] Implement `entityExtractionService.ts`
- [ ] Extend `AnnotationLayer` to highlight entities
- [ ] Build `ReferencePanel` listing all extracted entities
- [ ] Enable click-through to referenced page/section
- [ ] Validate references against local JSON index (`src/assets/references.json`)

---

## Phase 7: Advanced NLP & Data Export
- [ ] Integrate simple NLP pipeline in `NLPService` (tokenization + context rules)
- [ ] Implement requirement dependency mapping utility
- [ ] Create `ExportService` supporting:
  - JSON (full metadata)
  - CSV (requirements matrix)
  - Annotated PDF (PDF.js + canvas)
  - DOCX export (via `docx` library)
- [ ] Add role management (Editor vs Viewer) with Zustand + UI controls
- [ ] Implement batch document processing flow
- [ ] Write end-to-end tests covering export scenarios

---

## Next Steps
1. Check off **Project-Wide Best Practices** and **Phase 1** items.
2. Begin Phase 1 implementation in source code.
3. After completing Phase 1, mark it complete and proceed to Phase 2.
