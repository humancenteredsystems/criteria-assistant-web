// Text alignment validation utility
// Helps identify and debug font size misalignment issues

import { Viewport } from '../../types/viewport';

export interface AlignmentReport {
  pageNum: number;
  totalElements: number;
  misalignedElements: number;
  averageFontSize: number;
  fontFamilies: string[];
  issues: AlignmentIssue[];
}

export interface AlignmentIssue {
  elementIndex: number;
  type: 'font-size' | 'font-family' | 'positioning' | 'scaling';
  description: string;
  expectedValue?: string;
  actualValue?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Validate text layer alignment and identify potential font-related issues
 */
export function validateTextAlignment(
  textLayer: HTMLElement,
  viewport: Viewport,
  pageNum: number
): AlignmentReport {
  const textElements = Array.from(textLayer.querySelectorAll('span, div')) as HTMLElement[];
  const issues: AlignmentIssue[] = [];
  const fontFamilies = new Set<string>();
  let totalFontSize = 0;
  let fontSizeCount = 0;

  textElements.forEach((element, index) => {
    const computedStyle = window.getComputedStyle(element);
    const fontFamily = computedStyle.fontFamily;
    const fontSize = computedStyle.fontSize;
    
    // Collect font families
    if (fontFamily) {
      fontFamilies.add(fontFamily);
    }
    
    // Collect font sizes for averaging
    if (fontSize) {
      const sizeValue = parseFloat(fontSize);
      if (!isNaN(sizeValue)) {
        totalFontSize += sizeValue;
        fontSizeCount++;
      }
    }
    
    // Check for common alignment issues
    validateElementAlignment(element, index, viewport, issues);
  });

  const averageFontSize = fontSizeCount > 0 ? totalFontSize / fontSizeCount : 0;
  const misalignedElements = issues.filter(issue => issue.severity === 'high').length;

  return {
    pageNum,
    totalElements: textElements.length,
    misalignedElements,
    averageFontSize,
    fontFamilies: Array.from(fontFamilies),
    issues
  };
}

/**
 * Validate individual text element for alignment issues
 */
function validateElementAlignment(
  element: HTMLElement,
  index: number,
  viewport: Viewport,
  issues: AlignmentIssue[]
): void {
  const computedStyle = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  // Check for font inheritance issues
  if (computedStyle.fontFamily.includes('Roboto')) {
    issues.push({
      elementIndex: index,
      type: 'font-family',
      description: 'Element inheriting global Roboto font instead of PDF font',
      expectedValue: 'PDF-specific font',
      actualValue: computedStyle.fontFamily,
      severity: 'high'
    });
  }
  
  // Check for CSS cascade issues
  if (computedStyle.fontSize === '0.875rem') {
    issues.push({
      elementIndex: index,
      type: 'font-size',
      description: 'Element inheriting global font-size instead of PDF-calculated size',
      expectedValue: 'PDF-calculated size',
      actualValue: computedStyle.fontSize,
      severity: 'high'
    });
  }
  
  // Check positioning
  if (computedStyle.position !== 'absolute') {
    issues.push({
      elementIndex: index,
      type: 'positioning',
      description: 'Text element not absolutely positioned',
      expectedValue: 'absolute',
      actualValue: computedStyle.position,
      severity: 'medium'
    });
  }
  
  // Check for scaling issues
  const transform = computedStyle.transform;
  if (transform && transform !== 'none') {
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch) {
      const scale = parseFloat(scaleMatch[1]);
      if (Math.abs(scale - viewport.scale) > 0.01) {
        issues.push({
          elementIndex: index,
          type: 'scaling',
          description: 'Element scale does not match viewport scale',
          expectedValue: viewport.scale.toString(),
          actualValue: scale.toString(),
          severity: 'medium'
        });
      }
    }
  }
}

/**
 * Generate a human-readable report from alignment validation
 */
export function generateAlignmentReport(report: AlignmentReport): string {
  const lines: string[] = [];
  
  lines.push(`=== Text Alignment Report - Page ${report.pageNum} ===`);
  lines.push(`Total text elements: ${report.totalElements}`);
  lines.push(`Misaligned elements: ${report.misalignedElements}`);
  lines.push(`Average font size: ${report.averageFontSize.toFixed(2)}px`);
  lines.push(`Font families detected: ${report.fontFamilies.join(', ')}`);
  lines.push('');
  
  if (report.issues.length === 0) {
    lines.push('✅ No alignment issues detected');
  } else {
    lines.push(`⚠️  ${report.issues.length} issues detected:`);
    lines.push('');
    
    const groupedIssues = groupIssuesByType(report.issues);
    
    Object.entries(groupedIssues).forEach(([type, issues]) => {
      lines.push(`${type.toUpperCase()} Issues (${issues.length}):`);
      issues.forEach(issue => {
        const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        lines.push(`  ${severity} Element ${issue.elementIndex}: ${issue.description}`);
        if (issue.expectedValue && issue.actualValue) {
          lines.push(`     Expected: ${issue.expectedValue}, Actual: ${issue.actualValue}`);
        }
      });
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

/**
 * Group issues by type for better reporting
 */
function groupIssuesByType(issues: AlignmentIssue[]): Record<string, AlignmentIssue[]> {
  return issues.reduce((groups, issue) => {
    if (!groups[issue.type]) {
      groups[issue.type] = [];
    }
    groups[issue.type].push(issue);
    return groups;
  }, {} as Record<string, AlignmentIssue[]>);
}

/**
 * Quick validation function for development use
 */
export function quickValidation(textLayerElement: HTMLElement, viewport: Viewport, pageNum: number): void {
  const report = validateTextAlignment(textLayerElement, viewport, pageNum);
  const reportText = generateAlignmentReport(report);
  console.log(reportText);
  
  // Also log to a global variable for easy access in dev tools
  (window as any).lastAlignmentReport = report;
}
