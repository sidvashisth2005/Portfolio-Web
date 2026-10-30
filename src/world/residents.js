// 住人街 · The residents' quarter, the HTML side: the registry (who lives where), the claim form, and the panel
// shown inside a house (its resident, their things, a lantern to hang, a note to slip under the door; and for
// the resident, the editor). main.js owns the camera and the render; it hands this the quarter and the room and
// gets told when to go inside and come back out.
import { PLOTS, NOREN, NOREN_NAMES, ROOFS, ROOF_NAMES, KINDS, LIMITS, normProfile, cleanUrl } from '../registry.js';
import { registry, newItemId } from './registry.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const no = (id) => String(id + 1).padStart(2, '0');
const since = (iso) => { try { return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); } catch { return ''; } };
const CRESTS = ['火', '水', '風', '雷', '月', '星', '竜', '桜', '侍', '夢', '光', '心'];
const swatches = (name, list, names) => list.map((c, i) => `<label class="wsw" title="${names[i]}"><input type="radio" name="${name}" value="${i}"${i ? '' : ' checked'} /><span style="--c:${c}"></span><b class="wsr">${names[i]}</b></label>`).join('');

const html = `
  <div class="wdlg" id="w-reg" role="dialog" aria-modal="true" aria-labelledby="w-reg-title" hidden>
    <div class="wdlg__scrim" data-close></div>
    <div class="wdlg__box wres" data-lenis-prevent>
      <button class="wdlg__x" type="button" data-close aria-label="Close">✕</button>
      <p class="label label--red">住人台帳 · The village registry</p>
      <h2 class="wdlg__title" id="w-reg-title">The residents’ <span>quarter</span></h2>
      <p class="wres__lede">Twenty-four houses on the hill outside the old wall. Claim one and it’s yours: your crest on the noren, your name over the gate, your things on the shelves inside. Anyone who visits the village can drop by.</p>
      <p class="wres__sum" id="w-reg-sum" aria-live="polite"></p>
      <p class="wres__offline" id="w-reg-off" hidden>The registry isn’t connected on this copy of the site, so houses are kept in this browser only.</p>
      <div id="w-reg-mine"></div>
      <ul class="wres__list" id="w-reg-list"></ul>
      <form class="wres__key" id="w-reg-key">
        <label for="w-reg-keyin">Have a house key? Open your house on this device</label>
        <div><input id="w-reg-keyin" autocomplete="off" spellcheck="false" placeholder="07-XXXX-XXXX-…" /><button class="w-pill" type="submit">Open</button></div>
        <small class="wfield__err" id="w-reg-keyerr" role="alert"></small>
      </form>
    </div>
  </div>

  <div class="wdlg" id="w-claim" role="dialog" aria-modal="true" aria-labelledby="w-claim-title" hidden>
    <div class="wdlg__scrim" data-close></div>
    <div class="wdlg__box wres" data-lenis-prevent>
      <button class="wdlg__x" type="button" data-close aria-label="Close">✕</button>
      <form class="wdlg__form" id="w-claim-form" novalidate>
        <p class="label label--red">入居 · Move in</p>
        <h2 class="wdlg__title" id="w-claim-title">Claim <span>a house</span></h2>
        <fieldset class="wplots"><legend>Pick a plot <span class="muted" id="w-claim-plotname"></span></legend><div class="wplots__map" id="w-claim-plots"></div></fieldset>
        <div class="wclaim">
          <div class="wclaim__fields">
            <div class="wfield"><label for="wc-name">Your name, as it goes over the gate</label><input id="wc-name" name="name" maxlength="${LIMITS.name}" autocomplete="nickname" required /><small class="wfield__err" id="wce-name"></small></div>
            <div class="wfield"><label for="wc-crest">Your crest (one or two characters)</label><input id="wc-crest" name="crest" maxlength="8" required autocomplete="off" />
              <div class="wcrests">${CRESTS.map((c) => `<button type="button" data-crest="${c}" lang="ja">${c}</button>`).join('')}</div><small class="wfield__err" id="wce-crest"></small></div>
            <fieldset class="wsws"><legend>Noren</legend>${swatches('color', NOREN, NOREN_NAMES)}</fieldset>
            <fieldset class="wsws"><legend>Roof</legend>${swatches('roof', ROOFS, ROOF_NAMES)}</fieldset>
            <div class="wfield"><label for="wc-motto">A motto for the scroll in your alcove <span class="muted">(optional)</span></label><input id="wc-motto" name="motto" maxlength="${LIMITS.motto}" /></div>
          </div>
          <div class="wprev" aria-hidden="true">
            <div class="wprev__roof" id="w-prev-roof"></div>
            <div class="wprev__front"><div class="wprev__noren" id="w-prev-noren"><span><i id="w-prev-crest">桜</i></span></div></div>
            <div class="wprev__sign" id="w-prev-sign">Your name</div>
          </div>
        </div>
        <div class="wdlg__foot"><button class="w-pill w-pill--red w-pill--lg" type="submit" id="w-claim-go">Claim this house ↗</button><p class="wdlg__alt muted">No account. You get a house key instead.</p></div>
        <p class="wdlg__status" id="w-claim-status" role="status" aria-live="polite"></p>
      </form>
      <div class="wkey" id="w-claim-done" hidden>
        <span class="wstamp" aria-hidden="true">住</span>
        <h3>Welcome home.</h3>
        <p>This is your <b>house key</b>. It’s the only way back in: there’s no email and no password, so keep it somewhere safe (a password manager is perfect). This browser remembers it for you.</p>
        <code class="wkey__code" id="w-claim-key"></code>
        <div class="w-ctas"><button class="w-pill" type="button" id="w-claim-copy">Copy key</button><a class="w-pill" id="w-claim-dl" download="house-key.txt">Save as a file</a><button class="w-pill w-pill--red" type="button" id="w-claim-in">Go inside ↗</button></div>
      </div>
    </div>
  </div>

  <aside class="whome" id="w-home" aria-labelledby="w-home-name" hidden data-lenis-prevent>
    <div class="whome__top">
      <button class="w-pill" type="button" id="w-home-out">← Back to the village</button>
      <p class="label muted" id="w-home-no"></p>
    </div>
    <header class="whome__head">
      <span class="whome__crest" id="w-home-crest" lang="ja"></span>
      <div><h2 id="w-home-name"></h2><p class="whome__motto" id="w-home-motto"></p></div>
    </header>
    <div class="whome__acts" id="w-home-acts"></div>
    <div id="w-home-body"></div>
    <p class="wdlg__status" id="w-home-status" role="status" aria-live="polite"></p>
  </aside>
  <div class="wtip" id="w-tip" hidden></div>
  <div class="wfade" id="w-fade" aria-hidden="true"></div>`;

export function initResidents({ lenis, quarter, hooks }) {
  document.body.insertAdjacentHTML('beforeend', html);
  const $ = (s) => document.getElementById(s);
  const reg = $('w-reg'), claim = $('w-claim'), home = $('w-home'), tip = $('w-tip');
  let houses = new Array(PLOTS).fill(null);
  let current = null; // the house you're inside: { ...house, items }
  let editing = false;

  // ---------- dialogs ----------
  const open = new Set();
  function show(el, focus) {
    if (!el.hidden) return;
    el._opener = document.activeElement;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-open'));
    open.add(el);
    lenis?.stop();
    setTimeout(() => (focus || el.querySelector('input, button:not(.wdlg__x)'))?.focus(), 60);
  }
  function hide(el) {
    if (el.hidden) return;
    el.classList.remove('is-open');
    open.delete(el);
    setTimeout(() => { el.hidden = true; if (!open.size && !current) lenis?.start(); el._opener?.focus?.({ preventScroll: true }); }, 320);
  }
  [reg, claim].forEach((el) => el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => hide(el))));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const top = [...open].pop();
    if (top) { e.preventDefault(); e.stopPropagation(); hide(top); }
    else if (current) { e.preventDefault(); e.stopPropagation(); leaveHouse(); }
  }, true);

  // ---------- the registry ----------
  async function refresh() {
    try { houses = await registry.list(); } catch { /* keep what we had */ }
    const mine = registry.mine;
    // a key for a house that's gone (evicted, or left on another device) is no use
    if (mine && !houses[mine.id] && !registry.offline) registry.forget();
    quarter?.apply(houses, registry.mine?.id ?? -1);
    renderRegistry();
    const n = houses.filter(Boolean).length;
    document.querySelectorAll('[data-q-count]').forEach((el) => { el.textContent = `${n} of ${PLOTS} houses claimed · ${PLOTS - n} free`; });
    document.querySelectorAll('[data-q-mine]').forEach((el) => { el.hidden = !registry.mine; });
    document.querySelectorAll('[data-claim]').forEach((el) => { el.hidden = !!registry.mine; });
    return houses;
  }
  function renderRegistry() {
    const n = houses.filter(Boolean).length, mine = registry.mine;
    $('w-reg-sum').textContent = `${n} of ${PLOTS} houses claimed · ${PLOTS - n} still free`;
    $('w-reg-off').hidden = !registry.offline;
    $('w-reg-mine').innerHTML = mine && houses[mine.id]
      ? `<div class="wres__mine"><span class="whome__crest" style="--c:${NOREN[houses[mine.id].color]}">${esc(houses[mine.id].crest)}</span><div><p class="label label--red">Your house · No. ${no(mine.id)}</p><b>${esc(houses[mine.id].name)}</b></div><button class="w-pill w-pill--red" type="button" data-visit="${mine.id}">Go home ↗</button></div>`
      : `<div class="wres__mine wres__mine--cta"><div><p class="label label--red">${PLOTS - n} houses free</p><b>A place of your own in the village.</b></div><button class="w-pill w-pill--red" type="button" data-claim-open ${n >= PLOTS ? 'disabled' : ''}>Claim a house ↗</button></div>`;
    const list = houses.map((h, id) => h && { h, id }).filter(Boolean).sort((a, b) => b.h.lanterns - a.h.lanterns || a.id - b.id);
    // the founder's own house heads the list: his study in the headquarters
    const founderRow = `<li class="wres__founder"><span class="whome__crest" style="--c:#b8232c" lang="ja">閃</span><div><b>Siddhant Vashisth</b><span>Founder of the village · the study in the headquarters</span></div><button class="w-pill w-pill--sm w-pill--red" type="button" data-me>Visit</button></li>`;
    $('w-reg-list').innerHTML = founderRow + (list.length ? list.map(({ h, id }) => `<li>
        <span class="whome__crest" style="--c:${NOREN[h.color]}" lang="ja">${esc(h.crest)}</span>
        <div><b>${esc(h.name)}</b><span>${h.motto ? esc(h.motto) : `<i class="muted">No. ${no(id)}</i>`}</span></div>
        <em title="Lanterns hung by visitors">灯 ${h.lanterns}</em>
        <button class="w-pill w-pill--sm" type="button" data-visit="${id}" aria-label="Visit ${esc(h.name)}’s house">Visit</button>
      </li>`).join('') : '<li class="wres__empty">Nobody has moved in yet. The first house is waiting for you.</li>');
  }
  reg.addEventListener('click', (e) => {
    const v = e.target.closest('[data-visit]');
    if (v) { hide(reg); visit(+v.dataset.visit); }
    if (e.target.closest('[data-claim-open]')) { hide(reg); setTimeout(() => openClaim(), 330); }
    if (e.target.closest('[data-me]')) hide(reg);
  });
  $('w-reg-key').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('w-reg-keyerr');
    err.textContent = '';
    try { const id = await registry.adopt($('w-reg-keyin').value); $('w-reg-keyin').value = ''; await refresh(); hide(reg); visit(id); } catch (x) { err.textContent = x.message; }
  });

  // ---------- claiming ----------
  const form = $('w-claim-form');
  let plot = -1;
  function renderPlots() {
    $('w-claim-plots').innerHTML = Array.from({ length: PLOTS }, (_, id) => {
      const taken = !!houses[id];
      return `<button type="button" class="wplot${taken ? ' is-taken' : ''}${id === plot ? ' is-on' : ''}" data-plot="${id}" ${taken ? 'disabled' : ''} aria-pressed="${id === plot}" aria-label="House ${no(id)}${taken ? `, ${esc(houses[id].name)} lives here` : ', free'}" style="${taken ? `--c:${NOREN[houses[id].color]}` : ''}">${taken ? esc([...houses[id].crest][0]) : no(id)}</button>`;
    }).join('');
    $('w-claim-plotname').textContent = plot >= 0 ? `· No. ${no(plot)}, ${['first', 'first', 'second', 'second'][Math.floor(plot / 6)]} lane` : '';
  }
  $('w-claim-plots').addEventListener('click', (e) => { const b = e.target.closest('[data-plot]'); if (b && !b.disabled) { plot = +b.dataset.plot; renderPlots(); hooks.peek?.(plot); } });
  function preview() {
    const d = Object.fromEntries(new FormData(form));
    $('w-prev-noren').style.setProperty('--c', NOREN[+d.color || 0]);
    $('w-prev-roof').style.setProperty('--c', ROOFS[+d.roof || 0]);
    $('w-prev-crest').textContent = normProfile(d).value.crest || '?';
    $('w-prev-sign').textContent = (d.name || '').trim() || 'Your name';
  }
  form.addEventListener('input', preview);
  form.querySelector('.wcrests').addEventListener('click', (e) => { const b = e.target.closest('[data-crest]'); if (b) { form.crest.value = b.dataset.crest; preview(); } });
  async function openClaim(id) {
    if (registry.mine && houses[registry.mine.id]) { visit(registry.mine.id); return; }
    await refresh();
    plot = id ?? houses.findIndex((h) => !h);
    if (plot >= 0 && houses[plot]) plot = houses.findIndex((h) => !h);
    form.hidden = false; $('w-claim-done').hidden = true; $('w-claim-status').textContent = '';
    renderPlots(); preview();
    show(claim, form.name);
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    ['name', 'crest'].forEach((k) => { $(`wce-${k}`).textContent = ''; });
    const p = normProfile(d);
    if (plot < 0) { $('w-claim-status').textContent = 'Every house is taken. Check back soon.'; return; }
    if (Object.keys(p.errors).length) { Object.entries(p.errors).forEach(([k, v]) => { $(`wce-${k}`).textContent = v; }); form[Object.keys(p.errors)[0]].focus(); return; }
    const go = $('w-claim-go');
    go.disabled = true; go.textContent = 'Moving in…'; $('w-claim-status').textContent = '';
    try {
      const key = await registry.claim(plot, p.value);
      await refresh();
      $('w-claim-key').textContent = key;
      $('w-claim-dl').href = `data:text/plain;charset=utf-8,${encodeURIComponent(`House key for No. ${no(plot)} in the residents' quarter of Siddhant Vashisth's village\n\n${key}\n\nOpen ${location.origin}/world, then The registry → "Have a house key?"\n`)}`;
      form.hidden = true; $('w-claim-done').hidden = false;
      $('w-claim-in').focus();
    } catch (x) {
      if (x.data?.errors) Object.entries(x.data.errors).forEach(([k, v]) => { const el = $(`wce-${k}`); if (el) el.textContent = v; });
      $('w-claim-status').textContent = x.message;
      if (x.status === 409) { await refresh(); plot = houses.findIndex((h) => !h); renderPlots(); }
    } finally { go.disabled = false; go.textContent = 'Claim this house ↗'; }
  });
  $('w-claim-copy').addEventListener('click', async (e) => { try { await navigator.clipboard.writeText($('w-claim-key').textContent); e.target.textContent = 'Copied ✓'; } catch { getSelection().selectAllChildren($('w-claim-key')); e.target.textContent = 'Selected: copy it'; } });
  $('w-claim-in').addEventListener('click', () => { hide(claim); visit(registry.mine.id, { edit: true }); });

  // ---------- inside a house ----------
  const status = (t) => { $('w-home-status').textContent = t || ''; };
  async function visit(id, { edit = false } = {}) {
    if (!houses[id] && !(registry.mine?.id === id)) { openClaim(id); return; }
    tip.hidden = true;
    let h;
    try { h = await registry.house(id); } catch (x) { status(x.message); return; }
    if (!h) { await refresh(); openClaim(id); return; }
    current = h; editing = edit && h.owner;
    lenis?.stop();
    await hooks.enter(h, h.items);
    renderHome();
    home.hidden = false;
    requestAnimationFrame(() => home.classList.add('is-open'));
    $('w-home-out').focus({ preventScroll: true });
  }
  async function leaveHouse() {
    if (!current) return;
    current = null; editing = false;
    home.classList.remove('is-open');
    setTimeout(() => { home.hidden = true; }, 300);
    await hooks.exit();
    if (!open.size) lenis?.start();
  }
  $('w-home-out').addEventListener('click', leaveHouse);

  function renderHome() {
    const h = current, c = NOREN[h.color] || NOREN[0];
    home.style.setProperty('--c', c);
    $('w-home-no').textContent = `住 · House No. ${no(h.id)} · since ${since(h.since)}`;
    $('w-home-crest').textContent = h.crest; $('w-home-crest').style.setProperty('--c', c);
    $('w-home-name').textContent = h.name;
    $('w-home-motto').textContent = h.motto || '';
    $('w-home-acts').innerHTML = h.owner
      ? `<button class="w-pill${editing ? '' : ' w-pill--red'}" type="button" data-act="edit" aria-pressed="${editing}">${editing ? 'Done editing' : '✎ Edit your house'}</button><span class="whome__lan" title="Lanterns hung by visitors">灯 ${h.lanterns} lantern${h.lanterns === 1 ? '' : 's'}</span>`
      : `<button class="w-pill w-pill--red" type="button" data-act="lantern">灯 Hang a lantern <b>${h.lanterns}</b></button><button class="w-pill" type="button" data-act="note">✉ Slip a note under the door</button>`;
    $('w-home-body').innerHTML = editing ? editorHTML(h) : viewHTML(h);
    status('');
  }
  const kindBadge = (k) => `<span class="witem__k" lang="ja" title="${esc(KINDS[k]?.[1] || '')}">${KINDS[k]?.[0] || '物'}</span>`;
  function viewHTML(h) {
    const items = h.items || [];
    const note = h.owner ? '' : `<form class="wnote" id="w-note" hidden>
        <p class="label">A note under the door · only ${esc(h.name)} reads it</p>
        <input name="from" maxlength="${LIMITS.from}" placeholder="Your name (optional)" autocomplete="name" />
        <textarea name="text" maxlength="${LIMITS.note}" rows="3" required placeholder="Say hello, ask about something on the shelves…"></textarea>
        <button class="w-pill w-pill--red" type="submit">Slip it under ↗</button>
      </form>`;
    const notes = h.owner ? `<section class="wnotes"><p class="label label--red">✉ Under the door · ${h.notes?.length || 0}</p>${h.notes?.length ? `<ul>${h.notes.map((n) => `<li><b>${esc(n.from)}</b><span>${esc(n.text)}</span><em>${since(n.at)}</em></li>`).join('')}</ul><button class="w-pill w-pill--sm" type="button" data-act="clear-notes">Clear the notes</button>` : '<p class="muted">No notes yet. Visitors can leave you one.</p>'}</section>` : '';
    const keySec = h.owner ? `<details class="wkeysec"><summary>Your house key</summary><p class="muted">Use it to open this house on another device. Anyone with it can edit your house.</p><code class="wkey__code">${esc(registry.mine?.key || '')}</code><div class="w-ctas"><button class="w-pill w-pill--sm" type="button" data-act="copy-key">Copy key</button><button class="w-pill w-pill--sm" type="button" data-act="leave">Move out…</button></div></details>` : '';
    return `${note}
      <section class="witems"><p class="label label--red">On the shelves · ${items.length}</p>
      ${items.length ? `<ul>${items.map((it) => `<li class="witem" data-item="${esc(it.id)}" tabindex="0">
          ${kindBadge(it.kind)}<div><b>${esc(it.title)}${it.pub ? '' : ' <span class="witem__lock">🔒 sealed</span>'}</b>${it.text ? `<p>${esc(it.text)}</p>` : ''}
          ${it.url ? `<a class="witem__a" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer nofollow ugc">${esc(it.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 48))} ↗</a>` : ''}</div>
        </li>`).join('')}</ul>` : `<p class="muted">${h.owner ? 'Your shelves are empty. Edit your house to put things on them.' : 'Nothing on the shelves yet.'}</p>`}
      </section>${notes}${keySec}`;
  }
  function itemRow(it) {
    return `<li class="wed__item" data-id="${esc(it.id)}">
      <div class="wed__row"><select name="kind" aria-label="What it is">${Object.entries(KINDS).map(([k, [kj, n, d]]) => `<option value="${k}"${k === it.kind ? ' selected' : ''}>${kj} ${n} · ${d}</option>`).join('')}</select>
        <label class="wed__pub"><input type="checkbox" name="pub"${it.pub ? ' checked' : ''} /> Public</label>
        <button type="button" class="wed__rm" data-act="rm" aria-label="Remove">✕</button></div>
      <input name="title" maxlength="${LIMITS.title}" placeholder="Title" value="${esc(it.title)}" />
      <textarea name="text" maxlength="${LIMITS.text}" rows="2" placeholder="A few words (optional)">${esc(it.text)}</textarea>
      <input name="url" maxlength="${LIMITS.url}" placeholder="A link (optional): github.com/you" value="${esc(it.url)}" inputmode="url" />
    </li>`;
  }
  function editorHTML(h) {
    const sw = (name, list, names, cur) => list.map((c, i) => `<label class="wsw" title="${names[i]}"><input type="radio" name="${name}" value="${i}"${i === cur ? ' checked' : ''} /><span style="--c:${c}"></span><b class="wsr">${names[i]}</b></label>`).join('');
    return `<form class="wed" id="w-ed" novalidate>
      <div class="wdlg__row"><div class="wfield"><label for="we-name">Name</label><input id="we-name" name="name" maxlength="${LIMITS.name}" value="${esc(h.name)}" /></div>
      <div class="wfield"><label for="we-crest">Crest</label><input id="we-crest" name="crest" maxlength="8" value="${esc(h.crest)}" /></div></div>
      <div class="wfield"><label for="we-motto">Motto</label><input id="we-motto" name="motto" maxlength="${LIMITS.motto}" value="${esc(h.motto)}" /></div>
      <fieldset class="wsws"><legend>Noren</legend>${sw('color', NOREN, NOREN_NAMES, h.color)}</fieldset>
      <fieldset class="wsws"><legend>Roof</legend>${sw('roof', ROOFS, ROOF_NAMES, h.roof)}</fieldset>
      <p class="label label--red">Your things · <span id="w-ed-n">${h.items.length}</span> of ${LIMITS.items}</p>
      <p class="muted wed__hint">Public things are on show to every visitor. Sealed ones are locked in your browser with your house key before they leave it: only you can ever open them.</p>
      <ol class="wed__items" id="w-ed-items">${h.items.map(itemRow).join('')}</ol>
      <button class="w-pill" type="button" data-act="add" ${h.items.length >= LIMITS.items ? 'disabled' : ''}>＋ Put something on the shelves</button>
      <div class="wdlg__foot"><button class="w-pill w-pill--red w-pill--lg" type="submit">Save the house</button></div>
    </form>`;
  }
  function readEditor() {
    const f = $('w-ed'), d = Object.fromEntries(new FormData(f));
    const items = [...f.querySelectorAll('.wed__item')].map((li) => ({
      id: li.dataset.id, kind: li.querySelector('[name=kind]').value, pub: li.querySelector('[name=pub]').checked,
      title: li.querySelector('[name=title]').value.trim(), text: li.querySelector('[name=text]').value.trim(), url: li.querySelector('[name=url]').value.trim(),
    }));
    return { profile: { name: d.name, crest: d.crest, color: +d.color, roof: +d.roof, motto: d.motto }, items };
  }
  home.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    const li = e.target.closest('[data-item]');
    if (li && !a && !e.target.closest('a')) { hooks.focus(li.dataset.item); return; }
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'edit') { editing = !editing; renderHome(); return; }
    if (act === 'note') { const f = $('w-note'); f.hidden = !f.hidden; if (!f.hidden) f.text.focus(); return; }
    if (act === 'lantern') {
      a.disabled = true;
      try {
        const r = await registry.lantern(current.id);
        current.lanterns = r.lanterns;
        a.querySelector('b').textContent = r.lanterns;
        a.classList.add('is-lit');
        status(r.already ? 'You’ve hung your lantern here today. Come back tomorrow for another.' : `Your lantern is up. ${current.name}’s house glows a little brighter.`);
        refresh();
      } catch (x) { status(x.message); } finally { a.disabled = false; }
      return;
    }
    if (act === 'add') {
      const ol = $('w-ed-items');
      if (ol.children.length >= LIMITS.items) return;
      ol.insertAdjacentHTML('beforeend', itemRow({ id: newItemId(), kind: 'scroll', pub: true, title: '', text: '', url: '' }));
      ol.lastElementChild.querySelector('[name=title]').focus();
      $('w-ed-n').textContent = ol.children.length;
      a.disabled = ol.children.length >= LIMITS.items;
      return;
    }
    if (act === 'rm') { a.closest('.wed__item').remove(); $('w-ed-n').textContent = $('w-ed-items').children.length; home.querySelector('[data-act=add]').disabled = false; return; }
    if (act === 'copy-key') { try { await navigator.clipboard.writeText(registry.mine.key); a.textContent = 'Copied ✓'; } catch { a.textContent = 'Select it above'; } return; }
    if (act === 'clear-notes') { try { await registry.clearNotes(); current.notes = []; renderHome(); } catch (x) { status(x.message); } return; }
    if (act === 'leave') {
      // eslint-disable-next-line no-alert
      if (!confirm(`Move out of No. ${no(current.id)}? Your things go with you and the house goes back on the market. This can’t be undone.`)) return;
      try { await registry.leave(); await leaveHouse(); await refresh(); } catch (x) { status(x.message); }
    }
  });
  home.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (e.target.id === 'w-note') {
      const d = Object.fromEntries(new FormData(e.target));
      const b = e.target.querySelector('button');
      b.disabled = true;
      try { await registry.note(current.id, d); e.target.reset(); e.target.hidden = true; status(`Slipped under the door. Only ${current.name} will read it.`); } catch (x) { status(x.message); } finally { b.disabled = false; }
      return;
    }
    if (e.target.id !== 'w-ed') return;
    const { profile, items } = readEditor();
    const p = normProfile(profile);
    if (Object.keys(p.errors).length) { status(Object.values(p.errors)[0]); return; }
    for (const it of items) {
      if (!it.title) { status('Every thing on the shelves needs a title.'); return; }
      if (cleanUrl(it.url) === null) { status(`“${it.title}”: that link isn’t a web address.`); return; }
    }
    const b = e.target.querySelector('[type=submit]');
    b.disabled = true; b.textContent = 'Saving…';
    try {
      await registry.save(p.value, items);
      const h = await registry.house(current.id);
      current = h; editing = false;
      hooks.update(h, h.items);
      renderHome();
      status('Saved. Your house is up to date for every visitor.');
      refresh();
    } catch (x) { status(x.message); } finally { b.disabled = false; b.textContent = 'Save the house'; }
  });

  // ---------- from the world ----------
  // a house under the pointer: who lives there
  function hover(id, x, y) {
    if (id < 0 || current) { tip.hidden = true; return; }
    const h = houses[id];
    tip.innerHTML = h ? `<span class="whome__crest" style="--c:${NOREN[h.color]}">${esc(h.crest)}</span><span><b>${esc(h.name)}</b><em>${registry.mine?.id === id ? 'Your house · ' : ''}灯 ${h.lanterns} · tap to visit</em></span>` : `<span class="whome__crest whome__crest--vac">空</span><span><b>No. ${no(id)} is free</b><em>Tap to claim it</em></span>`;
    tip.style.transform = `translate(${Math.min(x + 18, innerWidth - 300)}px, ${y + 18}px)`;
    tip.hidden = false;
  }
  function itemHover(id, x, y) {
    const it = id && current?.items.find((i) => i.id === id);
    if (!it) { tip.hidden = true; home.querySelectorAll('.witem.is-hot').forEach((el) => el.classList.remove('is-hot')); return; }
    tip.innerHTML = `${kindBadge(it.kind)}<span><b>${esc(it.title)}</b><em>${esc(KINDS[it.kind]?.[1] || '')}${it.url ? ' · has a link' : ''}</em></span>`;
    tip.style.transform = `translate(${Math.min(x + 18, innerWidth - 300)}px, ${y + 18}px)`;
    tip.hidden = false;
  }
  function itemPick(id) {
    const el = home.querySelector(`[data-item="${CSS.escape(id)}"]`);
    home.querySelectorAll('.witem.is-hot').forEach((x) => x.classList.remove('is-hot'));
    if (el) { el.classList.add('is-hot'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-registry]')) { e.preventDefault(); refresh(); show(reg); }
    if (e.target.closest('[data-claim]')) { e.preventDefault(); openClaim(); }
    if (e.target.closest('[data-q-home]') && registry.mine) { e.preventDefault(); visit(registry.mine.id); }
  });
  refresh();
  return { attach(q) { quarter = q; refresh(); }, refresh, visit, openClaim, hover, itemHover, itemPick, get inside() { return !!current; }, plotClick: (id) => (houses[id] ? visit(id) : openClaim(id)) };
}
