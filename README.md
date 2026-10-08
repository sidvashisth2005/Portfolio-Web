# Siddhant Vashisth · Portfolio

A cinematic, crimson-on-black portfolio built with **Vite, Three.js, GSAP (ScrollTrigger) and Lenis**, with hand-written GLSL shaders.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the build
```

## Deploy (Vercel)

1. Import the repo into [Vercel](https://vercel.com/new). `vercel.json` already sets the framework, build, functions and headers.
2. Add the services you want (all optional, see `.env.example`):
   - **Storage → Upstash Redis** (Marketplace). Powers the live counters, rate limits and the contact inbox. Vercel adds the env vars itself.
   - **`ANTHROPIC_API_KEY`**. Powers the shadow clone chat, the Scouter and contact-form triage.
   - **`RESEND_API_KEY`**. Emails you each contact-form message.
   - **`ADMIN_TOKEN`**. Unlocks your private inbox at `/api/inbox?key=…`.
3. Turn on **Analytics** and **Speed Insights** in the Vercel project. The site already loads both.

Canonical, Open Graph, `robots.txt` and `sitemap.xml` use Vercel's production domain automatically. For a custom domain,
set `VITE_SITE_URL` (for example `https://siddhant.dev`).

## Backend (`api/`)

Zero-dependency Vercel functions. Each one switches off cleanly when its key is missing, and the frontend falls back
(scripted clone answers, `mailto:` for the form, hidden counters).

| Endpoint | What it does |
| --- | --- |
| `POST /api/clone` | 影分身 shadow clone: streams Claude replies as Siddhant, grounded only in `src/data.js` and the résumé |
| `POST /api/scout` | スカウター Scouter: paste a job description, get an honest fit score (shown as a power level), matches, gaps and a pitch |
| `POST /api/contact` | 巻物 Send a scroll: validation, honeypot, timing check, Claude spam/priority triage, Redis copy, Resend email, optional Discord/Slack ping |
| `GET/POST /api/power` | 戦闘力 power level: unique daily visitors, live "watching now", hold-to-charge ki, résumé downloads |
| `GET /api/github` | 修行中 live feed of the latest pushed repos, cached at the edge for 30 minutes |
| `GET /api/inbox` | Your private inbox and stats (needs `ADMIN_TOKEN`) |
| `GET /api/health` | Which services are on (booleans only) |

Guardrails: same-origin checks on every POST, per-IP rate limits (IPs stored only as salted hashes), a daily ceiling
on AI calls (`AI_DAILY_LIMIT`), input caps, and a strict Content-Security-Policy.

`npm run dev` and `npm run preview` run these functions locally too (put keys in `.env.local`).

## Edit content

- **Text, projects, stats, experience, awards, podcast episodes:** `src/data.js`
- **Headline copy and section headings:** `index.html`
- **Photos:** `public/img/gallery/` (the order in `src/data.js` decides what orbits and spirals)
- **Résumé:** replace `public/resume.pdf`
- **Podcast clip:** `public/media/podcast-ep01.mp3`

## What's inside

| Section | Effect |
| --- | --- |
| Preloader | 一閃: the name rises over a brush stroke, then a blade of light cuts the screen and the halves slide apart |
| Background | Fixed shader: topographic contours + silk light ribbons, inverts to crimson |
| Hero | Kinetic outline type behind a portrait; a fluid cursor trail reveals colour under a crimson halftone ink layer |
| The arc | Pinned: the hero card zooms out, the world turns crimson, a red strip reveals the title, curved photo cards orbit in 3D |
| About | Spotlight headline whose squares expand into photos; lanyard badges swing with scroll |
| Two sides | STRATEGIST wraps a cylinder, BUILDER folds into a ridge; scroll flips between them |
| Battle stats | Trading cards that flip as they scroll past, with a running border light and a secret seventh card |
| Special moves | Pinned 3D showcase of four projects; RGB-split glitch on movement; letter-roll pills |
| Training / Trophy room | Experience, leadership, awards, education |
| Flashbacks | Pinned spiral tower of 24 real photos with a free-falling cut-out |
| On air | Corner cut-outs slide in; the player card expands; waveform reacts to the audio |
| Footer | Notched card, strip-reveal tagline, letter-roll links, live IST clock, power level and hold-to-charge ki |

Extras: fullscreen menu with circular transitions, magnetic buttons, an SV-seal cursor that draws into 一 over links, `J` for judge mode (live FPS),
the Konami code, reduced-motion support, a no-WebGL fallback and a mobile dock with Résumé and Hire me.

The motion language is inspired by the JU TechFest 2026 website; all artwork, photos and copy here are Siddhant's own.
