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
        entryFileNames: 'assets/spicejet-[hash].js',
        chunkFileNames: 'assets/spicejet-[hash].js',
        assetFileNames: 'assets/spicejet-[hash].[ext]',
      },
    },
  },
});
