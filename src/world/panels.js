// The HTML layer for the stops beyond the stadium intro: built from the same data as the full site, so the
// numbers and words match everywhere. Each panel names its stop with data-key; main.js decides when it shows.
import { stats, moves, dojos, awards, leadership, episodes, gallery, profile } from '../data.js';

const NUM = ['壱', '弐', '参', '肆'];
const fmt = (n) => n.toLocaleString('en-IN');
const pad = (n) => String(n).padStart(2, '0');
// the grove's photographs, three shots along the ring (indices into the ten hung there)
export const PHOTO_SHOTS = [[0, 1, 2], [3, 4, 5], [6, 7, 8, 9]];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// the LinkedIn and GitHub marks, drawn inline (24-unit view box)
const ICON = {
  linkedin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
  github: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.62-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3"/></svg>',
};

const side = (key, at, label, kj, title, line, items) => `<section class="w-panel w-panel--${at} w-card" data-key="${key}" aria-label="${title}">
      <p class="label label--red">${label}</p>
      <h2 class="w-h2 w-h2--kj"><span class="w-kj" aria-hidden="true">${kj}</span>${title}</h2>
      <p class="w-intro">${line}</p>
      <ul class="w-list w-list--dots">${items.map((t) => `<li>${t}</li>`).join('')}</ul>
    </section>`;

export function panelsHTML() {
  const stages = [...dojos].reverse();
  return `
    <section class="w-panel w-panel--top w-card" data-key="sides" aria-label="Two sides">
      <p class="label label--red">二面 · Two sides, one person</p>
      <h2 class="w-h2">Strategist on one side. Builder on the other.</h2>
      <p class="w-intro">The two boards on the path are the two halves of how I work: what the market needs, and the thing that answers it. Scroll to read each one.</p>
    </section>
    ${side('sideA', 'right', 'Side A · Strategist', '略', 'The strategist', 'Reading the market before building for it.', ['Market research', 'ROI and unit economics', 'Go-to-market', 'The pitch: sole presenter on six-plus hackathon stages'])}
    ${side('sideB', 'left', 'Side B · Builder', '技', 'The builder', 'Shipping the thing the research says should exist.', ['Python · adversarial ML', 'Flutter apps', 'ARCore', 'IoT hardware and firmware'])}

    <section class="w-panel w-panel--low w-card" data-key="stats" aria-label="Battle stats">
      <p class="label label--red">戦績 · Battle stats</p>
      <h2 class="w-h2">Six plaques. All real.</h2>
      <p class="w-intro">Each wooden plaque on the shrine's rack is one number from the arc. Scroll along the rack to read them.</p>
    </section>
    ${[0, 3].map((o, k) => `<section class="w-panel w-panel--low w-card" data-key="stats${k ? 'R' : 'L'}" aria-label="Battle stats ${o + 1} to ${o + 3}">
      <p class="label label--red">戦績 · Plaques ${o + 1}–${o + 3} of 6</p>
      <ul class="w-stats">${stats.slice(o, o + 3).map((st) => `<li><b>${st.from !== undefined ? `${st.from}→` : ''}${fmt(st.value)}${st.suffix}</b><span>${esc(st.label)}</span><em>${st.kanji} ${esc(st.meaning)} · ${esc(st.type)}</em></li>`).join('')}</ul>
    </section>`).join('')}

    <section class="w-panel w-panel--right w-card" data-key="moves" aria-label="Special moves">
      <p class="label label--red">必殺技 · Special moves</p>
      <h2 class="w-h2">Four moves, four scrolls.</h2>
      <p class="w-intro">My four flagship projects, one scroll each. Scroll on and the camera walks the wall, one scroll at a time.</p>
      <ol class="w-index">${moves.map((m) => `<li><span class="w-kj" aria-hidden="true">${m.kanji}</span>${esc(m.title)}</li>`).join('')}</ol>
    </section>
    ${moves.map((m, i) => `<section class="w-panel w-panel--right w-card" data-key="scroll${i + 1}" aria-label="${esc(m.title)}">
      <p class="label label--red">巻 · Scroll ${i + 1} of 4 · ${esc(m.category)}</p>
      <h2 class="w-h2 w-h2--kj"><span class="w-kj" aria-hidden="true">${m.kanji}</span>${esc(m.title)}</h2>
      <p class="w-big-stat"><b>${esc(m.big)}</b> ${esc(m.bigLabel)}</p>
      <p class="w-intro">${esc(m.bullets?.[0] || '')}</p>
      <p class="w-meta">${m.award ? `${esc(m.award)} · ` : ''}${(m.tags || []).map(esc).join(' · ')}</p>
      ${m.github ? `<a class="w-pill w-pill--sm" href="${m.github}" target="_blank" rel="noopener">Case file on GitHub ↗</a>` : ''}
    </section>`).join('')}

    <section class="w-panel w-panel--right w-card" data-key="training" aria-label="The training arc">
      <p class="label label--red">修行編 · The training arc</p>
      <h2 class="w-h2">Where I levelled up.</h2>
      <p class="w-intro">Four stage stones round the ring, one per internship, first to latest. Scroll on to stand in front of each one.</p>
      <ol class="w-index">${stages.map((d, i) => `<li><span class="w-kj" aria-hidden="true">${NUM[i]}</span>${esc(d.name || d.company.replace(/ Pvt\. Ltd\./, ''))}</li>`).join('')}</ol>
    </section>
    ${stages.map((d, i) => `<section class="w-panel w-panel--right w-card" data-key="stage${i + 1}" aria-label="${esc(d.company)}">
      <p class="label label--red">修行 · Stage ${i + 1} of 4 · ${esc(d.period)}</p>
      <h2 class="w-h2 w-h2--kj"><span class="w-kj" aria-hidden="true">${NUM[i]}</span>${esc(d.name || d.company.replace(/ Pvt\. Ltd\./, ''))}</h2>
      <p class="w-meta">${esc(d.role)} · ${esc(d.where)}</p>
      <p class="w-big-stat"><b>${esc(d.metric)}</b> ${esc(d.metricLabel)}</p>
      <ul class="w-list w-list--dots">${(d.brief || d.notes || []).slice(0, 2).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${d.classChange ? `<p class="w-meta">Class change: <strong>${esc(d.classChange)}</strong></p>` : ''}
    </section>`).join('')}

    <section class="w-panel w-panel--right w-card" data-key="quests" aria-label="Side quests">
      <p class="label label--red">外伝 · Side quests</p>
      <h2 class="w-h2">Off the main path.</h2>
      <p class="w-intro">Leadership outside the projects: the clubs, fests and contests I ran.</p>
      <ul class="w-quests">${leadership.map((l) => { const [t, ...rest] = l.split(':'); return `<li><b>${esc(t)}</b>${rest.length ? `<span>${esc(rest.join(':').trim().replace(/^./, (c) => c.toUpperCase()))}</span>` : ''}</li>`; }).join('')}</ul>
    </section>

    <section class="w-panel w-panel--right w-card" data-key="awards" aria-label="Trophy room">
      <p class="label label--red">栄光 · Trophy room</p>
      <h2 class="w-h2">The rest of the honours.</h2>
      <p class="w-intro">Beyond the stadium, every win and where it was won.</p>
      <ul class="w-quests">${awards.map((a) => `<li><b>${esc(a.title)}</b><span class="w-meta">${esc(a.scope)}</span></li>`).join('')}</ul>
    </section>

    <section class="w-panel w-panel--left w-card" data-key="flashbacks" aria-label="Flashbacks">
      <p class="label label--red">回想 · Flashbacks</p>
      <h2 class="w-h2">Frames from the arc.</h2>
      <p class="w-lede">Trophies, stages, juries and the squad: real photographs hung in a ring round the stone. Scroll to walk past them; ${gallery.length} in the full site.</p>
      <a class="w-pill w-pill--lg" href="./?site=2d#flashbacks">See them all ↗</a>
    </section>
    ${PHOTO_SHOTS.map((g, k) => `<section class="w-panel w-panel--low w-card w-card--strip" data-key="photos${k + 1}" aria-label="Photographs">
      <p class="label label--red">回想 · Frames ${g[0] + 1}–${g[g.length - 1] + 1} of ${gallery.slice(0, 10).length}</p>
      <ol class="w-strip">${g.map((i) => `<li><span>${pad(i + 1)}</span>${esc(gallery[i].caption)}</li>`).join('')}</ol>
    </section>`).join('')}

    <section class="w-panel w-panel--right w-card" data-key="onair" aria-label="On air">
      <p class="label label--red">放送 · On air</p>
      <h2 class="w-h2">The podcast, from the top of the cliff.</h2>
      <p class="w-intro">A show about business development, pitching and building teams. Press play for a clip.</p>
      <ol class="w-eps">${episodes.map((e) => `<li><span class="label muted">${esc(e.ep)}</span>${esc(e.title)}</li>`).join('')}</ol>
      <button class="w-pill w-pill--red w-pill--lg" type="button" id="w-play" aria-pressed="false">▶ Play a clip</button>
      <audio id="w-audio" src="media/podcast-ep01.mp3" preload="none"></audio>
    </section>

    <section class="w-panel w-panel--end w-card" data-key="contact" aria-label="Contact">
      <p class="label label--red">つづく · To be continued</p>
      <h2 class="w-h2">The next arc starts with you.</h2>
      <p class="w-lede">Graduating 2027. Open to BD, business analyst, growth and product roles from Q4 2026. Based in Guna, happy to relocate or work remote.</p>
      <div class="w-ctas">
        <a class="w-pill w-pill--red w-pill--lg" href="mailto:${profile.email}">Hire me ↗</a>
        <a class="w-pill w-pill--lg" href="resume.pdf" download>Résumé ↓</a>
        <a class="w-pill w-pill--lg" href="./?site=2d">Open the full site ↗</a>
      </div>
      <p class="label w-links"><a href="mailto:${profile.email}">${profile.email}</a><br><a class="w-nowrap" href="tel:+918871592579">${profile.phone}</a></p>
      <div class="w-social">
        <a class="w-soc w-soc--in" href="${profile.linkedin}" target="_blank" rel="noopener"><span class="w-soc__ic" aria-hidden="true">${ICON.linkedin}</span>LinkedIn<span aria-hidden="true">↗</span></a>
        <a class="w-soc w-soc--gh" href="${profile.github}" target="_blank" rel="noopener"><span class="w-soc__ic" aria-hidden="true">${ICON.github}</span>GitHub<span aria-hidden="true">↗</span></a>
      </div>
    </section>`;
}

// the podcast clip plays from its panel
export function wirePanels() {
  const btn = document.getElementById('w-play'), audio = document.getElementById('w-audio');
  if (!btn || !audio) return;
  btn.addEventListener('click', () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
  audio.addEventListener('play', () => { btn.textContent = '❚❚ Pause'; btn.setAttribute('aria-pressed', 'true'); });
  audio.addEventListener('pause', () => { btn.textContent = '▶ Play a clip'; btn.setAttribute('aria-pressed', 'false'); });
}
