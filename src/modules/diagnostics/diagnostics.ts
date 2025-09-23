// Diagnostic tools for alignment validation and debugging
// Implements alignment validator with crosshairs and performance metrics

import { Viewport, MatchRect } from '../../types/viewport';
import { createValidationCrosshairs, pdfToCss } from '../projector/projector';
import { paintDebugCrosshairs } from '../renderer/renderer';

interface AlignmentValidationResult {
  isValid: boolean;
  maxDrift: number;
  cornerDrifts: number[];
  sampleRectDrift?: number;
  timestamp: number;
}

interface PerformanceMetrics {
  pagesProcessed: number;
  totalMatches: number;
  averageMatchesPerPage: number;
  processingTimeMs: number;
  renderTimeMs: number;
  lastUpdateTime: number;
}

/**
 * Validate alignment by checking if crosshairs stay at page corners
 * This is the primary test for projector accuracy
 */
export function validateAlignment(
  viewport: Viewport,
  debugLayer: HTMLElement,
  sampleMatchRect?: MatchRect
): AlignmentValidationResult {
  const timestamp = Date.now();
  
  try {
    // Create crosshairs at page corners
    const crosshairRects = createValidationCrosshairs(viewport);
    
    // Paint crosshairs for visual validation
    paintDebugCrosshairs(debugLayer, viewport, crosshairRects);
    
    // Calculate expected corner positions (should be at page edges)
    const expectedCorners = [
      { x: 0, y: viewport.height - 10 },      // bottom-left
      { x: viewport.width - 10, y: viewport.height - 10 }, // bottom-right
      { x: viewport.width - 10, y: 0 },       // top-right
      { x: 0, y: 0 }                          // top-left
    ];
    
    // Calculate actual crosshair positions
    const actualCorners = crosshairRects.map(rect => ({
      x: rect[0],
      y: rect[1]
    }));
    
    // Calculate drift for each corner
    const cornerDrifts = expectedCorners.map((expected, index) => {
      const actual = actualCorners[index];
      return Math.sqrt(
        Math.pow(expected.x - actual.x, 2) + 
        Math.pow(expected.y - actual.y, 2)
      );
    });
    
    const maxDrift = Math.max(...cornerDrifts);
    
    // Test sample match rect if provided
    let sampleRectDrift: number | undefined;
    if (sampleMatchRect) {
      // Project the sample rect and check if it's reasonable
      const projectedRect = pdfToCss(sampleMatchRect.bboxPdf, viewport);
      const [left, top, width, height] = projectedRect;
      
      // Check if projected rect is within viewport bounds
      const isWithinBounds = 
        left >= 0 && 
        top >= 0 && 
        left + width <= viewport.width && 
        top + height <= viewport.height;
      
      sampleRectDrift = isWithinBounds ? 0 : Math.max(
        Math.max(0, -left),
        Math.max(0, -top),
        Math.max(0, left + width - viewport.width),
        Math.max(0, top + height - viewport.height)
      );
    }
    
    // Alignment is valid if drift is within tolerance
    const isValid = maxDrift <= 1.0 && (sampleRectDrift === undefined || sampleRectDrift <= 1.0);
    
    return {
      isValid,
      maxDrift,
      cornerDrifts,
      sampleRectDrift,
      timestamp
    };
    
  } catch (error) {
    console.error('Alignment validation failed:', error);
    return {
      isValid: false,
      maxDrift: Infinity,
      cornerDrifts: [Infinity, Infinity, Infinity, Infinity],
      timestamp
    };
  }
}

/**
 * Create alignment validator UI component
 */
export function createAlignmentValidator(
  container: HTMLElement,
  onValidate: (result: AlignmentValidationResult) => void
): HTMLElement {
  const validator = document.createElement('div');
  validator.className = 'alignment-validator';
  validator.innerHTML = `
    <div class="validator-controls">
      <button id="validate-btn" class="validate-button">Validate Alignment</button>
      <div id="validation-results" class="validation-results"></div>
    </div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .alignment-validator {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
    }
    
    .validate-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
    }
    
    .validate-button:hover {
      background: #0056b3;
    }
    
    .validation-results {
      margin-top: 10px;
      font-size: 11px;
    }
    
    .validation-success {
      color: #28a745;
    }
    
    .validation-error {
      color: #dc3545;
    }
  `;
  
  document.head.appendChild(style);
  
  // Add event listener
  const validateBtn = validator.querySelector('#validate-btn') as HTMLButtonElement;
  const resultsDiv = validator.querySelector('#validation-results') as HTMLDivElement;
  
  validateBtn.addEventListener('click', () => {
    // This would need to be called with actual viewport and debug layer
    // For now, just show the interface
    resultsDiv.innerHTML = 'Click to validate alignment...';
  });
  
  container.appendChild(validator);
  return validator;
}

/**
 * Performance metrics tracker
 */
export class PerformanceTracker {
  private metrics: PerformanceMetrics = {
    pagesProcessed: 0,
    totalMatches: 0,
    averageMatchesPerPage: 0,
    processingTimeMs: 0,
    renderTimeMs: 0,
    lastUpdateTime: Date.now()
  };
  
  private processingStartTime: number = 0;
  private renderStartTime: number = 0;
  
  /**
   * Start tracking processing time
   */
  startProcessing(): void {
    this.processingStartTime = performance.now();
  }
  
  /**
   * End processing time tracking
   */
  endProcessing(pageNumber: number, matchCount: number): void {
    const processingTime = performance.now() - this.processingStartTime;
    
    this.metrics.pagesProcessed++;
    this.metrics.totalMatches += matchCount;
    this.metrics.processingTimeMs += processingTime;
    this.metrics.averageMatchesPerPage = this.metrics.totalMatches / this.metrics.pagesProcessed;
    this.metrics.lastUpdateTime = Date.now();
    
    console.log(`Page ${pageNumber}: ${matchCount} matches, ${processingTime.toFixed(2)}ms processing`);
  }
  
  /**
   * Start tracking render time
   */
  startRender(): void {
    this.renderStartTime = performance.now();
  }
  
  /**
   * End render time tracking
   */
  endRender(): void {
    const renderTime = performance.now() - this.renderStartTime;
    this.metrics.renderTimeMs += renderTime;
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      pagesProcessed: 0,
      totalMatches: 0,
      averageMatchesPerPage: 0,
      processingTimeMs: 0,
      renderTimeMs: 0,
      lastUpdateTime: Date.now()
    };
  }
  
  /**
   * Log performance summary
   */
  logSummary(): void {
    const avgProcessingTime = this.metrics.pagesProcessed > 0 
      ? this.metrics.processingTimeMs / this.metrics.pagesProcessed 
      : 0;
    
    console.group('Performance Summary');
    console.log(`Pages processed: ${this.metrics.pagesProcessed}`);
    console.log(`Total matches: ${this.metrics.totalMatches}`);
    console.log(`Average matches per page: ${this.metrics.averageMatchesPerPage.toFixed(1)}`);
    console.log(`Average processing time: ${avgProcessingTime.toFixed(2)}ms`);
    console.log(`Total render time: ${this.metrics.renderTimeMs.toFixed(2)}ms`);
    console.groupEnd();
  }
}

/**
 * Create performance monitor UI
 */
export function createPerformanceMonitor(
  container: HTMLElement,
  tracker: PerformanceTracker
): HTMLElement {
  const monitor = document.createElement('div');
  monitor.className = 'performance-monitor';
  monitor.innerHTML = `
    <div class="monitor-title">Performance</div>
    <div id="perf-stats" class="perf-stats"></div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .performance-monitor {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 11px;
      z-index: 1000;
      min-width: 200px;
    }
    
    .monitor-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .perf-stats {
      line-height: 1.4;
    }
  `;
  
  document.head.appendChild(style);
  
  // Update stats periodically
  const updateStats = () => {
    const metrics = tracker.getMetrics();
    const statsDiv = monitor.querySelector('#perf-stats') as HTMLDivElement;
    
    const avgProcessing = metrics.pagesProcessed > 0 
      ? (metrics.processingTimeMs / metrics.pagesProcessed).toFixed(1)
      : '0';
    
    statsDiv.innerHTML = `
      Pages: ${metrics.pagesProcessed}<br>
      Matches: ${metrics.totalMatches}<br>
      Avg/Page: ${metrics.averageMatchesPerPage.toFixed(1)}<br>
      Avg Time: ${avgProcessing}ms<br>
      Render: ${metrics.renderTimeMs.toFixed(1)}ms
    `;
  };
  
  // Update every second
  setInterval(updateStats, 1000);
  updateStats(); // Initial update
  
  container.appendChild(monitor);
  return monitor;
}

/**
 * Log detailed alignment information
 */
export function logAlignmentDetails(
  viewport: Viewport,
  validationResult: AlignmentValidationResult
): void {
  console.group('Alignment Validation Details');
  console.log('Viewport:', viewport);
  console.log('Validation Result:', validationResult);
  console.log('Corner Drifts:', validationResult.cornerDrifts.map(d => `${d.toFixed(2)}px`));
  console.log('Max Drift:', `${validationResult.maxDrift.toFixed(2)}px`);
  console.log('Status:', validationResult.isValid ? '✅ VALID' : '❌ INVALID');
  console.groupEnd();
}

/**
 * Export singleton performance tracker
 */
export const performanceTracker = new PerformanceTracker();
