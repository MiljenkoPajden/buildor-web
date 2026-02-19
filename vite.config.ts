import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3027,
    proxy: {
      // Proxy /api/* to local Express API server
      '/api': {
        target: 'http://localhost:3028',
        changeOrigin: true,
      },
    },
  },
});
