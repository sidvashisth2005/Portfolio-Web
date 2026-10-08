import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { gallery, moves, stats, dojos, awards, leadership, episodes } from './data.js';
import { hasWebGL, loadTexture, isMobile } from './gl/utils.js';
import { createBackground } from './gl/background.js';
import { createHero } from './gl/hero.js';
import { createOrbit } from './gl/orbit.js';
import { createMoves } from './gl/moves.js';
import { createVortex } from './gl/vortex.js';
import { rollify, stripReveal, magnetic } from './ui/textfx.js';
import { initPodcast } from './ui/podcast.js';

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const webgl = hasWebGL();
const mobile = isMobile();
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
if (!webgl) document.documentElement.classList.add('no-webgl');

/* ---------------- Content ---------------- */
function renderContent() {
  const fmt = (n) => n.toLocaleString('en-IN');
  $('#numbers-grid').innerHTML = stats.map((s) => {
    const on = Math.round(s.bar * 20);
    const bars = Array.from({ length: 20 }, (_, i) => `<i class="${i < on ? 'on' : ''}" style="height:${30 + ((i * 37) % 70)}%"></i>`).join('');
    return `<article class="stat"><p class="stat__num" data-count="${s.value}" data-suffix="${s.suffix}">${fmt(s.value)}<small>${s.suffix}</small></p><p class="stat__label">${s.label}</p><div class="stat__bars" aria-hidden="true">${bars}</div></article>`;
  }).join('');

  $('#dojos').innerHTML = dojos.map((d) => `
    <li class="dojo">
      <span class="dojo__period">${d.period}</span>
      <div><span class="dojo__co">${d.company}</span><span class="dojo__role">${d.role} · ${d.where}</span></div>
      <span class="dojo__metric">${d.metric}</span>
      <ul>${d.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
    </li>`).join('');
  $('#leadership').innerHTML = leadership.map((l) => `<li>${l}</li>`).join('');
  $('#awards').innerHTML = awards.map((a) => `
    <li class="award"><div class="award__top"><span class="award__title">${a.title}</span><span class="award__scope">${a.scope}</span></div><p>${a.desc}</p></li>`).join('');

  $('#moves-nav').innerHTML = moves.map((m, i) => `
    <button class="move-pill${i === 0 ? ' is-active' : ''}" type="button" role="tab" aria-selected="${i === 0}" data-index="${i}">
      <span class="kj" aria-hidden="true">${m.kanji}</span><span class="roll" data-roll>${m.label}</span>
    </button>`).join('');

  $('#player-eps').innerHTML = episodes.map((e) => `<li><span>${e.ep}</span><span>${e.title}</span></li>`).join('');
  $('#vortex-fallback').innerHTML = gallery.map((g) => `<img src="${g.src}" alt="${g.caption}" loading="lazy" />`).join('');
}

function setMoveInfo(i) {
  const m = moves[i];
  $('#moves-info').innerHTML = `
    <h3>${m.title}</h3>
    <p class="label label--red">${m.kanji} · ${m.kanjiMeaning} · ${m.technique}</p>
    <ul>${m.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
    <div class="tags">${m.tags.map((t) => `<span>${t}</span>`).join('')}</div>
    ${m.github ? `<a class="pill pill--red" href="${m.github}" target="_blank" rel="noopener">Open case file ↗</a>` : ''}`;
  $('#moves-kanji').textContent = m.kanji;
  $('#moves-count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(moves.length).padStart(2, '0')}`;
  $$('.move-pill').forEach((p, j) => {
    p.classList.toggle('is-active', j === i);
    p.setAttribute('aria-selected', String(j === i));
  });
  if (!reduce) gsap.fromTo('#moves-info > *', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' });
}

/* ---------------- Loading ---------------- */
function createManager(onProgress) {
  const items = new Set();
  let total = 0, done = 0;
  return {
    start(k) { if (!items.has(k)) { items.add(k); total++; } },
    done() { done++; onProgress(done / Math.max(total, 1)); },
  };
}

function loadImage(src, manager) {
  return new Promise((res) => {
    manager.start(src);
    const im = new Image();
    im.onload = () => { manager.done(); res(im); };
    im.onerror = () => { manager.done(); res(null); };
    im.src = src;
  });
}

async function boot() {
  renderContent();
  setMoveInfo(0);
  $$('[data-roll]').forEach((el) => rollify(el));
  $$('.menu__label').forEach((el) => {
    const t = el.textContent;
    el.innerHTML = `<span class="first">${t.charAt(0)}</span>${t.slice(1)}`;
  });

  const fill = $('#seal-fill'), pctEl = $('#loader-pct'), leftEl = $('#loader-left');
  let shown = 0, real = 0;
  const manager = createManager((p) => { real = p; });
  const tick = () => {
    shown += (real - shown) * 0.12;
    const p = Math.min(shown, 1);
    fill.style.height = `${p * 100}%`;
    pctEl.textContent = Math.round(p * 100);
    leftEl.textContent = Math.max(1, Math.round(6200 * (1 - p))).toLocaleString('en-IN');
  };
  gsap.ticker.add(tick);

  manager.start('fonts');
  const fontsReady = Promise.all([
    document.fonts.ready,
    document.fonts.load('900 100px "Big Shoulders Display"'),
    document.fonts.load('100px "Dela Gothic One"', '農拡旅商作'),
    document.fonts.load('500 20px "Azeret Mono"'),
  ]).catch(() => {}).then(() => manager.done());

  let tex = {};
  if (webgl) {
    const orbitSrc = gallery.slice(0, mobile ? 10 : 16).map((g) => g.src);
    const [heroTex, polo, orbitTex, moveImgs] = await Promise.all([
      loadTexture('img/hero-cutout.webp', manager),
      loadTexture('img/polo-cutout.webp', manager),
      Promise.all(orbitSrc.map((s) => loadTexture(s, manager))),
      Promise.all(moves.map((m) => loadImage(m.image, manager))),
      fontsReady,
    ]);
    tex = { heroTex, polo, orbitTex: orbitTex.filter(Boolean), moveImgs };
  } else {
    await fontsReady;
  }
  real = 1;
  await new Promise((r) => setTimeout(r, reduce ? 0 : 700));
  gsap.ticker.remove(tick);
  fill.style.height = '100%';
  pctEl.textContent = '100';
  leftEl.textContent = '1';

  start(tex);
}

/* ---------------- Start ---------------- */
function start(tex) {
  // Smooth scroll
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  window.lenis = lenis;
  const scrollTo = (target, immediate = false) => {
    if (lenis) lenis.scrollTo(target, { immediate, duration: 1.4 });
    else (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView());
  };

  // WebGL modules
  const gl = {};
  if (webgl) {
    gl.bg = createBackground($('#bg-canvas'));
    if (tex.heroTex) gl.hero = createHero($('#hero-canvas'), tex.heroTex, tex.heroTex.image, { auto: !reduce });
    if (tex.orbitTex?.length) gl.orbit = createOrbit($('#orbit-canvas'), tex.orbitTex);
    gl.moves = createMoves($('#moves-canvas'), moves, tex.moveImgs);
    if (tex.orbitTex?.length) gl.vortex = createVortex($('#vortex-canvas'), tex.orbitTex, tex.polo);
  }
  const podcast = initPodcast();

  // Reveal the page: circle wipe out of the preloader
  const pre = $('#preloader');
  const intro = gsap.timeline({ onComplete: () => { pre.remove(); document.body.classList.remove('is-loading'); ScrollTrigger.refresh(); } });
  if (reduce) {
    intro.set(pre, { autoAlpha: 0 });
  } else {
    intro.to('.preloader__inner', { scale: 0.9, autoAlpha: 0, duration: 0.45, ease: 'power2.in' })
      .to(pre, { clipPath: 'circle(0% at 50% 50%)', duration: 0.9, ease: 'expo.inOut' }, '-=0.1')
      .from('.hero__name span', { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, '-=0.45')
      .from('.hero__copy .label, .hero__lede, .hero__ctas, .hero__rank', { y: 30, autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, '-=0.9')
      .from('.marquee', { autoAlpha: 0, duration: 1.2 }, '-=1')
      .add(() => gl.hero && gsap.to(gl.hero.uniforms.uReveal, { value: 1, duration: 1.6, ease: 'expo.out' }), '-=1.4');
    gsap.set(pre, { clipPath: 'circle(150% at 50% 50%)' });
  }
  if (reduce && gl.hero) gl.hero.uniforms.uReveal.value = 1;

  setupScroll({ gl, scrollTo, lenis });
  setupMenu(scrollTo);
  setupMisc();

  // Render loop: background always; other scenes only while their section is on screen.
  const views = [
    ['hero', '#top .hero__sticky'], ['orbit', '#top .hero__sticky'], ['moves', '.moves__sticky'], ['vortex', '.vortex__sticky'],
  ].map(([k, s]) => [k, $(s)]);
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > -50 && r.top < window.innerHeight + 50; };
  let frames = 0, last = performance.now(), fps = 0;
  gsap.ticker.add((time) => {
    gl.bg?.render(time);
    views.forEach(([k, el]) => { if (gl[k] && el && onScreen(el)) gl[k].render(time); });
    if (onScreen($('.onair__sticky'))) podcast.render(time);
    frames++;
    const now = performance.now();
    if (now - last > 500) { fps = Math.round((frames * 1000) / (now - last)); frames = 0; last = now; const j = $('#judge'); if (j) j.textContent = `${fps} FPS · ${webgl ? 'WebGL' : 'no WebGL'} · ${mobile ? 'mobile' : 'desktop'} tier`; }
  });
}

/* ---------------- Scroll choreography ---------------- */
function setupScroll({ gl, scrollTo }) {
  const H = () => window.innerHeight;
  const bgU = gl.bg?.uniforms;

  // HERO: pin, card zooms out, world inverts to crimson, strip reveal, photo orbit
  if (!reduce) {
    const welcome = $('#welcome');
    const strip = $('#welcome-strip');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#top', start: 'top top', end: () => `+=${mobile ? 2600 : 4600}`, pin: true, scrub: mobile ? 0.3 : 0.6, anticipatePin: 1, invalidateOnRefresh: true },
    });
    tl.to('#hero-card', { scale: 0.44, borderRadius: 18, boxShadow: '0 30px 100px rgba(0,0,0,.95), 0 0 0 1px rgba(224,24,45,.5)', ease: 'power1.inOut', duration: 0.2 }, 0)
      .to('.hero__copy, .hero__rank, .hero__hint', { autoAlpha: 0, duration: 0.08 }, 0.02);
    if (bgU) tl.to(bgU.uInvert, { value: 1, duration: 0.14, ease: 'power1.inOut' }, 0.1);
    tl.to('#hero-card', { autoAlpha: 0, scale: 0.36, duration: 0.07 }, 0.2)
      .to(welcome, { opacity: 1, duration: 0.04 }, 0.22)
      .fromTo(strip.querySelector('.strip-reveal__bar'), { left: '0%', width: '0%' }, { width: '100%', duration: 0.05, ease: 'power2.inOut' }, 0.24)
      .set(strip.querySelector('.strip-reveal__text'), { opacity: 1 }, 0.29)
      .to(strip.querySelector('.strip-reveal__bar'), { left: '100%', width: '0%', duration: 0.05, ease: 'power2.inOut' }, 0.29)
      .fromTo('.welcome__name', { scale: 0.6, autoAlpha: 0, filter: 'blur(14px)' }, { scale: 1, autoAlpha: 1, filter: 'blur(0px)', duration: 0.08, ease: 'power3.out' }, 0.27)
      .fromTo('.welcome__jp', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.32);
    if (gl.orbit) tl.fromTo(gl.orbit.state, { progress: 0 }, { progress: 1, duration: 0.6, ease: 'none' }, 0.3);
    tl.to(welcome, { opacity: 0, duration: 0.06 }, 0.9);
    if (bgU) tl.to(bgU.uInvert, { value: 0, duration: 0.1 }, 0.88);
  }

  // ABOUT: lanyards swing with scroll, headline words rise, spots open on hover / tap / focus
  if (!reduce) {
    gsap.timeline({ scrollTrigger: { trigger: '#about', start: 'top 85%', end: 'bottom 15%', scrub: 1 } })
      .fromTo(['#lanyard-left', '#lanyard-right'], { y: -260, rotate: (i) => (i ? 14 : -14) }, { y: 0, rotate: 0, ease: 'power2.out', duration: 0.4 })
      .to('#lanyard-left', { rotate: 8, duration: 0.3 }, 0.4).to('#lanyard-right', { rotate: -10, duration: 0.3 }, 0.4)
      .to(['#lanyard-left', '#lanyard-right'], { y: -120, rotate: 0, duration: 0.3 }, 0.7);
    gsap.from('.spot-head .line', { yPercent: 60, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.spot-head', start: 'top 80%' } });
  }
  const spots = $$('.spot');
  const cardSize = () => (window.innerWidth >= 900 ? { w: '26rem', h: '18rem' } : { w: `${Math.min(window.innerWidth * 0.78, 310)}px`, h: `${Math.min(window.innerWidth * 0.78, 310) * 0.72}px` });
  const openSpot = (s) => {
    spots.forEach((o) => o !== s && closeSpot(o));
    s.classList.add('is-active');
    const c = cardSize();
    gsap.to(s.querySelector('.spot__card'), { width: c.w, height: c.h, duration: reduce ? 0 : 0.6, ease: 'power3.out', overwrite: 'auto' });
  };
  const closeSpot = (s) => {
    s.classList.remove('is-active');
    gsap.to(s.querySelector('.spot__card'), { width: 0, height: 0, duration: reduce ? 0 : 0.35, ease: 'power3.out', overwrite: 'auto' });
  };
  spots.forEach((s) => {
    s.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && openSpot(s));
    s.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && closeSpot(s));
    s.addEventListener('focus', () => openSpot(s));
    s.addEventListener('blur', () => closeSpot(s));
    s.addEventListener('click', () => (s.classList.contains('is-active') ? closeSpot(s) : openSpot(s)));
  });

  // NUMBERS: counters + bars
  $$('.stat').forEach((card, i) => {
    const num = card.querySelector('.stat__num');
    const target = +num.dataset.count;
    const suffix = num.dataset.suffix;
    ScrollTrigger.create({
      trigger: card, start: 'top 85%', once: true,
      onEnter: () => {
        if (reduce) return;
        const o = { v: 0 };
        gsap.to(o, { v: target, duration: 1.8, delay: i * 0.08, ease: 'power3.out', onUpdate: () => { num.innerHTML = `${Math.round(o.v).toLocaleString('en-IN')}<small>${suffix}</small>`; } });
        gsap.from(card.querySelectorAll('.stat__bars i'), { scaleY: 0, duration: 0.6, stagger: 0.025, delay: 0.2 + i * 0.08, ease: 'power2.out' });
        gsap.from(card, { y: 40, autoAlpha: 0, duration: 0.9, delay: i * 0.06, ease: 'power3.out' });
      },
    });
  });

  // MOVES: pinned, scroll walks through the four techniques
  let active = 0;
  const n = moves.length;
  let movesST = null;
  if (!reduce) {
    movesST = ScrollTrigger.create({
      trigger: '#moves', start: 'top top', end: () => `+=${(mobile ? 700 : 950) * (n - 1)}`, pin: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const t = self.progress * (n - 1);
        if (gl.moves) gl.moves.state.target = t;
        const idx = Math.round(t);
        if (idx !== active) { active = idx; setMoveInfo(idx); }
      },
    });
    gsap.from(['.moves__left', '.moves__nav'], { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '#moves', start: 'top 70%' } });
  }
  $$('.move-pill').forEach((p) => p.addEventListener('click', () => {
    const i = +p.dataset.index;
    if (movesST) scrollTo(movesST.start + (movesST.end - movesST.start) * (i / (n - 1)));
    else { if (gl.moves) gl.moves.state.target = i; active = i; setMoveInfo(i); }
  }));

  // TRAINING: rows rise in
  if (!reduce) {
    ScrollTrigger.batch('.dojo, .award', { start: 'top 88%', onEnter: (els) => gsap.from(els, { y: 40, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' }) });
  }

  // VORTEX: pinned spiral, header lifts away, counter climbs
  const counter = $('#vortex-count');
  if (!reduce) {
    ScrollTrigger.create({
      trigger: '#flashbacks', start: 'top top', end: () => `+=${mobile ? 1800 : 3200}`, pin: true, scrub: 0.5, invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (gl.vortex) gl.vortex.state.progress = self.progress;
        counter.textContent = Math.round(self.progress * 6199).toLocaleString('en-IN');
        const head = $('#vortex-head');
        head.style.opacity = Math.max(1 - self.progress * 2.8, 0);
        head.style.transform = `translateX(-50%) translateY(${-self.progress * 130}px)`;
      },
    });
  } else if (gl.vortex) gl.vortex.state.progress = 0.3;

  // ON AIR: corner cut-outs slide in, card expands
  if (!reduce) {
    gsap.timeline({ scrollTrigger: { trigger: '#onair', start: 'top top', end: () => `+=${mobile ? 1000 : 1800}`, pin: true, scrub: 0.6, invalidateOnRefresh: true } })
      .fromTo('#corner-l', { xPercent: -60, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' }, 0)
      .fromTo('#corner-r', { xPercent: 60, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' }, 0)
      .fromTo('.onair__title', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3 }, 0.05)
      .fromTo('#player', { scale: 0.42, autoAlpha: 0.4, borderRadius: 40 }, { scale: 1, autoAlpha: 1, borderRadius: 22, duration: 0.55, ease: 'power2.out' }, 0.15)
      .to({}, { duration: 0.3 });
  }

  // FOOTER: strip reveals, character rises, header logo steps aside
  ScrollTrigger.create({
    trigger: '#contact', start: 'top 70%', once: true,
    onEnter: () => {
      if (reduce) { $$('.footer [data-strip] .strip-reveal__text').forEach((t) => (t.style.opacity = 1)); return; }
      $$('.footer [data-strip]').forEach((el, i) => stripReveal(el, { delay: 0.15 + i * 0.18 }));
      gsap.from('#footer-char', { yPercent: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out' });
    },
  });
  ScrollTrigger.create({
    trigger: '#contact', start: 'top 40%',
    onEnter: () => gsap.to('#header-logo', { autoAlpha: 0, y: -20, duration: 0.3 }),
    onLeaveBack: () => gsap.to('#header-logo', { autoAlpha: 1, y: 0, duration: 0.3 }),
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* ---------------- Menu + circular transitions ---------------- */
function setupMenu(scrollTo) {
  const btn = $('#menu-btn'), menu = $('#menu');
  let open = false;
  const items = $$('.menu__item');
  const tl = gsap.timeline({ paused: true })
    .set(menu, { visibility: 'visible' })
    .to('.menu__bg', { clipPath: 'circle(150% at calc(100% - 56px) 42px)', duration: 0.8, ease: 'expo.inOut' })
    .to(items, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, 0.35)
    .to('.menu__side', { opacity: 1, duration: 0.5 }, 0.5);
  const toggle = (state = !open) => {
    open = state;
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) { window.lenis?.stop(); tl.timeScale(1).play(); items[0]?.focus({ preventScroll: true }); } else { window.lenis?.start(); tl.timeScale(1.6).reverse(); }
  };
  btn.addEventListener('click', () => toggle());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { toggle(false); btn.focus(); } });

  const overlay = $('#transition');
  const circleTo = (href, x, y) => {
    const target = $(href);
    if (!target) return;
    if (reduce) { toggle(false); scrollTo(target, true); return; }
    gsap.timeline()
      .set(overlay, { clipPath: `circle(0% at ${x}px ${y}px)` })
      .to(overlay, { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 0.65, ease: 'expo.inOut' })
      .add(() => { if (open) toggle(false); scrollTo(target, true); })
      .to(overlay, { clipPath: `circle(0% at ${window.innerWidth / 2}px ${window.innerHeight / 2}px)`, duration: 0.7, ease: 'expo.inOut', delay: 0.1 });
  };
  items.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); circleTo(a.getAttribute('href'), e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2); }));
  $$('a[href^="#"]:not(.menu__item)').forEach((a) => a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href.length < 2) return;
    e.preventDefault();
    if (href === '#top' || href === '#contact') circleTo(href, e.clientX, e.clientY);
    else scrollTo($(href));
  }));
}

/* ---------------- Small delights ---------------- */
function setupMisc() {
  // Live IST clock
  const clock = $('#clock');
  const tickClock = () => {
    try { clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { /* ignore */ }
  };
  tickClock();
  setInterval(tickClock, 1000);

  // Copy email
  const copyBtn = $('#copy-mail'), copyState = $('#copy-state');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('siddhantvashisth05@gmail.com'); copyState.textContent = 'Copied'; } catch { copyState.textContent = 'Select it'; }
    setTimeout(() => (copyState.textContent = 'Copy'), 2000);
  });

  // Magnetic buttons
  if (!reduce && window.matchMedia('(hover: hover)').matches) $$('.magnetic').forEach((el) => magnetic(el));

  // Cursor
  const cursor = $('#cursor'), label = $('#cursor-label');
  if (window.matchMedia('(hover: hover)').matches && !reduce) {
    const pos = { x: -100, y: -100 }, cur = { x: -100, y: -100 };
    window.addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; cursor.style.opacity = 1; }, { passive: true });
    gsap.ticker.add(() => { cur.x += (pos.x - cur.x) * 0.2; cur.y += (pos.y - cur.y) * 0.2; cursor.style.transform = `translate(${cur.x}px, ${cur.y}px)`; });
    const hoverables = [['.spot', 'View'], ['.move-pill', 'Pick'], ['.footer__cta, .hero__ctas .pill--red', 'Say hi'], ['#hero-canvas', 'Reveal']];
    hoverables.forEach(([sel, text]) => $$(sel).forEach((el) => {
      el.addEventListener('pointerenter', () => { label.textContent = text; cursor.classList.add('is-big'); });
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-big'));
    }));
  }

  // Toast helper
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('is-on'), 3200); };

  // Konami code: standing ovation
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let k = 0;
  document.addEventListener('keydown', (e) => {
    k = e.key === code[k] || e.key.toLowerCase() === code[k] ? k + 1 : 0;
    if (k === code.length) {
      k = 0;
      toast('Standing ovation. 6,200 → 1. You found the secret.');
      if (reduce) return;
      for (let i = 0; i < 80; i++) {
        const c = document.createElement('span');
        c.className = 'confetti';
        c.style.left = `${Math.random() * 100}vw`;
        c.style.background = i % 6 === 0 ? '#FFD60A' : '#E0182D';
        document.body.appendChild(c);
        gsap.to(c, { y: window.innerHeight + 40, x: (Math.random() - 0.5) * 200, rotation: Math.random() * 720, duration: 1.6 + Math.random() * 1.4, ease: 'power1.in', onComplete: () => c.remove() });
      }
    }
    // Judge mode: a live tech overlay for hackathon judges
    if (e.key.toLowerCase() === 'j' && !e.target.closest('input, textarea')) {
      let j = $('#judge');
      if (j) { j.remove(); return; }
      j = document.createElement('div');
      j.id = 'judge';
      j.setAttribute('role', 'status');
      j.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:150;font:500 11px/1.4 "Azeret Mono",monospace;letter-spacing:.08em;background:rgba(6,6,8,.85);border:1px solid #E0182D;color:#F4F2EE;padding:8px 12px;border-radius:8px;text-transform:uppercase';
      j.textContent = 'Judge mode';
      document.body.appendChild(j);
    }
  });

  console.log('%c SV %c Built with Three.js, GSAP, Lenis and custom GLSL. Press J for judge mode. Try the Konami code. ', 'background:#E0182D;color:#fff;font-weight:700;padding:4px 6px', 'color:#E0182D');
}

boot();
