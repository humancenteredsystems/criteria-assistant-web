# Integration Example: Using the Refactored PDF-Space Architecture

This document shows how to integrate the new refactored modules with existing components.

## Quick Start

```typescript
import { 
  searchController, 
  matchStore, 
  Viewport,
  calculateFitWidth,
  validateAlignment,
  performanceTracker
} from '../modules';

// 1. Set up viewport
const viewport: Viewport = {
  width: 800,
  height: 600,
  scale: 1.0,
  rotation: 0
};

// 2. Process search for a page
await searchController.processPageSearch(
  pageNumber,
  searchQuery,
  textLayerElement,
  viewport,
  highlightLayerElement
);

// 3. Navigate matches
searchController.nextMatch();
searchController.prevMatch();

// 4. Handle viewport changes (zoom/rotation)
const newViewport = calculateFitWidth(pageDimensions, containerDimensions);
searchController.handleViewportChange(newViewport, visiblePages);
```

## Complete Integration Example

### 1. Replace Existing HighlightLayer Component

```typescript
// Before (old approach)
import useTextStore from '../../store/textStore';
import { pdfToCssRect } from '../../utils/coordinateProjection';

// After (new approach)
import { searchController, Viewport } from '../../modules';

const HighlightLayer: React.FC<Props> = ({ 
  pageNum, 
  viewport, 
  textLayerRef, 
  hlLayerRef 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = searchController.subscribe((stats) => {
      console.log(`${stats.totalMatches} matches found`);
    });
    return unsubscribe;
  }, []);
  
  // Process search when query changes
  useEffect(() => {
    if (textLayerRef.current && hlLayerRef.current) {
      searchController.processPageSearch(
        pageNum,
        searchQuery,
        textLayerRef.current,
        viewport,
        hlLayerRef.current
      );
    }
  }, [searchQuery, pageNum, viewport]);
  
  // Re-render on viewport changes (zoom/rotation)
  useEffect(() => {
    if (hlLayerRef.current) {
      searchController.renderPageHighlights(
        pageNum,
        viewport,
        hlLayerRef.current
      );
    }
  }, [viewport]);
  
  return null; // Highlights rendered directly to DOM
};
```

### 2. Update SearchBar Component

```typescript
import { searchController } from '../../modules';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ totalMatches: 0, activeIndex: -1 });
  
  useEffect(() => {
    const unsubscribe = searchController.subscribe(setStats);
    return unsubscribe;
  }, []);
  
  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    searchController.startNewSearch(newQuery);
  };
  
  const handleNext = () => searchController.nextMatch();
  const handlePrev = () => searchController.prevMatch();
  
  return (
    <div className="search-bar">
      <input 
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      <button onClick={handlePrev}>Previous</button>
      <button onClick={handleNext}>Next</button>
      <span>
        {stats.activeIndex + 1} of {stats.totalMatches}
      </span>
    </div>
  );
};
```

### 3. Update PDFViewer with Fit Modes

```typescript
import { 
  calculateFitWidth, 
  calculateFitPage, 
  calculateCustomScale,
  Viewport 
} from '../../modules';

const PDFViewer: React.FC = () => {
  const [viewport, setViewport] = useState<Viewport>({
    width: 800,
    height: 600,
    scale: 1.0,
    rotation: 0
  });
  
  const handleFitWidth = () => {
    const newViewport = calculateFitWidth(
      pageDimensions,
      containerDimensions,
      viewport.rotation
    );
    setViewport(newViewport);
  };
  
  const handleFitPage = () => {
    const newViewport = calculateFitPage(
      pageDimensions,
      containerDimensions,
      viewport.rotation
    );
    setViewport(newViewport);
  };
  
  const handleZoom = (scale: number) => {
    const newViewport = calculateCustomScale(
      pageDimensions,
      scale,
      viewport.rotation
    );
    setViewport(newViewport);
  };
  
  const handleRotate = () => {
    const newRotation = ((viewport.rotation + 90) % 360) as 0|90|180|270;
    const newViewport = calculateCustomScale(
      pageDimensions,
      viewport.scale,
      newRotation
    );
    setViewport(newViewport);
  };
  
  return (
    <div className="pdf-viewer">
      <div className="controls">
        <button onClick={handleFitWidth}>Fit Width</button>
        <button onClick={handleFitPage}>Fit Page</button>
        <button onClick={() => handleZoom(0.5)}>50%</button>
        <button onClick={() => handleZoom(1.0)}>100%</button>
        <button onClick={() => handleZoom(2.0)}>200%</button>
        <button onClick={handleRotate}>Rotate</button>
      </div>
      
      <div className="page-container" style={{
        width: viewport.width,
        height: viewport.height
      }}>
        <canvas className="pdf-canvas" />
        <div className="textLayer" />
        <div className="highlightLayer" />
      </div>
    </div>
  );
};
```

### 4. Add Diagnostics and Performance Monitoring

```typescript
import { 
  validateAlignment,
  createAlignmentValidator,
  createPerformanceMonitor,
  performanceTracker
} from '../../modules';

const DiagnosticsPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (containerRef.current) {
      // Add alignment validator
      createAlignmentValidator(containerRef.current, (result) => {
        console.log('Alignment validation:', result);
      });
      
      // Add performance monitor
      createPerformanceMonitor(containerRef.current, performanceTracker);
    }
  }, []);
  
  const handleValidateAlignment = () => {
    const debugLayer = document.querySelector('.debug-layer') as HTMLElement;
    if (debugLayer) {
      const result = validateAlignment(currentViewport, debugLayer);
      console.log('Validation result:', result);
    }
  };
  
  return (
    <div ref={containerRef} className="diagnostics-panel">
      <button onClick={handleValidateAlignment}>
        Validate Alignment
      </button>
    </div>
  );
};
```

### 5. Handle Fallback Text Layer

```typescript
import { 
  createFallbackTextLayer,
  updateFallbackTextLayer,
  needsFallbackTextLayer
} from '../../modules';

const TextLayerManager: React.FC = ({ 
  textItems, 
  viewport, 
  textLayerRef 
}) => {
  const [fallbackElements, setFallbackElements] = useState<HTMLElement[]>([]);
  
  useEffect(() => {
    if (!textLayerRef.current) return;
    
    // Check if we need fallback text layer
    if (needsFallbackTextLayer(textLayerRef.current, textItems)) {
      console.log('Using fallback text layer');
      
      const elements = createFallbackTextLayer(
        textItems,
        viewport,
        textLayerRef.current
      );
      setFallbackElements(elements);
    }
  }, [textItems, viewport]);
  
  // Update fallback on viewport changes
  useEffect(() => {
    if (fallbackElements.length > 0) {
      updateFallbackTextLayer(fallbackElements, textItems, viewport);
    }
  }, [viewport, fallbackElements, textItems]);
  
  return null;
};
```

## Migration Checklist

### Phase 1: Replace Coordinate Projection
- [ ] Replace `coordinateProjection.ts` imports with `modules/projector`
- [ ] Update all `pdfToCssRect` calls to use new `pdfToCss` function
- [ ] Update all `cssToPdfRect` calls to use new `cssToPdf` function
- [ ] Verify viewport type matches new `Viewport` interface

### Phase 2: Replace Store
- [ ] Replace `useTextStore` with `matchStore` subscriptions
- [ ] Update data model from DIV indices to `MatchRect[]`
- [ ] Remove `setPageMatches` calls, use `setMatchRects` instead
- [ ] Update navigation to use global `order` field

### Phase 3: Replace Highlight Rendering
- [ ] Replace manual highlight creation with `paintHighlights`
- [ ] Update layer sizing with `updateLayerDimensions`
- [ ] Remove ad-hoc coordinate calculations
- [ ] Use `searchController` for complete pipeline

### Phase 4: Add New Features
- [ ] Implement fit modes with `calculateFitWidth`/`calculateFitPage`
- [ ] Add alignment validation with `validateAlignment`
- [ ] Add performance monitoring with `performanceTracker`
- [ ] Implement fallback text layer where needed

## Testing the Integration

1. **Alignment Test**: Use `validateAlignment` at different zoom levels
2. **Performance Test**: Monitor processing times with `performanceTracker`
3. **Rotation Test**: Verify highlights stay aligned at 0°/90°/180°/270°
4. **Navigation Test**: Ensure next/prev works across pages
5. **Fallback Test**: Test with PDFs that lack official text layers

## Benefits of the New Architecture

- **Perfect Alignment**: Highlights stay locked at any zoom/rotation
- **Single Source of Truth**: One projector handles all coordinate conversion
- **Performance**: No geometry recalculation on viewport changes
- **Maintainability**: Clear module boundaries and responsibilities
- **Testability**: Comprehensive unit tests for core projector
- **Extensibility**: Easy to add new features like fit modes and diagnostics
