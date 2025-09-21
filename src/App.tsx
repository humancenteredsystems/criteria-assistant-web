// App component: handles file upload and renders PDFViewer
import React, { useState } from 'react';
import PDFViewer from './components/PDFViewer/PDFViewer';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        {!file && (
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        )}
        {file && (
          <div className="overlay-opacity-control">
            <label htmlFor="overlay-opacity">
              Overlay opacity: <span>{overlayOpacity}%</span>
            </label>
            <input
              id="overlay-opacity"
              type="range"
              min={0}
              max={100}
              step={10}
              value={overlayOpacity}
              onChange={(event) => setOverlayOpacity(Number(event.target.value))}
            />
          </div>
        )}
        {/* TODO: ThumbnailList component */}
      </div>
      <div className="main-content">
        {file ? (
          <PDFViewer file={file} overlayOpacity={overlayOpacity} />
        ) : (
          <p>Please upload a PDF to begin.</p>
        )}
      </div>
    </div>
  );
};

export default App;
