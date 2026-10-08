# Siddhant Vashisth · Portfolio

A cinematic, crimson-on-black portfolio built with **Vite, Three.js, GSAP (ScrollTrigger) and Lenis**, with hand-written GLSL shaders.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the build
```

## Deploy

Import the repo into [Vercel](https://vercel.com/new). The defaults work (framework: Vite, output: `dist`).
Canonical and Open Graph URLs use Vercel's production domain automatically. For a custom domain, set the
`VITE_SITE_URL` environment variable (for example `https://siddhant.dev`).

## Edit content

- **Text, projects, stats, experience, awards, podcast episodes:** `src/data.js`
- **Headline copy and section headings:** `index.html`
- **Photos:** `public/img/gallery/` (the order in `src/data.js` decides what orbits and spirals)
- **Résumé:** replace `public/resume.pdf`
- **Podcast clip:** `public/media/podcast-ep01.mp3`

## What's inside

| Section | Effect |
| --- | --- |
| Preloader | SV seal fills with ink; counter falls 6,200 → 1; circular wipe |
| Background | Fixed shader: topographic contours + silk light ribbons, inverts to crimson |
| Hero | Kinetic outline type behind a portrait; a fluid cursor trail reveals colour under a crimson halftone ink layer |
| The arc | Pinned: the hero card zooms out, the world turns crimson, a red strip reveals the title, curved photo cards orbit in 3D |
| About | Spotlight headline whose squares expand into photos; lanyard badges swing with scroll |
| Numbers | Glass cards with counters and bar meters |
| Special moves | Pinned 3D showcase of four projects; RGB-split glitch on movement; letter-roll pills |
| Training / Trophy room | Experience, leadership, awards, education |
| Flashbacks | Pinned spiral tower of 24 real photos with a free-falling cut-out |
| On air | Corner cut-outs slide in; the player card expands; waveform reacts to the audio |
| Footer | Notched card, strip-reveal tagline, letter-roll links, live IST clock |

Extras: fullscreen menu with circular transitions, magnetic buttons, custom cursor, `J` for judge mode (live FPS),
the Konami code, reduced-motion support, a no-WebGL fallback and a mobile dock with Résumé and Hire me.

The motion language is inspired by the JU TechFest 2026 website; all artwork, photos and copy here are Siddhant's own.
