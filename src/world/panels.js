// The HTML layer for the stops beyond the stadium intro: built from the same data as the full site, so the
// numbers and words match everywhere. Each panel names its stop with data-key; main.js decides when it shows.
import { stats, moves, dojos, awards, leadership, episodes, gallery, profile } from '../data.js';

const NUM = ['壱', '弐', '参', '肆'];
const fmt = (n) => n.toLocaleString('en-IN');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function panelsHTML() {
  const stages = [...dojos].reverse();
  return `
    <section class="w-panel w-panel--top w-card" data-key="sides" aria-label="Two sides">
      <p class="label label--red">二面 · Two sides, one person</p>
      <h2 class="w-h2">Strategist on one side. Builder on the other.</h2>
      <div class="w-two">
        <div><p class="label label--red">Side A · Strategist</p><ul class="w-list"><li>Market research</li><li>ROI</li><li>Go-to-market</li><li>The pitch</li></ul></div>
        <div><p class="label label--red">Side B · Builder</p><ul class="w-list"><li>Python · Adversarial ML</li><li>Flutter</li><li>ARCore</li><li>IoT</li></ul></div>
      </div>
    </section>

    <section class="w-panel w-panel--low w-card" data-key="stats" aria-label="Battle stats">
      <p class="label label--red">戦績 · Battle stats</p>
      <h2 class="w-h2">Six plaques. All real.</h2>
      <ul class="w-stats">${stats.map((s) => `<li><b>${s.from !== undefined ? `${s.from}→` : ''}${fmt(s.value)}${s.suffix}</b><span>${esc(s.label)}</span><em>${s.kanji} · ${s.rarity}</em></li>`).join('')}</ul>
    </section>

    <section class="w-panel w-panel--right w-card" data-key="moves" aria-label="Special moves">
      <p class="label label--red">必殺技 · Special moves</p>
      <h2 class="w-h2">Four moves, four scrolls.</h2>
      <ul class="w-moves">${moves.map((m) => `<li><span class="w-kj" aria-hidden="true">${m.kanji}</span><div><b>${esc(m.title)}</b><span class="label muted">${esc(m.category)}${m.award ? ` · ${esc(m.award)}` : ''}</span><p><strong>${esc(m.big)}</strong> ${esc(m.bigLabel)}</p>${m.github ? `<a href="${m.github}" target="_blank" rel="noopener">Case file ↗</a>` : ''}</div></li>`).join('')}</ul>
    </section>

    <section class="w-panel w-panel--right w-card" data-key="training" aria-label="The training arc">
      <p class="label label--red">修行編 · The training arc</p>
      <h2 class="w-h2">Where I levelled up.</h2>
      <ol class="w-stages">${stages.map((d, i) => `<li><span class="w-kj" aria-hidden="true">${NUM[i]}</span><div><b>${esc(d.name || d.company.replace(/ Pvt\. Ltd\./, ''))}</b><span class="label muted">${esc(d.role)} · ${esc(d.period)}</span><p><strong>${esc(d.metric)}</strong> ${esc(d.metricLabel)}${d.classChange ? ` · class change: ${esc(d.classChange)}` : ''}</p></div></li>`).join('')}</ol>
    </section>

    <section class="w-panel w-panel--right w-card" data-key="quests" aria-label="Side quests">
      <p class="label label--red">外伝 · Side quests</p>
      <h2 class="w-h2">Off the main path.</h2>
      <ul class="w-quests">${leadership.map((l) => { const [t, ...rest] = l.split(':'); return `<li><b>${esc(t)}</b>${rest.length ? `<span>${esc(rest.join(':').trim().replace(/^./, (c) => c.toUpperCase()))}</span>` : ''}</li>`; }).join('')}</ul>
    </section>

    <section class="w-panel w-panel--right w-card" data-key="awards" aria-label="Trophy room">
      <p class="label label--red">栄光 · Trophy room</p>
      <h2 class="w-h2">The rest of the honours.</h2>
      <ul class="w-quests">${awards.map((a) => `<li><b>${esc(a.title)}</b><span class="label muted">${esc(a.scope)}</span></li>`).join('')}</ul>
    </section>

    <section class="w-panel w-panel--left w-card" data-key="flashbacks" aria-label="Flashbacks">
      <p class="label label--red">回想 · Flashbacks</p>
      <h2 class="w-h2">Frames from the arc.</h2>
      <p class="w-lede">Trophies, stages, juries and the squad: real photographs, hung in the grove. ${gallery.length} of them in the full site.</p>
      <a class="w-pill w-pill--lg" href="./#flashbacks">See them all ↗</a>
    </section>

    <section class="w-panel w-panel--right w-card" data-key="onair" aria-label="On air">
      <p class="label label--red">放送 · On air</p>
      <h2 class="w-h2">The podcast, from the top of the cliff.</h2>
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
        <a class="w-pill w-pill--lg" href="./">Open the full site ↗</a>
      </div>
      <p class="label w-links"><a href="mailto:${profile.email}">${profile.email}</a> · <a href="tel:+918871592579">${profile.phone}</a> · <a href="${profile.linkedin}" target="_blank" rel="noopener">LinkedIn</a> · <a href="${profile.github}" target="_blank" rel="noopener">GitHub</a></p>
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
