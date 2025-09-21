// Visual alignment validation component for comprehensive coordinate system testing
// Tests alignment at multiple zoom levels and provides detailed validation feedback

import React, { useEffect, useState } from 'react';
import { PageViewport, pdfToCssRect, cssToPdfRect } from '../../utils/coordinateProjection';

interface VisualAlignmentValidatorProps {
  pageNum: number;
  viewport: PageViewport;
  pdfDoc: any;
  hlLayerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

interface ValidationResult {
  scale: number;
  passed: boolean;
  maxError: number;
  details: string[];
}

const VisualAlignmentValidator: React.FC<VisualAlignmentValidatorProps> = ({
  pageNum,
  viewport,
  pdfDoc,
  hlLayerRef,
  enabled
}) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Test scales to validate alignment across zoom levels
  const testScales = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

  const runAlignmentValidation = async () => {
    if (!enabled || !pdfDoc || !hlLayerRef.current) return;

    setIsValidating(true);
    const results: ValidationResult[] = [];

    try {
      const page = await pdfDoc.getPage(pageNum);
      const rotation = page.rotate || 0;

      for (const testScale of testScales) {
        const testViewport = page.getViewport({ scale: testScale, rotation });
        const result = await validateAlignmentAtScale(testViewport, testScale);
        results.push(result);
      }

      setValidationResults(results);
      renderValidationOverlay(results);
    } catch (error) {
      console.error('Alignment validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const validateAlignmentAtScale = async (testViewport: any, scale: number): Promise<ValidationResult> => {
    const details: string[] = [];
    let maxError = 0;
    let passed = true;

    // Test coordinate round-trip accuracy
    const testPoints = [
      { x: 0, y: 0, name: 'top-left' },
      { x: testViewport.width, y: 0, name: 'top-right' },
      { x: 0, y: testViewport.height, name: 'bottom-left' },
      { x: testViewport.width, y: testViewport.height, name: 'bottom-right' },
      { x: testViewport.width / 2, y: testViewport.height / 2, name: 'center' }
    ];

    const projectionViewport: PageViewport = {
      width: testViewport.width,
      height: testViewport.height,
      scale: testViewport.scale || scale,
      rotation: testViewport.rotation || 0
    };

    for (const point of testPoints) {
      // CSS → PDF → CSS round-trip test
      const originalCss = { left: point.x, top: point.y, width: 10, height: 10 };
      const pdfRect = cssToPdfRect(originalCss, projectionViewport);
      const finalCss = pdfToCssRect(pdfRect, projectionViewport);

      const errorX = Math.abs(finalCss.left - originalCss.left);
      const errorY = Math.abs(finalCss.top - originalCss.top);
      const errorW = Math.abs(finalCss.width - originalCss.width);
      const errorH = Math.abs(finalCss.height - originalCss.height);

      const totalError = Math.max(errorX, errorY, errorW, errorH);
      maxError = Math.max(maxError, totalError);

      if (totalError > 0.1) { // Allow for floating point precision
        passed = false;
        details.push(`${point.name}: error ${totalError.toFixed(3)}px (x:${errorX.toFixed(3)}, y:${errorY.toFixed(3)})`);
      }
    }

    // Test Y-axis inversion
    const topPoint = { left: 100, top: 50, width: 20, height: 15 };
    const pdfRect = cssToPdfRect(topPoint, projectionViewport);
    const expectedPdfY = (projectionViewport.height - (topPoint.top + topPoint.height)) / projectionViewport.scale;
    
    if (Math.abs(pdfRect.y - expectedPdfY) > 0.1) {
      passed = false;
      details.push(`Y-axis inversion error: expected ${expectedPdfY.toFixed(3)}, got ${pdfRect.y.toFixed(3)}`);
    }

    // Test scaling consistency
    const scaleTest = { left: 0, top: 0, width: 100, height: 100 };
    const scaledPdf = cssToPdfRect(scaleTest, projectionViewport);
    const expectedPdfWidth = scaleTest.width / projectionViewport.scale;
    
    if (Math.abs(scaledPdf.w - expectedPdfWidth) > 0.1) {
      passed = false;
      details.push(`Scale error: expected width ${expectedPdfWidth.toFixed(3)}, got ${scaledPdf.w.toFixed(3)}`);
    }

    if (passed) {
      details.push('All coordinate transformations passed');
    }

    return {
      scale,
      passed,
      maxError,
      details
    };
  };

  const renderValidationOverlay = (results: ValidationResult[]) => {
    const hlLayerEl = hlLayerRef.current;
    if (!hlLayerEl) return;

    // Remove existing validation overlay
    const existingOverlay = hlLayerEl.querySelector('.validation-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create validation results overlay
    const overlay = document.createElement('div');
    overlay.className = 'validation-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '10px';
    overlay.style.right = '10px';
    overlay.style.background = 'rgba(0, 0, 0, 0.8)';
    overlay.style.color = 'white';
    overlay.style.padding = '10px';
    overlay.style.borderRadius = '5px';
    overlay.style.fontSize = '12px';
    overlay.style.fontFamily = 'monospace';
    overlay.style.maxWidth = '300px';
    overlay.style.zIndex = '1000';
    overlay.style.pointerEvents = 'auto';

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const overallPassed = passedCount === totalCount;

    overlay.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: ${overallPassed ? '#4CAF50' : '#F44336'}">
        Alignment Validation: ${passedCount}/${totalCount} scales passed
      </div>
      ${results.map(result => `
        <div style="margin-bottom: 4px; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 3px;">
          <div style="color: ${result.passed ? '#4CAF50' : '#F44336'}; font-weight: bold;">
            Scale ${result.scale}x: ${result.passed ? 'PASS' : 'FAIL'}
            ${!result.passed ? ` (max error: ${result.maxError.toFixed(3)}px)` : ''}
          </div>
          ${result.details.map(detail => `
            <div style="font-size: 10px; color: #ccc; margin-left: 8px;">${detail}</div>
          `).join('')}
        </div>
      `).join('')}
      <div style="margin-top: 8px; font-size: 10px; color: #aaa;">
        Click to close
      </div>
    `;

    overlay.addEventListener('click', () => {
      overlay.remove();
    });

    hlLayerEl.appendChild(overlay);
  };

  // Run validation when enabled or viewport changes
  useEffect(() => {
    if (enabled) {
      runAlignmentValidation();
    } else {
      // Clear validation overlay when disabled
      const hlLayerEl = hlLayerRef.current;
      if (hlLayerEl) {
        const existingOverlay = hlLayerEl.querySelector('.validation-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
      }
      setValidationResults([]);
    }
  }, [enabled, pageNum, viewport]);

  // Render validation status indicator
  if (!enabled) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '50px',
      right: '10px',
      background: isValidating ? '#FF9800' : '#2196F3',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: 999,
      pointerEvents: 'none'
    }}>
      {isValidating ? 'Validating...' : `Validated ${validationResults.length} scales`}
    </div>
  );
};

export default VisualAlignmentValidator;
