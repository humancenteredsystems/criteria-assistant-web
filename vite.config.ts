import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config with proper PDF.js configuration
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
});
