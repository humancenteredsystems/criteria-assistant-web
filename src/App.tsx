// App component: handles file upload and renders PDFViewer
import React, { useState } from 'react';
import PDFViewer from './components/PDFViewer/PDFViewer';
import './App.css';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

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
        {/* TODO: ThumbnailList component */}
      </div>
      <div className="main-content">
        {file ? (
          <PDFViewer file={file} />
        ) : (
          <p>Please upload a PDF to begin.</p>
        )}
      </div>
    </div>
  );
};

export default App;
