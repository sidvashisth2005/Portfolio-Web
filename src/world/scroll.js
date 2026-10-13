// 巻物 · Send a scroll, in the 3D world: the same contact form as the full site (same fields, same checks, the same
// api/contact backend, the same email fallback when the backend is off), in a dialog over the world. "Hire me"
// opens it; without JavaScript those links stay plain mailto links.
import { profile } from '../data.js';

const html = `
  <div class="wdlg" id="w-scroll" role="dialog" aria-modal="true" aria-labelledby="w-scroll-title" hidden>
    <div class="wdlg__scrim" data-close></div>
    <div class="wdlg__box" data-lenis-prevent>
      <button class="wdlg__x" type="button" data-close aria-label="Close">✕</button>
      <form class="wdlg__form" id="w-scroll-form" novalidate>
        <p class="label label--red">巻物 · Send a scroll</p>
        <h2 class="wdlg__title" id="w-scroll-title">Start the <span>next arc</span></h2>
        <div class="wdlg__row">
          <div class="wfield"><label for="wf-name">Name</label><input id="wf-name" name="name" required maxlength="80" autocomplete="name" /><small class="wfield__err" id="we-name"></small></div>
          <div class="wfield"><label for="wf-email">Email</label><input id="wf-email" name="email" type="email" required maxlength="120" autocomplete="email" /><small class="wfield__err" id="we-email"></small></div>
        </div>
        <div class="wfield"><label for="wf-company">Company <span class="muted">(optional)</span></label><input id="wf-company" name="company" maxlength="100" autocomplete="organization" /></div>
        <fieldset class="wintent">
          <legend>What’s this about?</legend>
          ${[['Full-time role', 'Full-time role'], ['Internship', 'Internship'], ['Collab / project', 'Collab'], ['Speaking / podcast', 'Podcast'], ['Just saying hi', 'Just hi']]
            .map(([v, t], i) => `<label><input type="radio" name="intent" value="${v}"${i ? '' : ' checked'} /><span>${t}</span></label>`).join('')}
        </fieldset>
        <div class="wfield"><label for="wf-msg">Message</label><textarea id="wf-msg" name="message" rows="5" required maxlength="3000" placeholder="The role, the team, the timeline. Or just say hi."></textarea><small class="wfield__err" id="we-message"></small></div>
        <div class="whp" aria-hidden="true"><label for="wf-web">Website</label><input id="wf-web" name="website" tabindex="-1" autocomplete="off" /></div>
        <div class="wdlg__foot">
          <button class="w-pill w-pill--red w-pill--lg" type="submit" id="w-scroll-send">Send scroll ↗</button>
          <p class="wdlg__alt muted">or email <a href="mailto:${profile.email}">${profile.email}</a></p>
        </div>
        <p class="wdlg__status" id="w-scroll-status" role="status" aria-live="polite"></p>
      </form>
      <div class="wdlg__done" id="w-scroll-done" hidden>
        <span class="wstamp" aria-hidden="true">送</span>
        <h3>Scroll delivered.</h3>
        <p>It’s in my inbox. I’ll get back to you soon.</p>
        <button class="w-pill w-pill--lg" type="button" data-close>Back to the village</button>
      </div>
    </div>
  </div>`;

export function initScroll({ lenis } = {}) {
  document.body.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById('w-scroll'), form = document.getElementById('w-scroll-form');
  const status = document.getElementById('w-scroll-status'), send = document.getElementById('w-scroll-send'), done = document.getElementById('w-scroll-done');
  let live = false, openedAt = 0, opener = null;
  // the backend decides whether the scroll is sent from here or handed to the visitor's email app
  fetch('api/health', { cache: 'no-store' })
    .then((r) => ((r.headers.get('content-type') || '').includes('application/json') ? r.json() : null))
    .then((j) => { const s = j?.services; live = !!(s && (s.mail || s.redis)); })
    .catch(() => {});

  const focusables = () => [...el.querySelectorAll('a[href], button:not([disabled]), input:not([tabindex="-1"]), textarea')].filter((n) => n.offsetParent !== null);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      const f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  function open() {
    if (!el.hidden) return;
    opener = document.activeElement;
    form.hidden = false; done.hidden = true; status.textContent = '';
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    lenis?.stop();
    document.addEventListener('keydown', onKey, true);
    openedAt = performance.now();
    setTimeout(() => document.getElementById('wf-name').focus(), 60);
  }
  function close() {
    if (el.hidden) return;
    el.classList.remove('is-open');
    document.removeEventListener('keydown', onKey, true);
    setTimeout(() => { el.hidden = true; lenis?.start(); opener?.focus?.({ preventScroll: true }); }, 320);
  }
  el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.querySelectorAll('[data-scroll-open]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); open(); }));

  const mailto = (d) => `mailto:${profile.email}?subject=${encodeURIComponent(`[Portfolio · ${d.intent}] ${d.name}`)}&body=${encodeURIComponent(`${d.message}\n\n${d.name}${d.company ? ` · ${d.company}` : ''}\n${d.email}`)}`;
  const setErr = (k, msg) => {
    const e = document.getElementById(`we-${k}`);
    if (e) e.textContent = msg || '';
    const f = form[k];
    if (f) { f.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) f.setAttribute('aria-describedby', `we-${k}`); }
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
      const res = await fetch('api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      const r = (res.headers.get('content-type') || '').includes('application/json') ? await res.json() : null;
      if (res.status === 422 && r?.errors) { Object.entries(r.errors).forEach(([k, v]) => setErr(k, v)); throw Object.assign(new Error(''), { quiet: true }); }
      if (res.status === 429) throw new Error('That’s a lot of scrolls. Try again in a while, or email me directly.');
      if (!res.ok || !r?.ok) throw new Error('fallback');
      form.reset();
      form.hidden = true; done.hidden = false;
      done.querySelector('button').focus();
    } catch (err) {
      if (err.quiet) { /* the field errors are shown */ }
      else if (err.message === 'fallback') { status.textContent = 'The courier is out. Opening your email app instead…'; window.location.href = mailto(d); }
      else status.textContent = err.message;
    } finally {
      send.disabled = false; send.textContent = 'Send scroll ↗';
    }
  });
  return { open, close };
}
