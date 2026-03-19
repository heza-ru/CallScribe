import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        'service-worker': resolve(__dirname, 'background/service-worker.js'),
        detectMindtickle: resolve(__dirname, 'content/detectMindtickle.js'),
        transcriptFetcher: resolve(__dirname, 'content/transcriptFetcher.js'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'service-worker') return 'background/service-worker.js';
          if (chunkInfo.name === 'detectMindtickle') return 'content/detectMindtickle.js';
          if (chunkInfo.name === 'transcriptFetcher') return 'content/transcriptFetcher.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
