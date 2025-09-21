// Alignment validation component for debugging PDF-space projection
// Shows crosshairs at PDF page corners to verify alignment at all zoom levels

import React, { useEffect } from 'react';
import { createValidationCrosshairs } from '../../utils/coordinateProjection';

interface AlignmentValidatorProps {
  pageNum: number;
  scale: number;
  pdfDoc: any;
  hlLayerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
}

const AlignmentValidator: React.FC<AlignmentValidatorProps> = ({ 
  pageNum, 
  scale, 
  pdfDoc, 
  hlLayerRef, 
  enabled 
}) => {
  useEffect(() => {
    if (!enabled || !pdfDoc || !hlLayerRef.current) return;

    const renderCrosshairs = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale, rotation: page.rotate || 0 });
        
        // Create crosshairs at PDF page corners
        const crosshairs = createValidationCrosshairs({
          width: viewport.width,
          height: viewport.height,
          scale
        });
        
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
          crosshair.title = `Corner ${index + 1} - Scale: ${scale}`;
          
          // Add crosshair pattern
          crosshair.innerHTML = `
            <div style="position: absolute; left: 50%; top: 0; width: 1px; height: 100%; background: darkred;"></div>
            <div style="position: absolute; left: 0; top: 50%; width: 100%; height: 1px; background: darkred;"></div>
          `;
          
          hlLayerEl.appendChild(crosshair);
        });
        
        console.log(`AlignmentValidator: Added ${crosshairs.length} crosshairs for page ${pageNum} at scale ${scale}`);
      } catch (error) {
        console.error('Failed to render alignment crosshairs:', error);
      }
    };

    renderCrosshairs();
  }, [pageNum, scale, pdfDoc, hlLayerRef, enabled]);

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
