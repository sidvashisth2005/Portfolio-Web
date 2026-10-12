// The loader is pure HTML + CSS, so let the browser paint it before any app code runs.
// Styles stay here so they're inlined in the page head; the app chunk is fetched and run after the first frame.
import './fonts.css';
import './styles.css';

// The loader's score. Browsers only allow sound after a tap or key, so its code loads on the first one; the audio
// context is made and resumed right inside the gesture (Safari insists), then handed over.
const evs = ['pointerdown', 'touchend', 'keydown'];
let ac = null, score = null;
function wake(e) {
  if (!document.getElementById('preloader')) { evs.forEach((t) => removeEventListener(t, wake, true)); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ac ||= AC ? new AC({ latencyHint: 'interactive' }) : null;
    if (ac?.state === 'suspended') ac.resume().catch(() => {});
  } catch { /* no audio */ }
  const fromButton = !!e.target.closest?.('.pl-sound');
  score ||= import('./ui/loaderSound.js');
  score.then((m) => m.loaderSound(ac, fromButton));
}
evs.forEach((t) => addEventListener(t, wake, { capture: true, passive: true }));
// a visitor who muted it last time sees that straight away
try {
  const b = document.querySelector('.pl-sound');
  if (b && localStorage.getItem('sv-sound') === 'off') { b.dataset.state = 'off'; b.lastElementChild.textContent = 'Sound off'; }
} catch { /* storage blocked */ }
requestAnimationFrame(() => setTimeout(() => import('./main.js'), 0));
