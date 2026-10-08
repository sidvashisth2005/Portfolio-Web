import { defineConfig } from 'vite';

// Absolute URLs for canonical + Open Graph tags. On Vercel this resolves to the production domain;
// set VITE_SITE_URL to override (e.g. a custom domain).
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
process.env.VITE_SITE_URL ||= host ? `https://${host}` : 'http://localhost:4173';

export default defineConfig({
  build: { chunkSizeWarningLimit: 800 },
});
