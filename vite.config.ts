
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Critical for GitHub Pages deployment to work on subpaths
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
  },
  // Define process.env variables safely for the browser
  define: {
    'process.env': {
      // If the API_KEY is present at build time (e.g. GitHub Actions), inject it.
      // Otherwise default to empty string to prevent "process.env.API_KEY is undefined" crashes
      API_KEY: process.env.API_KEY || '',
      NODE_ENV: process.env.NODE_ENV || 'development'
    } 
  }
});
