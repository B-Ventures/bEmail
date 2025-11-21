import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Critical for GitHub Pages deployment to work on subpaths
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});