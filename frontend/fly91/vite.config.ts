import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@airline-helper/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/fly91-[hash].js',
        chunkFileNames: 'assets/fly91-[hash].js',
        assetFileNames: 'assets/fly91-[hash].[ext]',
      },
    },
  },
});
