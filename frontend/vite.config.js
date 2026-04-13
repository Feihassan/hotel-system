import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    include: /\.[jt]sx?$/,
    exclude: [],
    loader: 'jsx',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  publicDir: 'public',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
  },
});
