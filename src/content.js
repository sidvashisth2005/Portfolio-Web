// Section markup built from data.js. The build prerenders it into index.html, so the content is in the HTML
// for first paint and for search engines; main.js only fills containers that are still empty (dev server).
import { gallery, moves, stats, dojos, awards, leadership, episodes, statNames } from './data.js';

export const NUMERALS = ['壱', '弐', '参'];

export function moveInfoHTML(i) {
  const m = moves[i];
  return `
    <h3>${m.title}</h3>
    <p class="label label--red">${m.kanji} · ${m.kanjiMeaning} · ${m.technique}</p>
    <ul>${m.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
    <div class="tags">${m.tags.map((t) => `<span>${t}</span>`).join('')}</div>
    ${m.github ? `<a class="pill pill--red" href="${m.github}" target="_blank" rel="noopener">Open case file ↗</a>` : ''}`;
}

export function contentHTML() {
  const fmt = (n) => n.toLocaleString('en-IN');
  // level-up screen: stages in date order
  const stages = [...dojos].reverse();
  return {
    'stats-track': stats.map((s, i) => `
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
              <img data-src="img/maincharacter.webp" alt="Siddhant in sunglasses that read I don't care" width="900" height="681" />
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
    </article>`,
    'lvl-stage': stages.map((d, i) => `
    <article class="lvl__card${i === 0 ? ' is-on' : ''}" data-i="${i}" aria-hidden="${i !== 0}">
      <p class="lvl__ep"><span>Stage ${String(i + 1).padStart(2, '0')}</span><span>${d.period}</span><span>${d.where}</span></p>
      <h3 class="lvl__co">${d.company.replace(/ Pvt\. Ltd\./, '')}</h3>
      <p class="lvl__role">${d.role}</p>
      ${d.classChange ? `<p class="lvl__class"><span>Class change</span>${d.classChange}</p>` : ''}
      <p class="lvl__metric"><b>${d.metric}</b><span>${d.metricLabel}</span></p>
      <ul class="lvl__notes">${d.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
    </article>`).join(''),
    'lvl-stats': statNames.map((st) => `
    <li data-k="${st.key}"><span class="lvl__sn">${st.short}<small>${st.label}</small></span><span class="lvl__bar"><i></i></span><b class="lvl__sv">0</b><em class="lvl__gain"></em></li>`).join(''),
    'lvl-track': stages.map((d, i) => `
    <li><button type="button" data-i="${i}"${i === 0 ? ' aria-current="step"' : ''}><span class="lvl__dot">${NUMERALS[i]}</span><span class="lvl__tn">${d.company.replace(/ Pvt\. Ltd\.| Assists/g, '')}</span><span class="lvl__ty">${d.period.replace(/.*(\d{4})$/, '$1')}</span></button></li>`).join(''),
    'awards': awards.map((a) => `
    <li class="award"><div class="award__top"><span class="award__title">${a.title}</span><span class="award__scope">${a.scope}</span></div><p>${a.desc}</p></li>`).join(''),
    'leadership': leadership.map((l, i) => { const [t, ...r] = l.split(':'); return `<li><span class="quests__n">${String(i + 1).padStart(2, '0')}</span><div><b>${t}</b>${r.length ? `<span>${r.join(':').trim()}</span>` : ''}</div></li>`; }).join(''),
    'moves-nav': moves.map((m, i) => `
    <button class="move-pill${i === 0 ? ' is-active' : ''}" type="button" role="tab" aria-selected="${i === 0}" data-index="${i}">
      <span class="kj" aria-hidden="true">${m.kanji}</span><span class="roll" data-roll>${m.label}</span>
    </button>`).join(''),
    'player-eps': episodes.map((e) => `<li><span>${e.ep}</span><span>${e.title}</span></li>`).join(''),
    'vortex-fallback': gallery.map((g) => `<img src="${g.src}" alt="${g.caption}" loading="lazy" />`).join(''),
    'moves-info': moveInfoHTML(0),
  };
}
