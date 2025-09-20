import React, { useEffect } from 'react';
import useTextStore from '../../store/textStore';
import { TextItem } from '../../types/text';
import './TextLayer.css';

interface TextLayerProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
}

/**
 * Renders an overlay of selectable text items on top of the PDF canvas.
 * Highlights search matches and the active match differently.
 */
const TextLayer: React.FC<TextLayerProps> = ({ pdfDoc, pageNum, scale }) => {
  const { textCache, matches, currentMatchIndex, loadText } = useTextStore();

  // Load text for this page when pdfDoc or pageNum changes
  useEffect(() => {
    if (pdfDoc) {
      loadText(pdfDoc, pageNum);
    }
  }, [pdfDoc, pageNum, loadText]);

  const items: TextItem[] = textCache[pageNum] || [];

  return (
    <div className="text-layer" style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}>
      {items.map((item, idx) => {
        const isMatch = matches.includes(item);
        const isActive = isMatch && matches[currentMatchIndex] === item;
        const classNames = [
          'text-item',
          isMatch ? 'highlight' : '',
          isActive ? 'active' : '',
        ]
          .join(' ')
          .trim();

        return (
          <span
            key={`${idx}-${item.x}-${item.y}`}
            className={classNames}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
            }}
          >
            {item.str}
          </span>
        );
      })}
    </div>
  );
};

export default TextLayer;
