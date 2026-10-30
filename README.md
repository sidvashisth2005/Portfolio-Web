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
| `GET/POST /api/house` | 住人街 the residents' quarter: claim a house, save its things, hang a lantern, slip a note under the door (see below) |
| `DELETE /api/house?id=N` | Evict house N, e.g. for abuse (needs `ADMIN_TOKEN` as a Bearer token) |
| `GET /api/inbox` | Your private inbox and stats (needs `ADMIN_TOKEN`) |
| `GET /api/health` | Which services are on (booleans only) |

Guardrails: same-origin checks on every POST, per-IP rate limits (IPs stored only as salted hashes), a daily ceiling
on AI calls (`AI_DAILY_LIMIT`), input caps, and a strict Content-Security-Policy.

`npm run dev` and `npm run preview` run these functions locally too (put keys in `.env.local`).

## The residents' quarter (住人街)

Twenty-four townhouses on a terrace outside the village's south-west wall, a stop of their own on the 3D journey
(and in Free roam). Any visitor can claim one: no account, just a **house key** that never leaves their browser.

- **On the street:** the resident's crest is painted on the noren, their name hangs over the gate, the roof takes
  their colour, the windows light up, and one more paper lantern hangs under the eaves at 3, 12 and 40 lanterns from
  visitors. Empty houses stand dark with a 空き家 (vacant) board. The registry board at the entrance lists everyone.
- **Inside:** a tatami room. The alcove scroll carries the crest, motto and seal; the shelves, chest, table and
  corners hold up to 12 things (scroll, letter, ema plaque, books, blade, cup, lantern, bonsai, jar, lacquer box),
  each with a title, a note and a link. Visitors can hang a lantern (one a day) and slip a note under the door that
  only the resident reads.
- **Private things** are sealed in the browser with AES-GCM under a key derived from the house key, so the server
  stores ciphertext it can't open. The server is sent `SHA-256("auth|" + key)` and keeps only a hash of that.
- **Guardrails:** one claim per visitor per day, rate limits on everything, public text checked by a word list and
  (when `ANTHROPIC_API_KEY` is set) by Claude, links limited to http(s). `DELETE /api/house?id=N` evicts a house.
- **Without Redis** (local dev, a static preview) the quarter still works, kept in that browser only, and says so.
- The shared rules (plots, palettes, limits, validation) live in `src/registry.js`, read by both the page and the API.

## The strategist's study (書斎)

The headquarters is Siddhant's own house. Tap it at its shots (or in Free roam), press **Meet Siddhant** in the
header, or **Step inside my study** on the About panel, and you're in his room: his ink portrait on the alcove
scroll and his real things on the shelves (the HackNITR and HACKSAGON trophies, the four projects, the IIITDM
research, the paper, the Trustique team-lead story, the podcast, the résumé, GitHub). Every thing opens its story,
taken from `src/data.js` (`src/world/founder.js`). Beside the room: a character sheet (class, guild, origin, what
he's looking for, self-assessed ability bars), **Ask me** (the shadow clone, `api/clone`, with the same scripted
answers as the full site when the AI is off; they live in `src/clone-script.js`) and **On my desk now** (the latest
GitHub pushes, `api/github`).

## The houses

Every building in the village is built the way the real ones are (`src/world/house.js`): machiya townhouses with
timber frames, kōshi lattices, sliding doors under noren, pent roofs and tiled gable roofs with ridge tiles; stucco
townhouses with framed windows, shop fronts and awnings, balconies and roof tanks; apartment houses with open
corridors, a door and lamp per flat and an outside stair. Each is merged into one mesh per material across the
whole village, so the detail costs geometry, not draw calls.

## Camera

Each stop on the journey is a shot with its own lens, horizon tilt and move while it holds: a push-in, an arc round
the subject for parallax, or a dolly zoom (the monument, the trophy). Between shots the camera banks into its moves
like a crane arm. All of it is in the `SHOT` table in `src/world/main.js`.

## Performance

Lighthouse (local production build): **mobile 92–96, desktop 99**, with Accessibility, Best Practices and SEO at 100.
Run it against the Vercel URL, not an embedded preview, since the host page affects the score.

How the WebGL-heavy page stays fast:

- **Paint first.** The 一閃 loader is pure HTML and CSS, and its intro plays before any script runs. The CSS is
  inlined, and the section content is prerendered into `index.html` at build time (`src/content.js`, which also
  helps SEO).
- **Static first, WebGL on intent.** The hero shows a pre-baked image of the shader's ink look (`hero-ink.webp`,
  made with the same formula). Three.js lives in its own chunk and starts on the first pointer, touch, scroll or
  key (or after a few idle seconds), then crossfades in. The Two Sides, Special Moves and spiral scenes build
  only when you're within a couple of screens of them, with shaders compiled in parallel where supported.
- **No long tasks.** Setup yields between sections, pinned sections use pin spacers that already exist in the
  HTML (no DOM moves), full-screen scenes use `content-visibility: auto`, and looping CSS animations pause off
  screen. The render loop tracks visibility with IntersectionObserver instead of measuring every frame.
- **Lean bytes.** Fonts are self-hosted and subset; only the display font is preloaded. Phones get a lighter hero
  image, GL textures use 560 px copies (`img/gallery/gl/`), and below-the-fold images load after first paint.

## Loader sound

The 一閃 loader has its own score, synthesized with Web Audio in `src/ui/loaderSound.js` (no audio files): a drone and
breath, the brush stroke, a koto run as the name rises, ink drops, a riser into a subtle blade shing, a taiko hit on
the white flash, a whoosh and ka-ka-DON as the halves part, and a koto chord as the hero lands.

- **Sync.** Intro sounds are scheduled from the CSS animations' own start time; the cut's hits fire from the GSAP
  timeline in `src/ui/loader.js` (as `sv:sfx` events), so each lands on its frame even when the page is busy.
- **On by default.** `src/entry.js` tries to start it as the page opens. Browsers only allow that for some visitors,
  so otherwise it starts on the first click, tap or key during the loader and joins the animation where it is.
  The loader's sound button mutes it, and that choice is remembered (`localStorage` key `sv-sound`).
- **Small speakers.** Drums carry mid-range body and a little saturation, with a limiter at the end, so it reads on
  phone and laptop speakers. To retune a sound, edit its voice in `voices`.

## Type scale

All text uses nine size roles defined as CSS variables in `src/styles.css` (`--fs-display`, `--fs-h2`,
`--fs-stat`, `--fs-h3`, `--fs-lead`, `--fs-body`, `--fs-label`, `--fs-meta`, plus decorative background type).
Use a role instead of a new pixel size. Nothing goes below 13 px on desktop or 12 px on phones.

## Edit content

- **Text, projects, stats, experience, awards, podcast episodes:** `src/data.js`
- **Headline copy and section headings:** `index.html`
- **Photos:** `public/img/gallery/` (the order in `src/data.js` decides what orbits and spirals)
- **Résumé:** replace `public/resume.pdf`
- **Podcast clip:** `public/media/podcast-ep01.mp3`

## What's inside

| Section | Effect |
| --- | --- |
| Preloader | 一閃: the name rises over a brush stroke, then a blade of light cuts the screen and the halves slide apart, scored with synced sound |
| Background | Fixed shader: topographic contours + silk light ribbons, inverts to crimson |
| Hero | Kinetic outline type behind a portrait; a fluid cursor trail reveals colour under a crimson halftone ink layer |
| The arc | Pinned: the hero card zooms out, the world turns crimson, a red strip reveals the title, curved photo cards orbit in 3D |
| About | Spotlight headline whose squares expand into photos; lanyard badges swing with scroll |
| Two sides | STRATEGIST wraps a cylinder, BUILDER folds into a ridge; scroll flips between them |
| Battle stats | Trading cards that flip as they scroll past, with a running border light and a secret seventh card |
| Special moves | Pinned 3D showcase of four projects; RGB-split glitch on movement; letter-roll pills |
| Training arc | Pinned level-up screen: each internship is a stage that slices in, LV ticks up, a stat sheet grows, LEVEL UP / CLASS CHANGE bursts; then the trophy room and side quests |
| Flashbacks | Pinned spiral tower of 24 real photos with a free-falling cut-out |
| On air | Corner cut-outs slide in; the player card expands; waveform reacts to the audio |
| Footer | Notched card, strip-reveal tagline, letter-roll links, live IST clock, power level and hold-to-charge ki |

Extras: fullscreen menu with circular transitions, magnetic buttons, an SV-seal cursor that draws into 一 over links, `J` for judge mode (live FPS),
the Konami code, reduced-motion support, a no-WebGL fallback and a mobile dock with Résumé and Hire me.

The motion language is inspired by the JU TechFest 2026 website; all artwork, photos and copy here are Siddhant's own.
