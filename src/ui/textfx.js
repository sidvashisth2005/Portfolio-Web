import gsap from 'gsap';

// Letter roll: every character is stacked twice; hovering slides the stack up one line.
export function rollify(el, step = 22) {
  const text = el.textContent.trim();
  // links and buttons can carry a label; on plain text the real words go in a visually hidden span
  const interactive = el.matches('a, button');
  if (interactive) el.setAttribute('aria-label', text);
  el.textContent = '';
  if (!interactive) { const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text; el.append(sr); }
  [...text].forEach((ch, i) => {
    const box = document.createElement('span');
    box.className = 'ch';
    box.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.style.transitionDelay = `${i * step}ms`;
    const a = document.createElement('span');
    const b = document.createElement('span');
    a.textContent = b.textContent = ch === ' ' ? ' ' : ch;
    inner.append(a, b);
    box.append(inner);
    el.append(box);
  });
}

// Red strip block reveal: a crimson bar wipes in, the text appears under it, the bar wipes out.
export function stripReveal(el, { delay = 0, timeline } = {}) {
  const bar = el.querySelector('.strip-reveal__bar');
  const text = el.querySelector('.strip-reveal__text');
  const tl = timeline || gsap.timeline({ delay });
  tl.fromTo(bar, { left: '0%', width: '0%' }, { width: '100%', duration: 0.42, ease: 'power2.inOut' })
    .set(text, { opacity: 1 })
    .to(bar, { left: '100%', width: '0%', duration: 0.4, ease: 'power2.inOut' });
  return tl;
}

// Buttons drift toward the cursor a little.
export function magnetic(el, strength = 0.28) {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: 0.4, ease: 'power3.out' });
  });
  el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
}
