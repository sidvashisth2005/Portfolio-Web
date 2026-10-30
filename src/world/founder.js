// 書斎 · The strategist's study: Siddhant's own room, up in the headquarters. The same tatami room as the houses in
// the residents' quarter (room.js), but his: his ink portrait on the alcove scroll, and on the shelves the real
// things from the arc (every word from src/data.js, nothing invented), each one opening its story. Beside it, his
// character sheet, his shadow clone to talk to (api/clone, or the scripted answers when the AI is off) and what he
// pushed to GitHub lately (api/github).
import { profile, moves, dojos, awards, episodes, statNames } from '../data.js';
import { scriptedReply } from '../clone-script.js';
import { KINDS } from '../registry.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LEDE = 'Business strategist and builder. I turn raw market signal into products and pitches across AgriTech, AR and AI.';
const [lms, ary, tgo, sup] = moves;
const [research, lead] = dojos;
const move = (m, kind) => ({ id: m.id, kind, title: m.title, label: `${m.category}${m.award ? ` · ${m.award}` : ''}`, big: m.big, bigLabel: m.bigLabel, text: m.bullets.join('\n\n'), tags: m.tags, url: m.github });
// the shelves, in the order they fill (room.js): the alcove first, so the trophy and the signature build are what
// you see as you come in
export const THINGS = [
  { id: 'hacknitr', kind: 'cup', title: awards[0].title, label: awards[0].scope, big: '#1', bigLabel: 'of 6,200+ participants from 20+ countries', text: awards[0].desc },
  move(lms, 'blade'),
  { id: 'stda', kind: 'scroll', title: 'STDA · an adversarial defense', label: `${research.role} · ${research.name} · ${research.period}`, big: research.metric, bigLabel: research.metricLabel, text: research.brief.join('\n\n'), tags: ['Python', 'scikit-learn', 'XGBoost', 'Adversarial ML'] },
  { id: 'paper', kind: 'book', title: awards[4].title, label: awards[4].scope, text: awards[4].desc },
  move(ary, 'blade'),
  move(tgo, 'blade'),
  { id: 'hacksagon', kind: 'cup', title: awards[1].title, label: awards[1].scope, text: awards[1].desc },
  move(sup, 'box'),
  { id: 'onair', kind: 'lantern', title: 'On Air · the podcast', label: 'Podcast', text: episodes.map((e) => `${e.ep} · ${e.title}`).join('\n') },
  { id: 'resume', kind: 'letter', title: 'My résumé', label: 'PDF', text: 'Education, four internships, the projects and the awards, in one file.', url: 'resume.pdf' },
  { id: 'trustique', kind: 'plant', title: 'Team Lead at Trustique', label: `${lead.role} · ${lead.period}`, big: lead.metric, bigLabel: lead.metricLabel, text: lead.brief.join('\n\n') },
  { id: 'github', kind: 'tag', title: 'GitHub', label: 'Code', text: 'Where the builds live.', url: profile.github },
];
export const STUDY = { name: profile.name, crest: '閃', color: 1, motto: LEDE, founder: true };

const CHIPS = ['Why should we hire you?', 'Tell me about HackNITR', 'What did you research at IIITDM?', 'How did you lead teams at 19?'];
const ago = (iso) => {
  const d = (Date.now() - new Date(iso)) / 86400000;
  return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 30 ? `${Math.floor(d)} days ago` : d < 365 ? `${Math.floor(d / 30)} months ago` : `${Math.floor(d / 365)}y ago`;
};

const html = `
  <aside class="whome wme" id="w-me" aria-labelledby="w-me-name" hidden data-lenis-prevent>
    <div class="whome__top">
      <button class="w-pill" type="button" data-me-out>← Back to the village</button>
      <p class="label muted">書斎 · The strategist’s study</p>
    </div>
    <header class="wme__card">
      <img class="wme__face" src="img/hero-cutout.webp" alt="" width="96" height="96" loading="lazy" />
      <div>
        <p class="label label--red" lang="ja">作る戦略家 · The strategist who builds</p>
        <h2 id="w-me-name">${esc(profile.name)}</h2>
        <p class="whome__motto">${esc(LEDE)}</p>
      </div>
    </header>
    <dl class="wme__facts">
      <div><dt>Class</dt><dd>Strategist · Builder · now ${esc(research.classChange.split('→').pop().trim())}</dd></div>
      <div><dt>Guild</dt><dd>B.Tech CSE · JUET Guna · class of 2027</dd></div>
      <div><dt>Origin</dt><dd>${esc(profile.location)}</dd></div>
      <div><dt>Signature</dt><dd>Rank 1 of 6,200+ at HackNITR 7.0, sole presenter</dd></div>
      <div><dt>Quest</dt><dd>Open to BD, business analyst, growth and product roles from Q4 2026. Happy to relocate or work remote.</dd></div>
    </dl>
    <div class="wme__abil" aria-label="Abilities, self-assessed after the latest stage">
      ${statNames.map((s) => `<div><span>${s.short}</span><i style="--v:${research.stats[s.key]}%"></i><b>${research.stats[s.key]}</b></div>`).join('')}
      <p class="muted">Self-assessed, after ${esc(research.name)}</p>
    </div>
    <div class="w-ctas wme__ctas">
      <button class="w-pill w-pill--red" type="button" data-me-hire>Hire me ↗</button>
      <a class="w-pill" href="resume.pdf" download>Résumé ↓</a>
      <a class="w-pill" href="${profile.linkedin}" target="_blank" rel="noopener">LinkedIn ↗</a>
      <a class="w-pill" href="${profile.github}" target="_blank" rel="noopener">GitHub ↗</a>
    </div>
    <div class="wme__tabs" role="tablist">
      <button type="button" role="tab" aria-selected="true" data-tab="things">On the shelves</button>
      <button type="button" role="tab" aria-selected="false" data-tab="ask">Ask me</button>
      <button type="button" role="tab" aria-selected="false" data-tab="now">On my desk now</button>
    </div>
    <section data-pane="things" class="witems">
      <p class="muted wme__hint">Everything here is real. Tap a thing on the shelves, or below, to open its story.</p>
      <ul>${THINGS.map((t) => `<li class="witem wme__thing" data-item="${t.id}" tabindex="0">
        <span class="witem__k" lang="ja" title="${esc(KINDS[t.kind][1])}">${KINDS[t.kind][0]}</span>
        <div><b>${esc(t.title)}</b><em class="wme__lab">${esc(t.label)}</em>
          <div class="wme__story">
            ${t.big ? `<p class="wme__big"><b>${esc(t.big)}</b> ${esc(t.bigLabel)}</p>` : ''}
            <p>${esc(t.text)}</p>
            ${t.tags?.length ? `<p class="wme__tags">${t.tags.map(esc).join(' · ')}</p>` : ''}
            ${t.url ? `<a class="witem__a" href="${esc(t.url)}" ${t.url.endsWith('.pdf') ? 'download' : 'target="_blank" rel="noopener"'}>${t.url.endsWith('.pdf') ? 'Download ↓' : `${esc(t.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 44))} ↗`}</a>` : ''}
          </div></div>
      </li>`).join('')}</ul>
    </section>
    <section data-pane="ask" class="wme__ask" hidden>
      <p class="muted wme__hint" id="w-me-note">My shadow clone: an AI that knows only what’s on this site. For anything else, the real me answers scrolls.</p>
      <div class="wme__log" id="w-me-log" aria-live="polite"></div>
      <div class="wme__chips">${CHIPS.map((c) => `<button type="button" class="w-chip" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <form class="wme__form" id="w-me-form"><input id="w-me-q" maxlength="500" autocomplete="off" placeholder="Ask about my work, a project, a role…" aria-label="Ask a question" /><button class="w-pill w-pill--red" type="submit">Ask</button></form>
    </section>
    <section data-pane="now" class="wme__now" hidden>
      <p class="muted wme__hint">The repositories I pushed to most recently, live from GitHub.</p>
      <ul id="w-me-repos"><li class="muted">Looking at my desk…</li></ul>
    </section>
  </aside>`;

export function initFounder({ hooks, scroll }) {
  document.body.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById('w-me'), log = document.getElementById('w-me-log');
  let inside = false, history = [], repos = null;

  async function enter() {
    if (inside) return;
    inside = true;
    await hooks.enter(STUDY, THINGS, ui);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    el.querySelector('[data-me-out]').focus({ preventScroll: true });
  }
  async function leave() {
    if (!inside) return;
    inside = false;
    el.classList.remove('is-open');
    setTimeout(() => { el.hidden = true; }, 300);
    await hooks.exit();
  }
  function tab(name) {
    el.querySelectorAll('[role=tab]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    el.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== name; });
    if (name === 'now' && !repos) loadRepos();
    if (name === 'ask' && !log.children.length) say('clone', 'Yo. I’m Siddhant’s shadow clone: same brain, trained only on this site. Ask me anything about my work.');
  }
  function open(id) {
    const li = el.querySelector(`[data-item="${CSS.escape(id)}"]`);
    if (!li) return;
    tab('things');
    el.querySelectorAll('.wme__thing.is-open').forEach((x) => { if (x !== li) x.classList.remove('is-open'); });
    li.classList.add('is-open');
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ---------- the shadow clone ----------
  function say(who, text) {
    const p = document.createElement('p');
    p.className = `wme__msg wme__msg--${who}`;
    p.textContent = text;
    log.append(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }
  async function ask(q) {
    q = q.trim().slice(0, 500);
    if (!q) return;
    say('you', q);
    history.push({ role: 'user', content: q });
    const p = say('clone', '…');
    let answer = '';
    try {
      const res = await fetch('api/clone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) });
      if (!res.ok || !res.body || !(res.headers.get('content-type') || '').startsWith('text/plain')) throw new Error('offline');
      const reader = res.body.getReader(), dec = new TextDecoder();
      p.textContent = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += dec.decode(value, { stream: true });
        p.textContent = answer;
        log.scrollTop = log.scrollHeight;
      }
    } catch { answer = ''; }
    if (!answer.trim()) {
      // no AI behind this copy of the site: the clone's scripted answers, typed out
      answer = scriptedReply(q);
      p.textContent = '';
      for (const word of answer.split(' ')) { p.textContent += `${p.textContent ? ' ' : ''}${word}`; log.scrollTop = log.scrollHeight; await new Promise((r) => setTimeout(r, 18)); }
    }
    history.push({ role: 'assistant', content: answer });
  }

  // ---------- on the desk: GitHub ----------
  async function loadRepos() {
    const ul = document.getElementById('w-me-repos');
    try {
      const r = await (await fetch('api/github')).json();
      if (!r.ok || !r.repos?.length) throw new Error('none');
      repos = r.repos;
      ul.innerHTML = repos.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><b>${esc(x.name)}</b>${x.description ? `<span>${esc(x.description)}</span>` : ''}<em>${[x.language, `pushed ${ago(x.pushedAt)}`, x.stars ? `★ ${x.stars}` : ''].filter(Boolean).map(esc).join(' · ')}</em></a></li>`).join('');
    } catch {
      repos = [];
      ul.innerHTML = `<li><a href="${profile.github}" target="_blank" rel="noopener"><b>github.com/sidvashisth2005</b><span>The live feed is resting. Everything is on my profile.</span></a></li>`;
    }
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-me-out]')) { leave(); return; }
    if (e.target.closest('[data-me-hire]')) { scroll?.open(); return; }
    const t = e.target.closest('[role=tab]');
    if (t) { tab(t.dataset.tab); return; }
    const q = e.target.closest('[data-q]');
    if (q) { ask(q.dataset.q); return; }
    const li = e.target.closest('[data-item]');
    if (li && !e.target.closest('a')) {
      if (li.classList.contains('is-open')) li.classList.remove('is-open');
      else { open(li.dataset.item); hooks.focus(li.dataset.item); }
    }
  });
  el.addEventListener('keydown', (e) => {
    const li = e.target.closest?.('[data-item]');
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(li.dataset.item); hooks.focus(li.dataset.item); }
  });
  document.getElementById('w-me-form').addEventListener('submit', (e) => { e.preventDefault(); const i = document.getElementById('w-me-q'); ask(i.value); i.value = ''; });
  document.addEventListener('keydown', (e) => {
    // Escape leaves the study, unless a dialog (the contact form) is open over it
    if (e.key === 'Escape' && inside && !document.querySelector('.wdlg.is-open')) { e.preventDefault(); e.stopPropagation(); leave(); }
  }, true);
  document.addEventListener('click', (e) => { if (e.target.closest('[data-me]')) { e.preventDefault(); enter(); } });

  const tip = () => document.getElementById('w-tip');
  const ui = {
    get inside() { return inside; },
    enter, leave,
    // the room: pointing at a thing shows what it is, tapping one opens its story
    itemHover(id, x, y) {
      const t = id && THINGS.find((i) => i.id === id), tp = tip();
      if (!t || !tp) { if (tp) tp.hidden = true; return; }
      tp.innerHTML = `<span class="witem__k" lang="ja">${KINDS[t.kind][0]}</span><span><b>${esc(t.title)}</b><em>${esc(t.label)}</em></span>`;
      tp.style.transform = `translate(${Math.min(x + 18, innerWidth - 300)}px, ${y + 18}px)`;
      tp.hidden = false;
    },
    itemPick(id) { open(id); },
  };
  return ui;
}
