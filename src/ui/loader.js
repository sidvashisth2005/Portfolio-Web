// 一閃 (issen, "one flash"). The name rises over a crimson brush stroke of 一 ("one") while a hairline loads.
// When everything is ready the camera pushes in, a blade of light cuts the screen diagonally,
// an impact frame flashes, and the two halves slide apart onto the hero.
import gsap from 'gsap';

export function createLoader(root) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const halfA = root.querySelector('.pl-half--a');

  // split the name into letters, then clone the whole layer for the second half of the cut
  halfA.querySelectorAll('.pl-name .pl-word').forEach((w) => {
    const t = w.textContent;
    w.textContent = '';
    [...t].forEach((c) => { const s = document.createElement('span'); s.className = 'pl-ch'; s.textContent = c; w.append(s); });
  });
  const halfB = halfA.cloneNode(true);
  halfB.classList.replace('pl-half--a', 'pl-half--b');
  halfB.setAttribute('aria-hidden', 'true');
  halfB.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  halfA.after(halfB);

  const slash = root.querySelector('.pl-slash');
  const flash = root.querySelector('.pl-flash');
  const sparks = root.querySelector('.pl-sparks');
  const sctx = sparks.getContext('2d');
  const bars = root.querySelectorAll('.pl-bar i');
  const pcts = root.querySelectorAll('.pl-pct');

  // geometry of the cut: from (0, 62%) to (100%, 38%)
  let W = 0, H = 0, dpr = 1, angle = 0;
  function layout() {
    W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    sparks.width = W * dpr; sparks.height = H * dpr;
    sparks.style.width = `${W}px`; sparks.style.height = `${H}px`;
    angle = Math.atan2(-0.24 * H, W);
    gsap.set(slash, { rotation: (angle * 180) / Math.PI });
  }
  layout();
  window.addEventListener('resize', layout);

  // intro: letters rise out of blur, the brush paints 一, small type settles
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
    .fromTo('.pl-content', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' }, 0)
    .fromTo('.pl-ichi', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut' }, 0.15)
    .fromTo('.pl-ichi', { scale: 1.08, filter: 'blur(6px)' }, { scale: 1, filter: 'blur(0px)', duration: 1.4 }, 0.15)
    .fromTo('.pl-drop', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(3)' }, 1.0)
    .fromTo('.pl-ch', { yPercent: 115, rotate: 8, filter: 'blur(10px)' }, { yPercent: 0, rotate: 0, filter: 'blur(0px)', duration: 1.1, stagger: 0.035 }, 0.35)
    .fromTo(['.pl-top', '.pl-sub', '.pl-bottom'], { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08 }, 0.7);

  const begin = () => (reduce ? intro.progress(1) : intro.play());
  if (document.fonts) document.fonts.load('900 100px "Big Shoulders Display"').catch(() => {}).then(begin);
  else begin();

  // hairline follows the real progress, never faster than ~1.8s end to end
  let real = 0, shown = 0;
  const t0 = performance.now();
  const setBar = (p) => {
    bars.forEach((b) => (b.style.transform = `scaleX(${p})`));
    pcts.forEach((e) => (e.textContent = String(Math.round(p * 100)).padStart(3, '0')));
  };

  // sparks thrown off the blade
  let parts = [];
  function burst() {
    const cx = W / 2, cy = H / 2;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    for (let i = 0; i < 160; i++) {
      const t = (Math.random() - 0.5) * Math.hypot(W, H) * 0.9;
      const side = Math.random() < 0.5 ? -1 : 1;
      const sp = 4 + Math.random() * 14;
      parts.push({
        x: cx + dx * t, y: cy + dy * t,
        vx: dx * (Math.random() - 0.3) * 10 - dy * side * sp, vy: dy * (Math.random() - 0.3) * 10 + dx * side * sp,
        life: 1, decay: 0.012 + Math.random() * 0.025,
        c: i % 5 === 0 ? '255,214,10' : i % 3 === 0 ? '255,255,255' : '255,74,92',
      });
    }
  }
  function drawSparks() {
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.97; p.vy *= 0.97; p.life -= p.decay;
      sctx.strokeStyle = `rgba(${p.c},${Math.max(0, p.life)})`;
      sctx.lineWidth = 2;
      sctx.beginPath(); sctx.moveTo(p.x, p.y); sctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); sctx.stroke();
    }
  }

  return {
    setProgress(p) { real = Math.max(real, Math.min(1, p)); },
    tick() {
      const cap = reduce ? 1 : Math.min(1, (performance.now() - t0) / 1800);
      const target = Math.min(real, cap);
      shown += (target - shown) * 0.1;
      if (target >= 1 && shown > 0.996) shown = 1;
      setBar(shown);
      return shown;
    },
    finish(onLift) {
      return new Promise((resolve) => {
        const done = () => { gsap.ticker.remove(drawSparks); window.removeEventListener('resize', layout); resolve(); };
        if (reduce) {
          setBar(1);
          gsap.timeline({ onComplete: done }).add(() => onLift?.()).to(root, { autoAlpha: 0, duration: 0.4 });
          return;
        }
        gsap.ticker.add(drawSparks);
        const cutA = 'polygon(0% 0%, 100% 0%, 100% 38%, 0% 62%)';
        const cutB = 'polygon(0% 62%, 100% 38%, 100% 100%, 0% 100%)';
        const tl = gsap.timeline({ onComplete: done });
        const bar = { v: shown };
        tl.to(bar, { v: 1, duration: 0.32, ease: 'power2.out', onUpdate: () => setBar(bar.v) }, 0);
        if (intro.progress() < 1) tl.to(intro, { progress: 1, duration: 0.2, ease: 'none' }, 0);
        // the breath before the cut: camera pushes in, the stroke glows (starts moving at once, no dead air)
        tl.to('.pl-content', { scale: 1.04, duration: 0.5, ease: 'sine.in' }, 0.12)
          .to('.pl-ichi', { filter: 'drop-shadow(0 0 28px rgba(255,74,92,.9))', duration: 0.5, ease: 'sine.in' }, '<')
          .to(['.pl-top', '.pl-bottom', '.pl-sub'], { autoAlpha: 0, duration: 0.3 }, '<0.24')
          // the cut
          .set('.pl-half--a', { clipPath: cutA })
          .set('.pl-half--b', { clipPath: cutB })
          .fromTo(slash, { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, duration: 0.16, ease: 'expo.out' })
          .add(burst, '<0.04')
          // impact frame: white, then inverted, then back
          .set(flash, { autoAlpha: 1, backgroundColor: '#fff', mixBlendMode: 'normal' }, '<0.08')
          .set(flash, { mixBlendMode: 'difference' }, '+=0.05')
          .set(flash, { autoAlpha: 0 }, '+=0.06')
          // halves slide apart along the cut
          .set(root, { backgroundColor: 'transparent' })
          .add(() => onLift?.())
          .to('.pl-half--a', { x: () => -W * 0.06, y: () => -H * 0.75, rotation: -3, duration: 1.15, ease: 'expo.inOut' }, '+=0.02')
          .to('.pl-half--b', { x: () => W * 0.06, y: () => H * 0.75, rotation: 3, duration: 1.15, ease: 'expo.inOut' }, '<')
          .to(slash, { autoAlpha: 0, scaleY: 6, duration: 0.5, ease: 'power2.out' }, '<');
      });
    },
  };
}
