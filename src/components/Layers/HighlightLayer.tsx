import React, { useMemo } from 'react';
import useTextStore from '../../store/textStore';

type Props = { textDivs: HTMLElement[]; pageNum: number; };

const HighlightLayer: React.FC<Props> = ({ textDivs, pageNum }) => {
  const { searchTerm, matchDivIndicesByPage, currentMatchIndex } = useTextStore();
  const indices = matchDivIndicesByPage[pageNum] ?? [];

  if (!searchTerm.trim() || indices.length === 0 || textDivs.length === 0) return null;

  const container = textDivs[0]?.closest('.text-layer') as HTMLElement | null;
  const containerRect = container?.getBoundingClientRect();
  if (!containerRect) return null;

  const nodes = indices.map((i, k) => {
    const rect = textDivs[i].getBoundingClientRect();
    const isActive = k === currentMatchIndex;
    return (
      <div
        key={`hl-${i}`}
        className={`highlight ${isActive ? 'active' : ''}`}
        style={{
          position: 'absolute',
          left: `${rect.left - containerRect.left}px`,
          top: `${rect.top - containerRect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          background: 'rgba(255, 235, 59, 0.45)',
          outline: isActive ? '2px solid #f57c00' : 'none',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
    );
  });

  return <div className="highlight-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>{nodes}</div>;
};

export default HighlightLayer;
