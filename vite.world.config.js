import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// absolute URLs for the canonical and Open Graph tags, as in vite.config.js
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
process.env.VITE_SITE_URL ||= host ? `https://${host}` : 'http://localhost:4173';

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
