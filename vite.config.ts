import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config to ensure PDF.js worker and webpack module are pre-bundled
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist/webpack']
  }
});
