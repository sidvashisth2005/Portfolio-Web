// Everything that talks to the backend in api/. Each feature checks /api/health first and either
// lights up, falls back to something useful offline, or stays hidden. Nothing here can break the page.
import gsap from 'gsap';
import { profile } from '../data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get: (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const isJson = (r) => (r.headers.get('content-type') || '').includes('application/json');
const post = (path, data, opts = {}) => fetch(`api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), ...opts });

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('is-on'), 3600);
}

/* ---------- dialogs: focus trap, Escape, scroll lock ---------- */
const openDialogs = [];
function dialog(el) {
  let opener = null;
  const focusables = () => $$('a[href], button:not([disabled]), input:not([tabindex="-1"]), textarea, [tabindex="0"]', el).filter((n) => n.offsetParent !== null);
  const onKey = (e) => {
    if (openDialogs[openDialogs.length - 1] !== api) return;
    if (e.key === 'Escape') { e.preventDefault(); api.close(); }
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  const api = {
    get isOpen() { return !el.hidden; },
    open(focusSel) {
      if (!el.hidden) return;
      opener = document.activeElement;
      el.hidden = false;
      openDialogs.push(api);
      window.lenis?.stop();
      document.documentElement.classList.add('dlg-open');
      document.addEventListener('keydown', onKey);
      if (!reduce) {
        gsap.fromTo($('.dlg__scrim', el), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 });
        gsap.fromTo($('.dlg__box', el), { y: 40, autoAlpha: 0, clipPath: 'inset(0 0 100% 0 round 22px)' }, { y: 0, autoAlpha: 1, clipPath: 'inset(0 0 0% 0 round 22px)', duration: 0.7, ease: 'expo.out' });
      }
      requestAnimationFrame(() => (focusSel ? $(focusSel, el) : focusables()[0])?.focus());
    },
    close() {
      if (el.hidden) return;
      const done = () => {
        el.hidden = true;
        openDialogs.splice(openDialogs.indexOf(api), 1);
        if (!openDialogs.length) { window.lenis?.start(); document.documentElement.classList.remove('dlg-open'); }
        document.removeEventListener('keydown', onKey);
        opener?.focus?.({ preventScroll: true });
      };
      if (reduce) return done();
      gsap.to($('.dlg__box', el), { y: 24, autoAlpha: 0, duration: 0.3, ease: 'power2.in' });
      gsap.to($('.dlg__scrim', el), { autoAlpha: 0, duration: 0.3, onComplete: done });
    },
  };
  $$('[data-close]', el).forEach((b) => b.addEventListener('click', () => api.close()));
  return api;
}

/* ---------- 影分身 · shadow clone ---------- */
// Offline answers so the clone still helps when the AI isn't switched on (or on a static preview).
const scripted = [
  [/hack|nitr|win|rank|trophy|6,?200|compet/i, 'HackNITR 7.0 is the big one: Rank 1 out of 6,200+ participants from 20+ countries, and I was the sole presenter, pitching commercialisation, competitive analysis and ROI to a global jury. Same project took 1st Runner-up at HACKSAGON 2025, and I won the University Ideathon 2024 against 30+ teams.'],
  [/intern|experience|work|job|trustique|codesoft|skill ?dzire|team lead|research|iiit|jabalpur|adversarial/i, 'Four internships. Most recent: research intern at IIITDM Jabalpur (May–Jul 2026), where I built STDA, an adversarial defense for a 5G intrusion detector that took attack success from 100% to 0.00% at 99.94% F1, ranked #1 of 19 baselines. Before that, Team Lead at Trustique (3 teams of 15–18, 100% on-time, +30% users), +15% ML accuracy at Skill Dzire, and 20% faster code reviews at Codesoft.'],
  [/project|build|livestock|iot|around|\bar\b|travel|superstore|product/i, 'Four special moves: a Livestock Monitoring System (IoT + AI, ~65% cheaper per head), ARound You (geo-tagged AR memories with ARCore), TravelGo (AI trip planning across 4 APIs) and a superstore consultancy that lifted footfall 25%+. Scroll to Special moves to see each one.'],
  [/hire|why|fit|role|strength|value/i, 'I sit where strategy meets building: I can research a market, build the thing, and then pitch it to a jury of strangers and win. Rank 1 of 6,200+, a promotion to Team Lead in one internship, and real client results. Open to BD, business analyst, growth and product roles from Q4 2026.'],
  [/skill|tech|stack|tool|python|flutter|sql|excel|\bml\b|machine learning|c\+\+/i, 'Languages: Python, C++, Dart (Flutter), MySQL, Firebase. ML: adversarial ML, scikit-learn, XGBoost, feature engineering, NumPy, Pandas. Tools: Flutter, ARCore, REST APIs, Git, Android Studio, IoT, GCP. On the business side: BD, market research, ROI analysis and go-to-market.'],
  [/study|college|universit|degree|juet|cgpa|graduat|educat|school/i, 'Final-year B.Tech in Computer Science at JUET Guna (2023–2027, CGPA 7.5). Before that, Jay Jyoti School in Guna for Class X and XII (CBSE).'],
  [/contact|email|reach|call|linkedin|talk to/i, `Best way: send me a scroll from this site, or email ${profile.email}. I’m also on LinkedIn.`],
  [/lead|club|organi|tachyon|vrarmr|code srijan|advisor/i, 'I’m now Advisor to the VRARMR Club (100+ members, AR/VR/MR) after serving as its Joint Secretary, where I screened 50+ candidates. I co-organised Code Srijan, JUET’s coding contest, leading sponsorship, and organised TACHYON 2025 for 2,000+ attendees. I’ve also been sole pitcher on 6+ hackathon stages.'],
  [/podcast|on air|episode/i, 'On Air is my podcast: what BD actually means in a startup, pitching to judges who’ve seen it all, building a team at 19, and the research → product → pitch pipeline.'],
  [/where|location|relocat|remote|based/i, 'I’m based in Guna, Madhya Pradesh, and happy to relocate or work remote.'],
  [/\b(hi|hello|hey|yo|namaste)\b/i, 'Hey! I’m Siddhant’s shadow clone. Ask me about the HackNITR win, my internships, projects, or why I’d fit your team.'],
];
const scriptedReply = (q) => (scripted.find(([re]) => re.test(q)) || [null, 'Good question for the real me. Send me a scroll from this site, or ask about my wins, internships, projects or skills.'])[1];

const CHIPS = ['Why should we hire you?', 'Tell me about HackNITR', 'What did you do at Trustique?', 'What are you building?'];

function linkify(text) {
  const frag = document.createDocumentFragment();
  const re = /([\w.+-]+@[\w-]+\.[\w.]+)|(https?:\/\/[^\s)]+)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    frag.append(text.slice(last, m.index));
    const a = document.createElement('a');
    a.href = m[1] ? `mailto:${m[1]}` : m[2];
    if (m[2]) { a.target = '_blank'; a.rel = 'noopener'; }
    a.textContent = m[0];
    frag.append(a);
    last = re.lastIndex;
  }
  frag.append(text.slice(last));
  return frag;
}

function initClone(services, scroll) {
  const dlg = dialog($('#clone'));
  const log = $('#clone-log'), chips = $('#clone-chips'), form = $('#clone-form'), input = $('#clone-input');
  const live = !!services?.ai;
  let history = store.get('clone') || [];
  let busy = false;

  if (!live) $('#clone-note').textContent = 'Offline mode: scripted answers from this site. The real me answers scrolls.';
  // without an AI key on a real deploy, the scouter can't work, so it isn't offered
  if (services && !services.ai) $('#tab-scout').hidden = true;

  const bubble = (role, text = '') => {
    const el = document.createElement('div');
    el.className = `msg msg--${role}`;
    if (role === 'clone') el.innerHTML = '<span class="msg__tag">Siddhant · 影</span>';
    const p = document.createElement('p');
    p.append(linkify(text));
    el.append(p);
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return p;
  };
  const renderChips = () => {
    chips.innerHTML = '';
    const list = history.length > 3 ? ['Send the real me a scroll'] : CHIPS.filter((c) => !history.some((h) => h.content.toLowerCase().replace(/\W/g, '') === c.toLowerCase().replace(/\W/g, '')));
    list.slice(0, 3).forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c;
      b.addEventListener('click', () => (c.startsWith('Send') ? (dlg.close(), setTimeout(() => scroll.open(), 350)) : ask(c)));
      chips.append(b);
    });
  };
  const greet = () => {
    if (history.length) history.forEach((m) => bubble(m.role === 'user' ? 'you' : 'clone', m.content));
    else bubble('clone', 'Yo. I’m Siddhant’s shadow clone. Same brain, trained only on this site. Ask me anything about my work, or open the Scouter and paste a job description.');
    renderChips();
  };

  async function typeOut(p, text) {
    if (reduce) { p.textContent = ''; p.append(linkify(text)); return; }
    p.classList.add('is-typing');
    for (let i = 0; i <= text.length; i += 2) {
      p.textContent = text.slice(0, i);
      log.scrollTop = log.scrollHeight;
      await new Promise((r) => setTimeout(r, 12));
    }
    p.textContent = '';
    p.append(linkify(text));
    p.classList.remove('is-typing');
  }

  async function ask(q) {
    q = q.trim().slice(0, 600);
    if (!q || busy) return;
    busy = true;
    form.classList.add('is-busy');
    bubble('you', q);
    history.push({ role: 'user', content: q });
    chips.innerHTML = '';
    const p = bubble('clone', '');
    p.classList.add('is-typing');
    let answer = '';
    try {
      if (!live) throw new Error('offline');
      const res = await post('clone', { messages: history.slice(-12) });
      if (res.status === 429) answer = 'Easy, my chakra needs a minute. Try again shortly, or send the real me a scroll.';
      else if (!res.ok || !res.body) throw new Error(`clone ${res.status}`);
      else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          answer += dec.decode(value, { stream: true });
          p.textContent = answer;
          log.scrollTop = log.scrollHeight;
        }
        p.textContent = '';
        p.append(linkify(answer));
        p.classList.remove('is-typing');
      }
    } catch {
      answer = scriptedReply(q);
      await typeOut(p, answer);
    }
    if (!answer.trim()) { answer = scriptedReply(q); await typeOut(p, answer); }
    p.classList.remove('is-typing');
    history.push({ role: 'assistant', content: answer });
    history = history.slice(-16);
    store.set('clone', history);
    busy = false;
    form.classList.remove('is-busy');
    renderChips();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); });

  // tabs
  const tabs = $$('.clone__tabs [role="tab"]');
  const select = (name) => {
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $(`#${t.getAttribute('aria-controls')}`).hidden = !on;
    });
    (name === 'talk' ? input : $('#scout-jd')).focus();
  };
  tabs.forEach((t) => {
    t.addEventListener('click', () => select(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const vis = tabs.filter((x) => !x.hidden);
      const next = vis[(vis.indexOf(t) + (e.key === 'ArrowRight' ? 1 : vis.length - 1)) % vis.length];
      select(next.dataset.tab); next.focus();
    });
  });

  initScouter(live, scroll, dlg);

  let greeted = false;
  $('#clone-fab').addEventListener('click', () => {
    dlg.open('#clone-input');
    if (!greeted) { greeted = true; greet(); }
  });
}

/* ---------- スカウター · scouter ---------- */
function initScouter(live, scroll, cloneDlg) {
  const form = $('#scout-form'), out = $('#scout-out'), btn = $('#scout-btn'), jd = $('#scout-jd');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = jd.value.trim();
    out.hidden = false;
    if (text.length < 60) { out.innerHTML = '<p class="scout__msg">Paste a bit more of the role: responsibilities and requirements work best.</p>'; return; }
    if (!live) { out.innerHTML = '<p class="scout__msg">The scouter runs on the live site once its AI is switched on. Meanwhile, send me the role as a scroll and I’ll read it myself.</p>'; return; }
    btn.disabled = true;
    btn.textContent = 'Reading power level…';
    out.innerHTML = '<div class="scout__scan" aria-hidden="true"><i></i></div><p class="scout__msg">Scanning…</p>';
    try {
      const res = await post('scout', { jd: text });
      const r = isJson(res) ? await res.json() : null;
      if (res.status === 429) throw new Error('The scouter overheated. Give it a few minutes.');
      if (!res.ok || !r?.ok) throw new Error('The scouter glitched. Try again, or send me the role as a scroll.');
      const level = r.power * 100;
      out.innerHTML = `
        <div class="scout__head">
          <div class="scout__meter" style="--p:0"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" /><circle class="arc" cx="60" cy="60" r="52" pathLength="100" /></svg>
            <div><b id="scout-num">0</b><span>Power level</span></div></div>
          <div class="scout__sum"><p class="label label--red">${esc(r.role)} · ${r.power}% fit</p><p class="scout__verdict">${esc(r.verdict)}</p>${level > 9000 ? '<p class="scout__over">It’s over 9000!</p>' : ''}</div>
        </div>
        ${r.matches.length ? `<h4>Why it fits</h4><ul class="scout__list">${r.matches.map((m) => `<li><b>${esc(m.need)}</b><span>${esc(m.proof)}</span></li>`).join('')}</ul>` : ''}
        ${r.gaps.length ? `<h4>Honest gaps</h4><ul class="scout__list scout__list--gap">${r.gaps.map((g) => `<li><span>${esc(g)}</span></li>`).join('')}</ul>` : ''}
        <h4>My pitch</h4><blockquote class="scout__pitch">${esc(r.pitch)}</blockquote>
        <div class="scout__actions"><button class="pill pill--red" type="button" id="scout-send">Send this role to me ↗</button><button class="pill pill--ghost" type="button" id="scout-copy">Copy pitch</button></div>`;
      const meter = $('.scout__meter', out), num = $('#scout-num', out);
      const o = { v: 0 };
      gsap.to(o, { v: level, duration: reduce ? 0 : 1.6, ease: 'expo.out', onUpdate: () => { num.textContent = Math.round(o.v).toLocaleString('en-IN'); meter.style.setProperty('--p', o.v / 100); } });
      $('#scout-copy', out).addEventListener('click', async () => { try { await navigator.clipboard.writeText(r.pitch); toast('Pitch copied.'); } catch { toast('Select the pitch to copy it.'); } });
      $('#scout-send', out).addEventListener('click', () => {
        cloneDlg.close();
        setTimeout(() => scroll.open({ intent: 'Full-time role', message: `Role: ${r.role}\nScouter reading: ${r.power}% fit\n\n${text.slice(0, 1500)}` }), 350);
      });
    } catch (err) {
      out.innerHTML = `<p class="scout__msg">${esc(err.message)}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Scan the role ⟶';
    }
  });
}

/* ---------- 巻物 · send a scroll ---------- */
function initScroll(services) {
  const el = $('#scroll');
  const dlg = dialog(el);
  const form = $('#scroll-form'), status = $('#scroll-status'), send = $('#scroll-send'), done = $('#scroll-done');
  let openedAt = 0;
  const live = !!(services && (services.mail || services.redis));

  const open = (prefill = {}) => {
    form.hidden = false; done.hidden = true; status.textContent = '';
    if (prefill.intent) { const r = $(`input[name="intent"][value="${prefill.intent}"]`, form); if (r) r.checked = true; }
    if (prefill.message) form.message.value = prefill.message;
    openedAt = performance.now();
    dlg.open('#f-name');
  };
  $$('[data-scroll-open]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(); }));

  const mailto = (d) => `mailto:${profile.email}?subject=${encodeURIComponent(`[Portfolio · ${d.intent}] ${d.name}`)}&body=${encodeURIComponent(`${d.message}\n\n${d.name}${d.company ? ` · ${d.company}` : ''}\n${d.email}`)}`;
  const setErr = (k, msg) => {
    const e = $(`#e-${k}`);
    if (e) e.textContent = msg || '';
    const f = form[k];
    if (f) f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (f && msg) f.setAttribute('aria-describedby', `e-${k}`);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    d.t = Math.round(performance.now() - openedAt);
    ['name', 'email', 'message'].forEach((k) => setErr(k));
    const errs = {};
    if ((d.name || '').trim().length < 2) errs.name = 'Tell me your name';
    if (!/^\S+@\S+\.\S{2,}$/.test((d.email || '').trim())) errs.email = 'That email looks off';
    if ((d.message || '').trim().length < 10) errs.message = 'A little more, please';
    if (Object.keys(errs).length) { Object.entries(errs).forEach(([k, v]) => setErr(k, v)); form[Object.keys(errs)[0]].focus(); return; }

    if (!live) { status.textContent = 'Opening your email app…'; window.location.href = mailto(d); return; }
    send.disabled = true; send.textContent = 'Sending…'; status.textContent = '';
    try {
      const res = await post('contact', d);
      const r = isJson(res) ? await res.json() : null;
      if (res.status === 422 && r?.errors) { Object.entries(r.errors).forEach(([k, v]) => setErr(k, v)); throw Object.assign(new Error(''), { quiet: true }); }
      if (res.status === 429) throw new Error('That’s a lot of scrolls. Try again in a while, or email me directly.');
      if (!res.ok || !r?.ok) throw new Error('fallback');
      form.reset();
      form.hidden = true; done.hidden = false;
      if (!reduce) gsap.fromTo($('.stamp', done), { scale: 2.4, rotation: -30, autoAlpha: 0 }, { scale: 1, rotation: -8, autoAlpha: 1, duration: 0.6, ease: 'back.out(2.2)' });
      $('button', done).focus();
    } catch (err) {
      if (err.quiet) { /* field errors shown */ }
      else if (err.message === 'fallback') { status.textContent = 'The courier is out. Opening your email app instead…'; window.location.href = mailto(d); }
      else status.textContent = err.message;
    } finally {
      send.disabled = false; send.textContent = 'Send scroll ↗';
    }
  });
  return { open, close: dlg.close };
}

/* ---------- 戦闘力 · power level ---------- */
function initPower(services) {
  if (!services?.redis) return;
  const box = $('#power'), num = $('#power-num'), liveEl = $('#power-live'), kiaiNum = $('#kiai-num'), over = $('#power-over');
  let sid = store.get('sid');
  if (!sid) { sid = (crypto.randomUUID?.() || String(Math.random()).slice(2)); store.set('sid', sid); }
  const shown = { v: 0 };
  const paint = (c) => {
    if (!c?.ok) return;
    box.hidden = false;
    gsap.to(shown, { v: c.visits, duration: reduce ? 0 : 1.4, ease: 'expo.out', onUpdate: () => (num.textContent = Math.round(shown.v).toLocaleString('en-IN')) });
    liveEl.textContent = c.live;
    kiaiNum.textContent = c.kiai ? `${c.kiai.toLocaleString('en-IN')} ki` : '';
    over.hidden = c.visits <= 9000;
  };
  const call = (action) => post('power', { action, sid }).then((r) => (isJson(r) ? r.json() : null)).catch(() => null);
  call(store.get('visited') ? 'ping' : 'visit').then((c) => { store.set('visited', true); paint(c); });
  setInterval(() => { if (document.visibilityState === 'visible') call('ping').then(paint); }, 45000);
  window.addEventListener('pagehide', () => post('power', { action: 'leave', sid }, { keepalive: true }).catch(() => {}));

  // hold to charge ki: a ring fills, then a burst
  const btn = $('#kiai');
  let tween = null;
  const fire = async () => {
    btn.classList.add('is-fired');
    setTimeout(() => btn.classList.remove('is-fired'), 700);
    if (!reduce) {
      gsap.fromTo('.footer__card', { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' });
      burst(btn);
    }
    const c = await call('kiai');
    if (c?.error === 'ki exhausted') toast('Your ki is exhausted. Rest a minute.');
    else if (c) { paint(c); toast(`Ki received · ${c.kiai.toLocaleString('en-IN')} charged by visitors so far`); }
  };
  const start = (e) => {
    if (e.button > 0) return;
    btn.setPointerCapture?.(e.pointerId);
    tween?.kill();
    tween = gsap.fromTo(btn, { '--charge': 0 }, { '--charge': 1, duration: reduce ? 0.01 : 0.9, ease: 'power1.in', onComplete: () => { tween = null; fire(); gsap.to(btn, { '--charge': 0, duration: 0.4, delay: 0.2 }); } });
  };
  const cancel = () => { if (tween) { tween.kill(); tween = null; gsap.to(btn, { '--charge': 0, duration: 0.3 }); } };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointercancel', cancel);
  btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); fire(); } });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());

  // count résumé pulls
  $$('a[href$="resume.pdf"]').forEach((a) => a.addEventListener('click', () => post('power', { action: 'resume', sid }, { keepalive: true }).catch(() => {})));
}

function burst(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span');
    s.className = 'ki-spark';
    s.style.left = `${r.left + r.width / 2}px`;
    s.style.top = `${r.top + r.height / 2}px`;
    document.body.append(s);
    const a = (i / 18) * Math.PI * 2, d = 50 + Math.random() * 60;
    gsap.to(s, { x: Math.cos(a) * d, y: Math.sin(a) * d, rotation: (a * 180) / Math.PI, autoAlpha: 0, duration: 0.7 + Math.random() * 0.3, ease: 'expo.out', onComplete: () => s.remove() });
  }
}

/* ---------- 修行中 · live from GitHub ---------- */
async function initGithub() {
  try {
    const res = await fetch('api/github');
    if (!res.ok || !isJson(res)) return;
    const g = await res.json();
    if (!g.ok || !g.repos?.length) return;
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const ago = (iso) => {
      const s = (new Date(iso) - Date.now()) / 1000;
      for (const [u, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
      return 'just now';
    };
    const list = $('#ghfeed-list');
    g.repos.forEach((r) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = '<b></b><span class="ghfeed__desc"></span><span class="ghfeed__meta"></span>';
      $('b', a).textContent = r.name.replace(/[-_]/g, ' ');
      $('.ghfeed__desc', a).textContent = r.description;
      $('.ghfeed__meta', a).textContent = [r.language, r.stars ? `★ ${r.stars}` : '', `pushed ${ago(r.pushedAt)}`].filter(Boolean).join(' · ');
      li.append(a);
      list.append(li);
    });
    $('#ghfeed-all').textContent = `All ${g.publicRepos} repos ↗`;
    $('#ghfeed').hidden = false;
  } catch { /* stays hidden */ }
}

/* ---------- boot ---------- */
export async function initServices() {
  let services = null;
  try {
    const res = await fetch('api/health', { cache: 'no-store' });
    if (res.ok && isJson(res)) services = (await res.json()).services;
  } catch { /* static host: no backend */ }

  const scroll = initScroll(services);
  initClone(services, scroll);
  initPower(services);
  if (services) initGithub();

  // Vercel Web Analytics + Speed Insights, only on a real deploy
  if (services && import.meta.env.PROD && !/^(localhost|127\.)/.test(location.hostname)) {
    import('@vercel/analytics').then((m) => m.inject()).catch(() => {});
    import('@vercel/speed-insights').then((m) => m.injectSpeedInsights()).catch(() => {});
  }
}
