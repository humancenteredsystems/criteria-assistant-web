Here are the README.md and architecture.md for the web version using Architecture 1:

## README.md

# Criteria Assistant Web v3.0.0

A modern web application for analyzing and annotating federal facility documents with live keyword highlighting and URL validation.

## ✨ Stable Milestone - Working Highlight Overlay System

**Current Status**: The highlight overlay system is now **fully functional and aligned** at default zoom levels. This represents a stable baseline with:
- Perfect text-to-highlight alignment using PDF-space coordinate projection
- Smooth search experience without PDF disappearing issues  
- Controlled auto-scroll (Next/Prev navigation only)
- Stable rendering pipeline with no infinite loops

*Reference commit: Stable, functional baseline*

## 🌐 Live Demo

**Try it now**: [https://criteria-assistant-web.onrender.com/](https://criteria-assistant-web.onrender.com/)

The live site automatically deploys from the `main` branch and showcases the latest features.

## 🚀 Features

- **Client-Side PDF Rendering**: Fast, responsive PDF viewing powered by PDF.js
- **PDF-Space Highlight Alignment**: Precise text highlighting that stays aligned at all zoom levels
- **Real-Time Search**: Live text search with debounced input and projection-based highlighting
- **Controlled Navigation**: Next/Previous match navigation with smart auto-scroll
- **Transparent Text Layer**: Hidden geometry layer for accurate text positioning
- **Debug Validation Tools**: Built-in alignment crosshairs for development verification
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **No Server Dependencies**: Everything runs in the browser for privacy and speed

## 🛠️ Tech Stack

**Frontend Framework**: React 18 with TypeScript  
**PDF Processing**: PDF.js (Mozilla)  
**UI Components**: Material-UI (MUI)  
**Styling**: CSS-in-JS with emotion  
**State Management**: Zustand  
**Build Tool**: Vite  
**Testing**: Vitest + React Testing Library  

## 📦 Installation

```bash
# Clone repository
git clone [repository-url]
cd criteria-assistant-web

# Install dependencies  
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── PDFViewer/      # PDF display and navigation
│   ├── AnnotationPanel/ # Sidebar controls
│   └── common/         # Shared UI components
├── services/           # Business logic
│   ├── pdfService.ts   # PDF.js wrapper
│   ├── annotationService.ts # Annotation processing
│   └── csvService.ts   # Data loading utilities
├── types/              # TypeScript definitions
├── hooks/              # Custom React hooks
└── assets/             # Static files and CSV data
```

## 💻 Development

**Start dev server**: `npm run dev`
**Run tests**: `npm test`
**Watch tests**: `npm run test:watch`
**Type checking**: `npm run type-check`
**Linting**: `npm run lint`

## 🧪 Testing Workflow

- `npm test` executes the Vitest suite once using a jsdom browser-like environment.
- `npm run test:watch` keeps Vitest running in watch mode for faster local feedback.
- Test helpers from React Testing Library are globally enhanced through `src/setupTests.ts`, which Vitest loads automatically to register the `@testing-library/jest-dom` matchers.

## 📊 Data Sources

Place your CSV files in `public/data/`:
- `keywords.csv` - Keyword categories and colors
- `url_validation_results.csv` - URL validation statuses

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+ 
- Safari 14+
- Edge 90+
