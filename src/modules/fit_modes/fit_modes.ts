// Fit modes for PDF viewport calculation
// Implements "Fit Width" and "Fit Page" scaling calculations

import { Viewport } from '../../types/viewport';

interface ContainerDimensions {
  width: number;
  height: number;
}

interface PageDimensions {
  width: number;   // Page width at scale 1.0
  height: number;  // Page height at scale 1.0
}

/**
 * Calculate viewport for "Fit Width" mode
 * Scales the page to fit the container width exactly
 */
export function calculateFitWidth(
  pageDimensions: PageDimensions,
  containerDimensions: ContainerDimensions,
  rotation: 0 | 90 | 180 | 270 = 0
): Viewport {
  // Adjust page dimensions for rotation
  const rotatedPage = getRotatedDimensions(pageDimensions, rotation);
  
  // Calculate scale to fit width
  const scale = containerDimensions.width / rotatedPage.width;
  
  // Calculate final viewport dimensions
  const width = rotatedPage.width * scale;
  const height = rotatedPage.height * scale;
  
  return {
    width,
    height,
    scale,
    rotation
  };
}

/**
 * Calculate viewport for "Fit Page" mode
 * Scales the page to fit entirely within the container
 */
export function calculateFitPage(
  pageDimensions: PageDimensions,
  containerDimensions: ContainerDimensions,
  rotation: 0 | 90 | 180 | 270 = 0
): Viewport {
  // Adjust page dimensions for rotation
  const rotatedPage = getRotatedDimensions(pageDimensions, rotation);
  
  // Calculate scale to fit both width and height
  const scaleX = containerDimensions.width / rotatedPage.width;
  const scaleY = containerDimensions.height / rotatedPage.height;
  const scale = Math.min(scaleX, scaleY);
  
  // Calculate final viewport dimensions
  const width = rotatedPage.width * scale;
  const height = rotatedPage.height * scale;
  
  return {
    width,
    height,
    scale,
    rotation
  };
}

/**
 * Calculate viewport for custom scale
 * Maintains aspect ratio at the specified scale
 */
export function calculateCustomScale(
  pageDimensions: PageDimensions,
  scale: number,
  rotation: 0 | 90 | 180 | 270 = 0
): Viewport {
  // Adjust page dimensions for rotation
  const rotatedPage = getRotatedDimensions(pageDimensions, rotation);
  
  // Calculate final viewport dimensions
  const width = rotatedPage.width * scale;
  const height = rotatedPage.height * scale;
  
  return {
    width,
    height,
    scale,
    rotation
  };
}

/**
 * Get page dimensions adjusted for rotation
 */
function getRotatedDimensions(
  pageDimensions: PageDimensions,
  rotation: 0 | 90 | 180 | 270
): PageDimensions {
  if (rotation === 90 || rotation === 270) {
    // Swap width and height for 90/270 degree rotations
    return {
      width: pageDimensions.height,
      height: pageDimensions.width
    };
  }
  
  // No change for 0/180 degree rotations
  return pageDimensions;
}

/**
 * Calculate scale percentage for display
 */
export function getScalePercentage(scale: number): number {
  return Math.round(scale * 100);
}

/**
 * Get predefined zoom levels
 */
export function getPredefinedZoomLevels(): Array<{ label: string; scale: number }> {
  return [
    { label: '25%', scale: 0.25 },
    { label: '50%', scale: 0.5 },
    { label: '75%', scale: 0.75 },
    { label: '100%', scale: 1.0 },
    { label: '125%', scale: 1.25 },
    { label: '150%', scale: 1.5 },
    { label: '200%', scale: 2.0 },
    { label: '300%', scale: 3.0 },
    { label: '400%', scale: 4.0 }
  ];
}

/**
 * Find the closest predefined zoom level to a given scale
 */
export function findClosestZoomLevel(scale: number): { label: string; scale: number } {
  const levels = getPredefinedZoomLevels();
  let closest = levels[0];
  let minDiff = Math.abs(scale - closest.scale);
  
  for (const level of levels) {
    const diff = Math.abs(scale - level.scale);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }
  
  return closest;
}

/**
 * Validate viewport dimensions
 */
export function validateViewport(viewport: Viewport): boolean {
  return (
    viewport.width > 0 &&
    viewport.height > 0 &&
    viewport.scale > 0 &&
    viewport.scale <= 10 && // Reasonable maximum
    [0, 90, 180, 270].includes(viewport.rotation)
  );
}

/**
 * Clamp scale to reasonable bounds
 */
export function clampScale(scale: number): number {
  return Math.max(0.1, Math.min(10.0, scale));
}

/**
 * Calculate viewport that centers the page in the container
 */
export function calculateCenteredViewport(
  viewport: Viewport,
  containerDimensions: ContainerDimensions
): { viewport: Viewport; offsetX: number; offsetY: number } {
  const offsetX = Math.max(0, (containerDimensions.width - viewport.width) / 2);
  const offsetY = Math.max(0, (containerDimensions.height - viewport.height) / 2);
  
  return {
    viewport,
    offsetX,
    offsetY
  };
}

/**
 * Calculate the container size needed for a viewport
 */
export function calculateRequiredContainer(viewport: Viewport): ContainerDimensions {
  return {
    width: Math.ceil(viewport.width),
    height: Math.ceil(viewport.height)
  };
}
