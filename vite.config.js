import { defineConfig, loadEnv } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';

// Absolute URLs for canonical + Open Graph tags. On Vercel this resolves to the production domain;
// set VITE_SITE_URL to override (e.g. a custom domain).
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
process.env.VITE_SITE_URL ||= host ? `https://${host}` : 'http://localhost:4173';

// Runs the Vercel functions in api/ under `npm run dev` and `npm run preview`,
// so the whole site works locally without the Vercel CLI.
function vercelApi() {
  const handle = async (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const m = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/i);
    if (!m) return next();
    const file = resolve('api', `${m[1]}.js`);
    if (!existsSync(file)) return next();
    try {
      const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      const fn = mod[req.method];
      if (!fn) { res.statusCode = 405; return res.end(); }
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Readable.toWeb(req);
      const request = new Request(url, { method: req.method, headers: req.headers, body, duplex: 'half' });
      const out = await fn(request);
      res.statusCode = out.status;
      out.headers.forEach((v, k) => res.setHeader(k, v));
      if (!out.body) return res.end();
      for await (const chunk of out.body) res.write(chunk);
      res.end();
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end('function crashed');
    }
  };
  // `vite preview` also sends the site-wide headers from vercel.json, so the CSP is tested locally
  const siteHeaders = () => {
    try { return JSON.parse(readFileSync('vercel.json', 'utf8')).headers.find((h) => h.source === '/(.*)')?.headers || []; } catch { return []; }
  };
  return {
    name: 'vercel-api',
    configureServer: (s) => { s.middlewares.use(handle); },
    configurePreviewServer: (s) => {
      const hs = siteHeaders().filter((h) => !['Strict-Transport-Security'].includes(h.key));
      s.middlewares.use((req, res, next) => {
        hs.forEach((h) => res.setHeader(h.key, h.key === 'Content-Security-Policy' ? h.value.replace('; upgrade-insecure-requests', '') : h.value));
        next();
      });
      s.middlewares.use(handle);
    },
  };
}

// robots.txt and sitemap.xml with the real site URL, written at build time
function seoFiles() {
  return {
    name: 'seo-files',
    generateBundle() {
      const site = process.env.VITE_SITE_URL.replace(/\/$/, '');
      const day = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n` });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><lastmod>${day}</lastmod><priority>1.0</priority></url>\n  <url><loc>${site}/resume.pdf</loc><lastmod>${day}</lastmod><priority>0.8</priority></url>\n</urlset>\n` });
    },
  };
}

export default defineConfig(({ mode }) => {
  // expose .env / .env.local to the functions, as Vercel does with project env vars
  Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ''), ...process.env });
  return {
    base: './',
    build: { chunkSizeWarningLimit: 800 },
    plugins: [vercelApi(), seoFiles()],
  };
});
