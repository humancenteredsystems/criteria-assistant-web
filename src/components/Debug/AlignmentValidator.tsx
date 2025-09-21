// Alignment validation component for debugging PDF-space projection
// Shows crosshairs at PDF page corners to verify alignment at all zoom levels

import React, { useEffect } from 'react';
import { createValidationCrosshairs, PageViewport } from '../../utils/coordinateProjection';

interface AlignmentValidatorProps {
  pageNum: number;
  viewport: PageViewport;
  pdfDoc: any;
  hlLayerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

const AlignmentValidator: React.FC<AlignmentValidatorProps> = ({ 
  pageNum, 
  viewport, 
  pdfDoc, 
  hlLayerRef, 
  enabled 
}) => {
  useEffect(() => {
    if (!enabled || !pdfDoc || !hlLayerRef.current) return;

    const renderCrosshairs = async () => {
      try {
        // Use the passed viewport directly instead of recreating it
        // This ensures we use the same viewport as other components
        const crosshairs = createValidationCrosshairs(viewport);
        
        // Render crosshairs in highlight layer
        const hlLayerEl = hlLayerRef.current;
        if (!hlLayerEl) return;
        
        // Remove existing crosshairs
        const existingCrosshairs = hlLayerEl.querySelectorAll('.alignment-crosshair');
        existingCrosshairs.forEach(el => el.remove());
        
        // Add new crosshairs
        crosshairs.forEach((rect, index) => {
          const crosshair = document.createElement('div');
          crosshair.className = 'alignment-crosshair';
          crosshair.style.position = 'absolute';
          crosshair.style.left = `${rect.left}px`;
          crosshair.style.top = `${rect.top}px`;
          crosshair.style.width = `${rect.width}px`;
          crosshair.style.height = `${rect.height}px`;
          crosshair.style.background = 'red';
          crosshair.style.border = '1px solid darkred';
          crosshair.style.pointerEvents = 'none';
          crosshair.style.zIndex = '999';
          crosshair.title = `Corner ${index + 1} - Scale: ${viewport.scale}`;
          
          // Add crosshair pattern
          crosshair.innerHTML = `
            <div style="position: absolute; left: 50%; top: 0; width: 1px; height: 100%; background: darkred;"></div>
            <div style="position: absolute; left: 0; top: 50%; width: 100%; height: 1px; background: darkred;"></div>
          `;
          
          hlLayerEl.appendChild(crosshair);
        });
        
        console.log(`AlignmentValidator: Added ${crosshairs.length} crosshairs for page ${pageNum} at scale ${viewport.scale}`);
      } catch (error) {
        console.error('Failed to render alignment crosshairs:', error);
      }
    };

    renderCrosshairs();
  }, [pageNum, viewport, pdfDoc, hlLayerRef, enabled]);

  // Cleanup crosshairs when disabled
  useEffect(() => {
    if (!enabled && hlLayerRef.current) {
      const existingCrosshairs = hlLayerRef.current.querySelectorAll('.alignment-crosshair');
      existingCrosshairs.forEach(el => el.remove());
    }
  }, [enabled, hlLayerRef]);

  return null; // This component only renders into the DOM directly
};

export default AlignmentValidator;
