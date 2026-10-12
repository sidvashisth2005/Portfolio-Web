import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// The 3D world (world.html) builds in its own pass after the main site, into the same dist/, so the main site's
// chunks and inlined CSS stay exactly as they are.
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    emptyOutDir: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: { input: { world: resolve('world.html') } },
  },
});
