import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3001,
    host: 'localhost'
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});