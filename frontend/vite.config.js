import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Plugin to stamp sw.js with build time so cache busts on every deploy
const swVersionPlugin = () => ({
  name: 'sw-version',
  closeBundle() {
    const swPath = resolve(__dirname, 'build', 'sw.js');
    try {
      let sw = readFileSync(swPath, 'utf8');
      sw = sw.replace('__BUILD_TIME__', Date.now().toString());
      writeFileSync(swPath, sw);
    } catch (e) {
      console.warn('sw-version plugin: could not stamp sw.js', e.message);
    }
  },
});

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
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
