import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/dashboard-[hash].js',
        chunkFileNames: 'assets/dashboard-[hash].js',
        assetFileNames: 'assets/dashboard-[hash].[ext]',
      },
    },
  },
});
