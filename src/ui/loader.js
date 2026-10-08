// The tournament loader.
// 1. ENTRY: 6,200 points of light ripple onto the screen from the centre while assets load; the counter climbs to 6,200.
// 2. ELIMINATION: the field goes dark from the outside in; the counter falls 6,200 → 1.
// 3. THE ONE: the last point flares crimson, swells to fill the screen, and the curtain lifts.
import gsap from 'gsap';

const TOTAL = 6200;

export function createLoader(root) {
  const canvas = root.querySelector('#loader-canvas');
  const ctx = canvas.getContext('2d');
  const numEl = root.querySelector('#loader-num');
  const stateEl = root.querySelector('#loader-state');
  const pctEl = root.querySelector('#loader-pct');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  let dots = []; // { x, y, d (0..1 distance from centre), r (random), out (elimination time 0..1) }
  let winner = null;
  let cell = 8;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    // choose a grid with ~6,200 cells matching the screen's shape
    const cols = Math.round(Math.sqrt(TOTAL * (W / H)));
    const rows = Math.ceil(TOTAL / cols);
    cell = Math.min(W / cols, H / rows);
    const ox = (W - cols * cell) / 2 + cell / 2, oy = (H - rows * cell) / 2 + cell / 2;
    const cx = W / 2, cy = H / 2, maxD = Math.hypot(cx, cy);
    dots = [];
    let best = Infinity;
    for (let i = 0; i < TOTAL; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = ox + c * cell, y = oy + r * cell;
      const d = Math.hypot(x - cx, y - cy) / maxD;
      const rnd = Math.random();
      const dot = { x, y, d, r: rnd, out: Math.min(0.97, Math.max(0, (1 - d) * 0.82 + rnd * 0.18)) };
      dots.push(dot);
      if (d < best) { best = d; winner = dot; }
    }
    winner.out = 2; // never eliminated
    dots.sort((a, b) => a.out - b.out);
  }
  layout();

  const s = { entry: 0, elim: 0, flare: 0, swell: 0 };
  let running = true;

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const size = Math.max(1.6, cell * 0.28);
    // entry ripple radius (0..1.15 so the edge feathers in)
    const reach = s.entry * 1.15;
    // draw in 6 brightness buckets to keep state changes low
    const buckets = [[], [], [], [], [], []];
    for (let i = 0; i < dots.length; i++) {
      const p = dots[i];
      if (p === winner) continue;
      const appear = Math.min(1, Math.max(0, (reach - p.d) / 0.12));
      if (appear <= 0) continue;
      const gone = Math.min(1, Math.max(0, (s.elim - p.out) / 0.06));
      const a = appear * (1 - gone);
      if (a <= 0.02) continue;
      const tw = 0.8 + 0.2 * Math.sin(time * 2.4 + p.r * 40);
      buckets[Math.min(5, Math.floor(a * tw * 6))].push(p);
    }
    ctx.fillStyle = '#F4F2EE';
    for (let b = 0; b < 6; b++) {
      if (!buckets[b].length) continue;
      ctx.globalAlpha = 0.22 + b * 0.14;
      ctx.beginPath();
      for (const p of buckets[b]) ctx.rect(p.x - size / 2, p.y - size / 2, size, size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the winner
    if (winner && s.entry > 0.05) {
      const glow = s.flare;
      const r = size * (1 + glow * 2.2) + s.swell * Math.hypot(W, H);
      if (glow > 0) {
        const g = ctx.createRadialGradient(winner.x, winner.y, 0, winner.x, winner.y, r * 6 + 40);
        g.addColorStop(0, `rgba(224,24,45,${0.55 * glow})`);
        g.addColorStop(1, 'rgba(224,24,45,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = glow > 0.01 ? '#E0182D' : '#F4F2EE';
      ctx.beginPath();
      ctx.arc(winner.x, winner.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const loop = (time) => { if (running) draw(time); };
  gsap.ticker.add(loop);
  window.addEventListener('resize', layout);

  // The visible entry follows the real loading progress, but never runs faster than ~1.3s end to end.
  let real = 0;
  const t0 = performance.now();
  const fmt = (n) => n.toLocaleString('en-IN');

  return {
    setProgress(p) { real = Math.max(real, Math.min(1, p)); },
    tick() {
      const cap = reduce ? 1 : Math.min(1, (performance.now() - t0) / 1300);
      const target = Math.min(real, cap);
      s.entry += (target - s.entry) * 0.12;
      if (target >= 1 && s.entry > 0.995) s.entry = 1;
      numEl.textContent = fmt(Math.round(TOTAL * s.entry));
      pctEl.textContent = `${String(Math.round(s.entry * 100)).padStart(3, '0')}%`;
      return s.entry;
    },
    finish(onLift) {
      return new Promise((resolve) => {
        stateEl.textContent = 'Still standing';
        const counter = { v: TOTAL };
        const tl = gsap.timeline({
          onComplete: () => { running = false; gsap.ticker.remove(loop); window.removeEventListener('resize', layout); resolve(); },
        });
        if (reduce) {
          numEl.textContent = '1';
          tl.add(() => onLift?.()).to(root, { autoAlpha: 0, duration: 0.3 });
          return;
        }
        tl.to(s, { entry: 1, duration: 0.2, ease: 'power1.out' })
          .to(s, { elim: 1, duration: 1.5, ease: 'power2.inOut' }, '+=0.15')
          .to(counter, { v: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: () => { numEl.textContent = fmt(Math.max(1, Math.round(counter.v))); } }, '<')
          .add(() => { stateEl.textContent = 'Rank 1 · HackNITR 7.0'; root.classList.add('is-one'); })
          .to(s, { flare: 1, duration: 0.5, ease: 'expo.out' })
          .to('.loader__ui', { autoAlpha: 0, y: -12, duration: 0.35, ease: 'power2.in' }, '+=0.25')
          .to(s, { swell: 1, duration: 0.9, ease: 'expo.in' }, '<')
          .set(root, { backgroundColor: '#E0182D' })
          .add(() => onLift?.())
          .to(root, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.95, ease: 'expo.inOut' });
      });
    },
  };
}
