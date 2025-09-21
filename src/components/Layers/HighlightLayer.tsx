import React from 'react';

export interface HighlightGeometry {
  id: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  isActive: boolean;
}

type Props = { highlights: HighlightGeometry[] };

const HighlightLayer: React.FC<Props> = ({ highlights }) => {
  if (!highlights.length) return null;

  return (
    <div
      className="highlight-layer"
      style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2, inset: 0 }}
    >
      {highlights.map(({ id, rect, isActive }) => (
        <div
          key={id}
          className={`highlight ${isActive ? 'active' : ''}`}
          style={{
            position: 'absolute',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            background: 'rgba(255, 235, 59, 0.45)',
            outline: isActive ? '2px solid #f57c00' : 'none',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      ))}
    </div>
  );
};

export default HighlightLayer;
