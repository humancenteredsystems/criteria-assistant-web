import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config with proper PDF.js configuration and production optimizations
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    // Optimize for production deployment
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdf: ['pdfjs-dist'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled']
        }
      }
    },
    // Increase chunk size warning limit for PDF.js
    chunkSizeWarningLimit: 1000
  },
  // Configure for static site deployment
  base: './',
  // Environment variable prefix for client-side access
  envPrefix: 'VITE_'
});
