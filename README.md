Here are the README.md and architecture.md for the web version using Architecture 1:

## README.md

# Criteria Assistant Web v3.0.0

A modern web application for analyzing and annotating federal facility documents with live keyword highlighting and URL validation.

## 🚀 Features

- **Client-Side PDF Rendering**: Fast, responsive PDF viewing powered by PDF.js
- **Real-Time Text Extraction**: Extract text with precise positioning for accurate annotations  
- **Live Annotation System**: Highlight keywords, validate URLs, and overlay metadata
- **Interactive Sidebar**: Toggle annotation categories, view page statistics
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
**Type checking**: `npm run type-check`  
**Linting**: `npm run lint`

## 📊 Data Sources

Place your CSV files in `public/data/`:
- `keywords.csv` - Keyword categories and colors
- `url_validation_results.csv` - URL validation statuses

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+ 
- Safari 14+
- Edge 90+
