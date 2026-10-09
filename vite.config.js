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

// The Three.js chunk is only named here; main.js prefetches it after load.
function prefetchScenes() {
  return {
    name: 'prefetch-scenes',
    enforce: 'post',
    generateBundle(_, bundle) {
      const chunk = Object.values(bundle).find((c) => c.type === 'chunk' && c.name === 'scenes');
      const html = bundle['index.html'];
      if (!chunk || !html) return;
      // the app chunk is requested by entry.js after the first frame, so it never competes with the hero image
      // main.js adds the prefetch after the page has loaded, so it never competes with the hero
      html.source = String(html.source).replace('</head>', `  <meta name="scenes-chunk" content="./${chunk.fileName}" />\n</head>`);
    },
  };
}

// Prerender the data-driven sections into index.html: content is in the HTML for first paint and for crawlers,
// and the browser skips building it with JavaScript at startup.
function prerender() {
  return {
    name: 'prerender-content',
    async transformIndexHtml(html) {
      const { contentHTML, NUMERALS } = await import(`${pathToFileURL(resolve('src/content.js')).href}?t=${Date.now()}`);
      for (const [id, inner] of Object.entries(contentHTML())) {
        const re = new RegExp(`(<([a-z]+)\\b[^>]*\\bid="${id}"[^>]*>)(</\\2>)`);
        if (!re.test(html)) throw new Error(`prerender: no empty #${id}`);
        html = html.replace(re, (_, open, tag, close) => open + inner + close);
      }
      return html.replace('id="lvl-stage"', `id="lvl-stage" data-numerals="${NUMERALS.join('')}"`);
    },
  };
}

// Inline the stylesheet (14 KB gzipped) into index.html: one less round trip before first paint on slow networks.
function inlineCss() {
  return {
    name: 'inline-css',
    enforce: 'post',
    apply: 'build',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html) return;
      for (const [name, asset] of Object.entries(bundle)) {
        if (asset.type !== 'asset' || !name.endsWith('.css')) continue;
        const tag = new RegExp(`<link rel="stylesheet"[^>]*href="\\./${name.replace(/[.]/g, '\\.')}"[^>]*>`);
        if (!tag.test(String(html.source))) continue;
        // url()s were relative to assets/; the page sits one level up
        const css = String(asset.source).replace(/url\(\.\.\//g, 'url(./');
        html.source = String(html.source).replace(tag, () => `<style>${css}</style>`);
        delete bundle[name];
      }
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
    plugins: [prerender(), vercelApi(), seoFiles(), prefetchScenes(), inlineCss()],
  };
});
