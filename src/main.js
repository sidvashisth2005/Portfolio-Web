import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { gallery, moves, stats, dojos, awards, leadership, episodes, statNames } from './data.js';
import { hasWebGL, loadTexture, isMobile } from './gl/utils.js';
import { createBackground } from './gl/background.js';
import { createHero } from './gl/hero.js';
import { createOrbit } from './gl/orbit.js';
import { createMoves } from './gl/moves.js';
import { createVortex } from './gl/vortex.js';
import { createDuality } from './gl/duality.js';
import { rollify, stripReveal, magnetic } from './ui/textfx.js';
import { initPodcast } from './ui/podcast.js';
import { createLoader } from './ui/loader.js';
import { initServices } from './ui/services.js';

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
  $('#stats-track').innerHTML = stats.map((s, i) => `
    <article class="tcard" data-rarity="${s.rarity}" data-count="${s.value}" data-suffix="${s.suffix}" data-bar="${s.bar}">
      <div class="tcard__tilt">
        <div class="tcard__inner">
          <div class="tcard__face tcard__front">
            <div class="tcard__top"><span class="tcard__rarity">${s.rarity}</span><span>No. ${String(i + 1).padStart(3, '0')} / ${String(stats.length).padStart(3, '0')}</span></div>
            <div class="tcard__art">
              <span class="tcard__kanji" aria-hidden="true">${s.kanji}</span>
              <span class="tcard__num">${fmt(s.value)}<small>${s.suffix}</small></span>
              <span class="tcard__meaning">${s.kanji} · ${s.meaning}</span>
            </div>
            <div class="tcard__type"><span>Type · ${s.type}</span><span>Power ${Math.round(s.bar * 100)}</span></div>
            <p class="tcard__label">${s.label}</p>
            <div class="tcard__meter" aria-hidden="true"><i></i></div>
            <div class="tcard__foot"><span>Siddhant V.</span><span class="stars" aria-label="${s.stars} of 5 stars">${'★'.repeat(s.stars)}${'☆'.repeat(5 - s.stars)}</span></div>
            <span class="tcard__glint" aria-hidden="true"></span>
          </div>
          <div class="tcard__face tcard__back" aria-hidden="true"><span class="seal seal--md"><span>SV</span></span><span class="label">Tournament arc · 2026</span></div>
        </div>
      </div>
    </article>`).join('') + `
    <article class="tcard tcard--sp" data-rarity="SP" data-special="1">
      <div class="tcard__tilt">
        <div class="tcard__inner">
          <div class="tcard__face tcard__front">
            <div class="tcard__top"><span class="tcard__rarity">SP</span><span>No. 000 · Secret</span></div>
            <div class="tcard__art tcard__art--photo">
              <span class="tcard__kanji" aria-hidden="true">主</span>
              <img src="img/maincharacter.webp" alt="Siddhant in sunglasses that read I don't care" loading="eager" />
              <span class="tcard__meaning">主 · main character</span>
            </div>
            <div class="tcard__type"><span>Type · Protagonist</span><span>Power ∞</span></div>
            <p class="tcard__label">Didn’t care that it was 6,200 to 1.</p>
            <div class="tcard__meter" aria-hidden="true"><i></i></div>
            <div class="tcard__foot"><span>Siddhant V.</span><span class="stars">Secret card</span></div>
            <span class="tcard__glint" aria-hidden="true"></span>
          </div>
          <div class="tcard__face tcard__back" aria-hidden="true"><span class="seal seal--md"><span>SV</span></span><span class="label">Tournament arc · 2026</span></div>
        </div>
      </div>
    </article>`;
  // level-up screen: stages in date order
  const stages = [...dojos].reverse();
  const NUMERALS = ['壱', '弐', '参'];
  $('#lvl-stage').innerHTML = stages.map((d, i) => `
    <article class="lvl__card${i === 0 ? ' is-on' : ''}" data-i="${i}" aria-hidden="${i !== 0}">
      <p class="lvl__ep"><span>Stage ${String(i + 1).padStart(2, '0')}</span><span>${d.period}</span><span>${d.where}</span></p>
      <h3 class="lvl__co">${d.company.replace(/ Pvt\. Ltd\./, '')}</h3>
      <p class="lvl__role">${d.role}</p>
      ${d.classChange ? `<p class="lvl__class"><span>Class change</span>${d.classChange}</p>` : ''}
      <p class="lvl__metric"><b>${d.metric}</b><span>${d.metricLabel}</span></p>
      <ul class="lvl__notes">${d.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
    </article>`).join('');
  $('#lvl-stats').innerHTML = statNames.map((st) => `
    <li data-k="${st.key}"><span class="lvl__sn">${st.short}<small>${st.label}</small></span><span class="lvl__bar"><i></i></span><b class="lvl__sv">0</b><em class="lvl__gain"></em></li>`).join('');
  $('#lvl-track').innerHTML = stages.map((d, i) => `
    <li><button type="button" data-i="${i}"${i === 0 ? ' aria-current="step"' : ''}><span class="lvl__dot">${NUMERALS[i]}</span><span class="lvl__tn">${d.company.replace(/ Pvt\. Ltd\.| Assists/g, '')}</span><span class="lvl__ty">${d.period.replace(/.*(\d{4})$/, '$1')}</span></button></li>`).join('');
  $('#lvl-stage').dataset.numerals = NUMERALS.join('');
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

// A refresh always starts fresh: loader first, then the top of the page (no restored scroll, no hash jump)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);
window.addEventListener('beforeunload', () => window.scrollTo(0, 0));

async function boot() {
  renderContent();
  setMoveInfo(0);
  $$('[data-roll]').forEach((el) => rollify(el));
  $$('.menu__label').forEach((el) => {
    const t = el.textContent;
    el.innerHTML = `<span class="first">${t.charAt(0)}</span>${t.slice(1)}`;
  });

  const loader = createLoader($('#preloader'));
  // assets fill the bar to 90%; the last 10% is the scene setup, so 100% means ready to cut
  const manager = createManager((p) => loader.setProgress(p * 0.9));
  let entry = 0;
  const tick = () => { entry = loader.tick(); };
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
    const [heroTex, faller, orbitTex, moveImgs] = await Promise.all([
      loadTexture('img/hero-cutout.webp', manager),
      loadTexture('img/dealwithit.webp', manager),
      Promise.all(orbitSrc.map((s) => loadTexture(s, manager))),
      Promise.all(moves.map((m) => loadImage(m.image, manager))),
      fontsReady,
    ]);
    tex = { heroTex, faller, orbitTex: orbitTex.filter(Boolean), moveImgs };
  } else {
    await fontsReady;
  }
  loader.setProgress(0.9);
  const until = (v) => new Promise((r) => { const wait = () => (entry >= v ? r() : requestAnimationFrame(wait)); wait(); });
  await until(0.895);
  // paint 90% before the heavier scene setup blocks the main thread
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const reveal = start(tex, loader);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  gsap.ticker.remove(tick);
  // the bar runs its last 10% while the cut winds up, so there's no pause at 100%
  reveal();
}

/* ---------------- Start ---------------- */
function start(tex, loader) {
  // Smooth scroll
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.08, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
  }
  window.lenis = lenis;
  const scrollTo = (target, immediate = false) => {
    // the hero is pinned, so its element offset lands at the end of the pin; home is always 0
    if (target === $('#top')) target = 0;
    if (lenis) lenis.scrollTo(target, { immediate, duration: 1.4, force: true });
    else (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView());
  };

  // WebGL modules
  const gl = {};
  if (webgl) {
    gl.bg = createBackground($('#bg-canvas'));
    if (tex.heroTex) gl.hero = createHero($('#hero-canvas'), tex.heroTex, tex.heroTex.image, { auto: !reduce });
    if (tex.orbitTex?.length) gl.orbit = createOrbit($('#orbit-canvas'), tex.orbitTex);
    gl.moves = createMoves($('#moves-canvas'), moves, tex.moveImgs);
    gl.duality = createDuality($('#duality-canvas'), ['STRATEGIST', 'BUILDER']);
    if (tex.orbitTex?.length) gl.vortex = createVortex($('#vortex-canvas'), tex.orbitTex, tex.faller);
  }
  const podcast = initPodcast();

  // Reveal: the loader plays its elimination; as its curtain lifts, the hero animates in underneath.
  const pre = $('#preloader');
  const heroIn = gsap.timeline({ paused: true })
    .from('.hero__name span', { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, 0.25)
    .from('.hero__copy .label, .hero__lede, .hero__ctas, .hero__rank', { y: 30, autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, 0.35)
    .from('.marquee', { autoAlpha: 0, duration: 1.2 }, 0.2)
    .add(() => gl.hero && gsap.to(gl.hero.uniforms.uReveal, { value: 1, duration: 1.6, ease: 'expo.out' }), 0);
  // Compile every scene's shaders now, while the loader still covers the page, so nothing hitches later.
  Object.values(gl).forEach((m) => { try { m.render?.(0); } catch { /* ignore */ } });
  const reveal = () => loader.finish(() => { if (!reduce) heroIn.play(); }).then(() => {
    pre.remove();
    document.body.classList.remove('is-loading');
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();
  });
  lenis?.scrollTo(0, { immediate: true, force: true });
  if (reduce) heroIn.progress(1);
  if (reduce && gl.hero) gl.hero.uniforms.uReveal.value = 1;

  setupScroll({ gl, scrollTo, lenis });
  setupMenu(scrollTo);
  setupMisc();

  // Render loop: background always; other scenes only while their section is on screen.
  const views = [
    ['hero', '#top .hero__sticky'], ['orbit', '#top .hero__sticky'], ['duality', '.duality__sticky'], ['moves', '.moves__sticky'], ['vortex', '.vortex__sticky'],
  ].map(([k, s]) => [k, $(s)]);
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > -50 && r.top < window.innerHeight + 50; };
  let frames = 0, last = performance.now(), fps = 0;
  gsap.ticker.add((time) => {
    gl.bg?.render(time);
    views.forEach(([k, el]) => { if (gl[k] && el && onScreen(el)) gl[k].render(time); });
    if (onScreen($('.onair__sticky'))) podcast.render(time);
    if (gl.duality && onScreen($('.duality__sticky'))) updateLadders(gl.duality.state);
    frames++;
    const now = performance.now();
    if (now - last > 500) { fps = Math.round((frames * 1000) / (now - last)); frames = 0; last = now; const j = $('#judge'); if (j) j.textContent = `${fps} FPS · ${webgl ? 'WebGL' : 'no WebGL'} · ${mobile ? 'mobile' : 'desktop'} tier`; }
  });  return reveal;
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
      scrollTrigger: { trigger: '#top', start: 'top top', end: () => `+=${mobile ? 2200 : 3600}`, pin: true, scrub: mobile ? 0.3 : 0.6, anticipatePin: 1, invalidateOnRefresh: true },
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
  // No pin: the headline keeps scrolling, and whichever square is passing the middle of the screen
  // pops its photo out. Only one is open at a time.
  let autoSpot = -1;
  if (!reduce) {
    const pick = () => {
      const mid = window.innerHeight * 0.5;
      let best = -1, bd = window.innerHeight * 0.16;
      spots.forEach((sp, i) => {
        const r = sp.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      });
      if (best === autoSpot) return;
      autoSpot = best;
      if (best < 0) spots.forEach(closeSpot); else openSpot(spots[best]);
    };
    ScrollTrigger.create({ trigger: '.spot-head', start: 'top bottom', end: 'bottom top', onUpdate: pick, onLeave: () => { autoSpot = -1; spots.forEach(closeSpot); }, onLeaveBack: () => { autoSpot = -1; spots.forEach(closeSpot); } });
  }
  spots.forEach((s) => {
    s.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && openSpot(s));
    s.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && closeSpot(s));
    s.addEventListener('focus', () => openSpot(s));
    s.addEventListener('blur', () => closeSpot(s));
    s.addEventListener('click', () => (s.classList.contains('is-active') ? closeSpot(s) : openSpot(s)));
  });

  // TWO SIDES: pinned. The word bends as you arrive, then one deliberate flip from STRATEGIST to BUILDER.
  const dual = $('#duality-sticky');
  let dualST = null;
  const setSide = (b, warped) => {
    dual.classList.toggle('is-b', b);
    dual.classList.toggle('show-a', !b && warped);
    dual.classList.toggle('show-b', b);
  };
  if (gl.duality && !reduce) {
    dualST = ScrollTrigger.create({
      trigger: '#duality', start: 'top top', end: () => `+=${mobile ? 1300 : 1700}`, pin: true, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        const st = gl.duality.state;
        st.targetWarp = Math.min(1, p / 0.15);
        // flips soon after STRATEGIST is fully bent
        const b = p > 0.32;
        st.targetCurve = b ? 1 : 0;
        setSide(b, st.targetWarp > 0.6);
      },
      onLeaveBack: () => { gl.duality.state.targetWarp = 0; gl.duality.state.targetCurve = 0; setSide(false, false); },
    });
  } else if (gl.duality) {
    gl.duality.state.targetWarp = 0.75;
    setSide(false, true);
    dual.classList.add('show-b');
  }
  $$('[data-ladder]').forEach((btn) => btn.addEventListener('click', (e) => {
    if (!dualST) return;
    const r = btn.getBoundingClientRect();
    const toB = (e.clientY - r.top) / r.height >= 0.5;
    scrollTo(dualST.start + (dualST.end - dualST.start) * (toB ? 0.62 : 0.22));
  }));

  // BATTLE STATS: pinned horizontal run; each card flips from its back, counts up and fills its meter
  const cardsEls = $$('.tcard');
  const setCard = (card, p) => {
    if (card.dataset.special) {
      card.querySelector('.tcard__inner').style.transform = `rotateY(${180 - 180 * p}deg)`;
      card.querySelector('.tcard__meter i').style.width = `${100 * Math.min(1, Math.max(0, (p - 0.5) / 0.5))}%`;
      return;
    }
    const target = +card.dataset.count;
    const suffix = card.dataset.suffix;
    card.querySelector('.tcard__inner').style.transform = `rotateY(${180 - 180 * p}deg)`;
    const v = Math.round(target * Math.min(1, Math.max(0, (p - 0.45) / 0.55)));
    card.querySelector('.tcard__num').innerHTML = `${v.toLocaleString('en-IN')}<small>${suffix}</small>`;
    card.querySelector('.tcard__meter i').style.width = `${+card.dataset.bar * 100 * Math.min(1, Math.max(0, (p - 0.5) / 0.5))}%`;
  };
  if (!reduce) {
    const track = $('#stats-track');
    const last = cardsEls[cardsEls.length - 1];
    const dist = () => last.offsetLeft + last.offsetWidth / 2 - window.innerWidth / 2;
    const update = () => {
          const mid = window.innerWidth / 2;
          let best = 0, bd = Infinity;
          cardsEls.forEach((c, i) => {
            const r = c.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const d = Math.abs(cx - mid);
            if (d < bd) { bd = d; best = i; }
            // flip as the card travels from the right edge to just right of centre
            const p = Math.min(1, Math.max(0, (window.innerWidth * 0.98 - cx) / (window.innerWidth * 0.34)));
            setCard(c, p);
            c.style.transform = `translateY(${(1 - p) * 40}px) scale(${0.86 + p * 0.14})`;
          });
          $('#stats-idx').textContent = String(best + 1).padStart(2, '0');
          // the heading steps back as the first card slides underneath it
          const head = $('.stats__head');
          const firstLeft = cardsEls[0].getBoundingClientRect().left;
          const hr = head.getBoundingClientRect().right;
          head.style.opacity = window.innerWidth <= 760 ? 1 : Math.min(1, Math.max(0.08, (firstLeft - hr + 60) / 240));
    };
    gsap.to(track, {
      x: () => -dist(), ease: 'none', onUpdate: update,
      scrollTrigger: { trigger: '#numbers', start: 'top top', end: () => `+=${dist() * 1.15}`, pin: true, scrub: 0.6, invalidateOnRefresh: true },
    });
    gsap.to('#stats-bgtype', { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '#numbers', start: 'top top', end: () => `+=${dist() * 1.15}`, scrub: 1, invalidateOnRefresh: true } });
    cardsEls.forEach((c) => setCard(c, 0));
  } else {
    cardsEls.forEach((c) => setCard(c, 1));
  }
  // Tilt that follows the pointer
  if (window.matchMedia('(hover: hover)').matches) {
    cardsEls.forEach((c) => {
      const tilt = c.querySelector('.tcard__tilt');
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        if (!reduce) tilt.style.transform = `rotateX(${(0.5 - y) * 14}deg) rotateY(${(x - 0.5) * 18}deg)`;
      });
      c.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
    });
  }

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

  // TRAINING: the level-up screen pins here (created in page order so later pins measure correctly)
  setupLevel(scrollTo);
  $$('.award, .quests li').forEach((el) => gsap.from(el, { y: 40, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));

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
  // the wordmark tucks into the seal once you leave the top of the page
  ScrollTrigger.create({ start: 160, end: 'max', onToggle: (self) => $('#header').classList.toggle('is-compact', self.isActive) });
  ScrollTrigger.create({
    trigger: '#contact', start: 'top 40%',
    onEnter: () => gsap.to('#header-logo', { autoAlpha: 0, y: -20, duration: 0.3 }),
    onLeaveBack: () => gsap.to('#header-logo', { autoAlpha: 1, y: 0, duration: 0.3 }),
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* ---------------- Level-up screen ---------------- */
// Pinned. Each internship is a stage: the card slices in on a diagonal, LV ticks up, the stat bars grow
// and float their gains, and a LEVEL UP (or CLASS CHANGE) burst hits once per stage.
function setupLevel(scrollTo) {
  const cards = $$('.lvl__card'), trackBtns = $$('#lvl-track button'), rows = $$('#lvl-stats li');
  const numerals = [...$('#lvl-stage').dataset.numerals];
  const n = cards.length;
  const stages = [...dojos].reverse();
  const num = $('#lvl-num'), kanji = $('#lvl-kanji'), burst = $('#lvl-burst'), burstTxt = $('#lvl-burst-txt'), burstSub = $('#lvl-burst-sub');
  const shown = Object.fromEntries(statNames.map((s) => [s.key, 0]));
  let cur = -1;

  const paintStats = (i, animate) => {
    const target = stages[i].stats, prev = i > 0 ? stages[i - 1].stats : null;
    rows.forEach((row) => {
      const k = row.dataset.k, bar = row.querySelector('i'), val = row.querySelector('.lvl__sv'), gain = row.querySelector('.lvl__gain');
      const o = { v: shown[k] };
      gsap.to(o, { v: target[k], duration: animate ? 1 : 0, ease: 'expo.out', overwrite: 'auto', onUpdate: () => { shown[k] = o.v; val.textContent = Math.round(o.v); bar.style.transform = `scaleX(${o.v / 100})`; } });
      const d = target[k] - (prev ? prev[k] : 0);
      row.classList.toggle('is-up', !!prev && d > 0);
      if (animate && prev && d > 0) {
        gain.textContent = `+${d}`;
        gsap.fromTo(gain, { y: 8, autoAlpha: 0 }, { y: -10, autoAlpha: 1, duration: 0.5, ease: 'back.out(2)', onComplete: () => gsap.to(gain, { autoAlpha: 0, y: -18, duration: 0.5, delay: 0.9 }) });
      }
    });
  };

  const go = (i, animate = true) => {
    if (i === cur) return;
    const dir = i > cur ? 1 : -1, from = cards[cur];
    cur = i;
    num.textContent = String(i + 1).padStart(2, '0');
    kanji.textContent = numerals[i];
    trackBtns.forEach((b, j) => { if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.classList.toggle('is-done', j < i); });
    $('#lvl').style.setProperty('--stage', i / Math.max(1, n - 1));
    cards.forEach((c, j) => { c.classList.toggle('is-on', j === i); c.setAttribute('aria-hidden', j !== i); });
    paintStats(i, animate);
    if (!animate || reduce) { cards.forEach((c, j) => gsap.set(c, { autoAlpha: j === i ? 1 : 0, clipPath: 'none', x: 0 })); return; }
    // the new stage is cut in along a diagonal, the old one slides out the other way
    if (from) gsap.to(from, { autoAlpha: 0, x: -60 * dir, duration: 0.45, ease: 'power2.in', overwrite: 'auto' });
    gsap.fromTo(cards[i],
      { autoAlpha: 1, x: 60 * dir, clipPath: dir > 0 ? 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' : 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' },
      { x: 0, clipPath: 'polygon(0% 0%, 115% 0%, 100% 100%, -15% 100%)', duration: 0.8, delay: 0.15, ease: 'expo.out', overwrite: 'auto', onComplete: () => gsap.set(cards[i], { clipPath: 'none' }) });
    gsap.fromTo([num.parentElement, kanji], { yPercent: 30 * dir, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
    if (dir > 0 && i > 0) {
      const cc = stages[i].classChange;
      burstTxt.textContent = cc ? 'Class change!' : 'Level up!';
      burstSub.textContent = cc || `LV. ${String(i + 1).padStart(2, '0')} · ${stages[i].company.replace(/ Pvt\. Ltd\./, '')}`;
      gsap.timeline({ overwrite: 'auto' })
        .fromTo(burst, { autoAlpha: 0, scale: 1.6, skewX: -14 }, { autoAlpha: 1, scale: 1, skewX: -8, duration: 0.45, ease: 'back.out(2)' })
        .fromTo('.lvl__rays', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expo.out' }, 0)
        .to([burst, '.lvl__rays'], { autoAlpha: 0, scale: 1.08, duration: 0.5, ease: 'power2.in' }, 1.1);
    }
  };
  go(0, false);

  if (reduce) { $('#lvl').classList.add('is-static'); return; }
  const st = ScrollTrigger.create({
    trigger: '#lvl', start: 'top top', end: () => `+=${(mobile ? 650 : 800) * n}`, pin: true, invalidateOnRefresh: true,
    onUpdate: (self) => {
      $('#lvl').style.setProperty('--p', self.progress);
      go(Math.min(n - 1, Math.floor(self.progress * n * 0.999 + 0.0001)));
    },
  });
  trackBtns.forEach((b) => b.addEventListener('click', () => scrollTo(st.start + ((+b.dataset.i + 0.5) / n) * (st.end - st.start))));
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
  $$('a[href^="#"]:not(.menu__item):not([data-scroll-open])').forEach((a) => a.addEventListener('click', (e) => {
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

  // Cursor: a tiny crimson diamond with the SV seal as a hairline frame trailing it.
  // Over anything clickable the frame draws itself into a single stroke, 一.
  const cursor = $('#cursor'), label = $('#cursor-label');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    document.documentElement.classList.add('has-cursor');
    const dot = cursor.querySelector('.cursor__dot'), frame = cursor.querySelector('.cursor__frame');
    const pos = { x: -100, y: -100 }, cur = { x: -100, y: -100 };
    const labels = [['.spot', 'View'], ['.move-pill', 'Pick'], ['.ladder', 'Switch'], ['.footer__cta, .hero__ctas .pill--red, a[href^="mailto"]', 'Say hi'], ['a[download]', 'Save'], ['a[target="_blank"]', 'Open'], ['[data-cursor]', '']];
    const lightSel = '.duality__sticky:not(.is-b), .footer__card';
    window.addEventListener('pointermove', (e) => {
      pos.x = e.clientX; pos.y = e.clientY; cursor.style.opacity = 1;
      dot.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => (cursor.style.opacity = 0));
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (t.closest('input, textarea, select')) { cursor.classList.add('is-text'); return; }
      cursor.classList.remove('is-text');
      const hit = t.closest('a, button, label, [role="button"], .spot, .ladder, [data-cursor]');
      cursor.classList.toggle('is-hover', !!hit);
      let text = '';
      if (hit) { const m = labels.find(([sel]) => hit.matches(sel)); text = hit.dataset.cursor || (m ? m[1] : ''); }
      label.textContent = text;
      cursor.classList.toggle('has-label', !!text);
      cursor.classList.toggle('is-light', !!t.closest(lightSel));
    });
    gsap.ticker.add(() => {
      cur.x += (pos.x - cur.x) * 0.22; cur.y += (pos.y - cur.y) * 0.22;
      frame.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    });
  }

  // Konami reward: pixel "deal with it" shades drop down the screen
  const dealWithIt = () => {
    if (document.querySelector('.shades')) return;
    const px = [
      '1111111111111111111111',
      '1111111111111111111111',
      '0111111110001111111100',
      '0110011110001100111100',
      '0011001100000110011000',
      '0001111000000011110000',
    ];
    const cell = Math.max(6, Math.min(16, Math.round(window.innerWidth / 70)));
    const rects = px.flatMap((row, y) => [...row].map((c, x) => (c === '1' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''))).join('');
    const el = document.createElement('div');
    el.className = 'shades';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<svg viewBox="0 0 22 6" width="${22 * cell}" height="${6 * cell}" shape-rendering="crispEdges"><g fill="#060608">${rects}</g><g fill="#fff" opacity=".8"><rect x="3" y="3" width="1" height="1"/><rect x="14" y="3" width="1" height="1"/></g></svg><span>Deal with it.</span>`;
    document.body.appendChild(el);
    gsap.timeline({ onComplete: () => el.remove() })
      .fromTo(el, { y: -window.innerHeight * 0.6, rotation: -8 }, { y: 0, rotation: 0, duration: 1.1, ease: 'steps(12)' })
      .fromTo(el.querySelector('span'), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(3)' })
      .to(el, { y: window.innerHeight, rotation: 12, duration: 0.7, ease: 'power2.in' }, '+=1.6');
  };

  // Toast helper
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('is-on'), 3200); };

  // Konami code: standing ovation
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let k = 0;
  document.addEventListener('keydown', (e) => {
    k = e.key === code[k] || e.key.toLowerCase() === code[k] ? k + 1 : 0;
    if (k === code.length) {
      k = 0;
      toast('Deal with it. 6,200 → 1. You found the secret.');
      dealWithIt();
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

/* ---------------- Tick ladders for the Two sides section ---------------- */
const LADDER_BARS = 36;
let ladderBars = null;
function updateLadders(st) {
  if (!ladderBars) {
    ladderBars = $$('[data-ladder]').map((el) => {
      el.innerHTML = '<i></i>'.repeat(LADDER_BARS);
      return [...el.children];
    });
  }
  const centre = Math.max(0.12, Math.min(0.88, 0.25 + st.curve * 0.5 - st.mouse.y * 0.07)) * (LADDER_BARS - 1);
  ladderBars.forEach((bars) => bars.forEach((b, i) => {
    const d = Math.abs(i - centre);
    b.style.width = `${d <= 1.5 ? 26 : d <= 2.5 ? 22 : d <= 3.5 ? 18 : 14}px`;
  }));
}

boot();

// backend features (AI clone, contact, live counters) boot on their own, independent of WebGL
initServices();
