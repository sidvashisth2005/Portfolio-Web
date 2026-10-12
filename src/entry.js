// The loader is pure HTML + CSS, so let the browser paint it before any app code runs.
// Styles stay here so they're inlined in the page head; the app chunk is fetched and run after the first frame.
import './fonts.css';
import './styles.css';
import { guard } from './ui/guard.js';

guard();

// The loader's score. It tries to start on its own as the page opens, but browsers allow that only for some sites
// and visitors; otherwise it starts on the first click, tap or key. The audio context is resumed inside that gesture
// (Safari insists) and handed to the score, whose code loads only once there's sound to make.
const evs = ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'];
const AC = window.AudioContext || window.webkitAudioContext;
let ac = null, score = null, muted = false;
try { muted = localStorage.getItem('sv-sound') === 'off'; } catch { /* storage blocked */ }
const play = (fromButton = false) => { score ||= import('./ui/loaderSound.js'); score.then((m) => m.loaderSound(ac, fromButton)); };
function wake(e) {
  if (!document.getElementById('preloader')) { evs.forEach((t) => removeEventListener(t, wake, true)); return; }
  try {
    ac ||= AC ? new AC({ latencyHint: 'interactive' }) : null;
    if (ac?.state === 'suspended') ac.resume().catch(() => {});
  } catch { /* no audio */ }
  play(!!e.target.closest?.('.pl-sound'));
}
evs.forEach((t) => addEventListener(t, wake, { capture: true, passive: true }));
// on by default: if the browser lets this page make sound without a gesture, the score starts with the intro
if (AC && !muted) {
  requestAnimationFrame(() => {
    try {
      ac ||= new AC({ latencyHint: 'interactive' });
      if (ac.state === 'running') play();
      else ac.resume().then(() => { if (ac.state === 'running') play(); }, () => {});
    } catch { /* no audio */ }
  });
}
// a visitor who muted it last time sees that straight away
try {
  const b = document.querySelector('.pl-sound');
  if (b && localStorage.getItem('sv-sound') === 'off') { b.dataset.state = 'off'; b.lastElementChild.textContent = 'Sound off'; }
} catch { /* storage blocked */ }
// the way back to the 3D village: on the opening screen only, and only where the village can run
const vb = document.getElementById('village-btn');
if (vb) {
  let gl = false;
  try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch { /* no WebGL */ }
  if (!gl) vb.remove();
  else {
    const away = () => vb.classList.toggle('is-away', window.scrollY > window.innerHeight * 0.4);
    away();
    addEventListener('scroll', away, { passive: true });
  }
}
requestAnimationFrame(() => setTimeout(() => import('./main.js'), 0));
