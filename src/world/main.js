// The Arc in 3D. One canvas, one camera: scroll moves it along a rail through the city and into the arena,
// and Free roam hands it to the visitor (WASD + drag). The text is HTML over the world (see world.html).
import './world.css';
import '../fonts.css';
import * as THREE from 'three';
import Lenis from 'lenis';
import { PAL } from './toon.js';
import { buildCity } from './city.js';
import { buildArena, ARENA } from './arena.js';

const $ = (s) => document.querySelector(s);
const mobile = window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = $('#w-canvas');

function hasGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
if (!hasGL()) {
  // no 3D here: the full site is the world
  window.location.replace('./');
}

// ---------- loader ----------
const bars = document.querySelectorAll('.wl__bar i');
let loaded = 0;
const setLoad = (p) => { loaded = Math.max(loaded, p); bars.forEach((b) => (b.style.transform = `scaleX(${loaded})`)); };
setLoad(0.08);

// ---------- renderer, scene, camera ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(PAL.void, 1);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAL.fog, 140, mobile ? 700 : 950);
const camera = new THREE.PerspectiveCamera(mobile ? 62 : 50, 1, 0.5, 4000);

const moonDir = new THREE.Vector3(-0.45, 0.62, -0.5).normalize();
const moon = new THREE.DirectionalLight(0xdcd6ff, 1.9);
moon.position.copy(moonDir).multiplyScalar(100);
scene.add(moon, new THREE.AmbientLight(0x5a1a26, 1.1));
const stageLight = new THREE.PointLight(0xff3347, 900, 160, 1.6);
stageLight.position.set(ARENA.x, 20, ARENA.z);
scene.add(stageLight);

const portrait = new Promise((res, rej) => new THREE.TextureLoader().load(mobile ? 'img/hero-ink-m.webp' : 'img/hero-ink.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));
portrait.then(() => setLoad(0.7), () => {});

let city, arena;
async function build() {
  // canvas signs use the site fonts, so wait for them first
  await Promise.all([
    document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('100px "Dela Gothic One"', '作る戦略家一閃大会'),
    document.fonts.load('500 20px "Azeret Mono"'),
  ]).catch(() => {});
  setLoad(0.35);
  city = buildCity(scene, { mobile, light: moonDir, portrait });
  arena = buildArena(scene, { mobile });
  setLoad(0.6);
  resize();
  await (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera)));
  await portrait.catch(() => {});
  setLoad(1);
}

// ---------- the rail ----------
// camera positions and what it looks at, from the rooftop, over the avenue, into the arena
const A = ARENA;
// (phones are tall: the portrait and the trophy sit in the upper half, above the text)
const railPos = new THREE.CatmullRomCurve3([
  mobile ? new THREE.Vector3(9, 53, 19) : new THREE.Vector3(12, 50, 18), // the rooftop, portrait billboard on the left
  new THREE.Vector3(8, 60, 4),
  new THREE.Vector3(0, 112, -60), // above the skyline: welcome
  new THREE.Vector3(0, 96, -150),
  new THREE.Vector3(0, 68, -250), // down the avenue
  new THREE.Vector3(0, 70, -340),
  new THREE.Vector3(14, 96, A.z + 170), // the arena comes into view
  new THREE.Vector3(62, 74, A.z + 66), // over the rim
  new THREE.Vector3(34, 28, A.z + 24), // dropping into the bowl
  new THREE.Vector3(-4, 15, A.z + 27), // face to face with the trophy
  new THREE.Vector3(-118, 72, A.z - 30), // rising out past the rim: open sky for the last word
], false, 'centripetal');
const railLook = new THREE.CatmullRomCurve3([
  mobile ? new THREE.Vector3(-26, 47, -24) : new THREE.Vector3(-14, 58, -37),
  new THREE.Vector3(-10, 70, -60),
  new THREE.Vector3(0, 70, -500),
  new THREE.Vector3(0, 60, -520),
  new THREE.Vector3(0, 52, -480),
  new THREE.Vector3(0, 40, A.z),
  new THREE.Vector3(0, 20, A.z),
  new THREE.Vector3(0, 6, A.z),
  new THREE.Vector3(0, mobile ? 1 : 8, A.z),
  new THREE.Vector3(0, mobile ? 1 : 9, A.z),
  new THREE.Vector3(-40, 64, A.z - 600),
], false, 'centripetal');

// ---------- scroll ----------
const lenis = reduce ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
let progress = 0;
const readProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
};
lenis?.on('scroll', () => { progress = readProgress(); });
window.addEventListener('scroll', () => { if (!lenis) progress = readProgress(); }, { passive: true });

// in-page links ride the rail
document.querySelectorAll('a[href^="#w-"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  const panel = $(id);
  if (!panel?.dataset.range) return;
  e.preventDefault();
  const [from] = panel.dataset.range.split(',').map(Number);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = (from + 0.04) * max;
  lenis ? lenis.scrollTo(y, { duration: 2.4 }) : window.scrollTo({ top: y, behavior: 'smooth' });
}));

// panels show over their stretch of the journey
const panels = [...document.querySelectorAll('.w-panel')].map((el) => ({ el, r: el.dataset.range.split(',').map(Number), on: false }));
function updatePanels(p) {
  panels.forEach((x) => {
    const on = p >= x.r[0] && p < x.r[1];
    if (on !== x.on) { x.on = on; x.el.classList.toggle('is-on', on); }
  });
}

// ---------- free roam ----------
const roamBtn = $('#w-roam'), roamT = $('#w-roam-t'), roamHint = $('#w-roamhint');
const keys = new Set();
let roaming = false, yaw = 0, pitch = 0, back = 0;
const roamPos = new THREE.Vector3();
const backFrom = new THREE.Vector3(), backQ = new THREE.Quaternion();
function setRoam(on) {
  if (on === roaming) return;
  roaming = on;
  document.body.classList.toggle('is-roaming', on);
  roamBtn.setAttribute('aria-pressed', String(on));
  roamT.textContent = on ? 'Back to the path' : 'Free roam';
  roamHint.hidden = !on;
  if (on) {
    lenis?.stop();
    roamPos.copy(camera.position);
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    yaw = e.y; pitch = e.x;
    canvas.focus?.();
  } else {
    // glide back onto the rail from wherever the visitor went
    backFrom.copy(camera.position); backQ.copy(camera.quaternion); back = 1;
    lenis?.start();
    keys.clear();
  }
}
roamBtn.addEventListener('click', () => setRoam(!roaming));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && roaming) { setRoam(false); return; }
  if (!roaming) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'q', 'e'].includes(k)) { keys.add(k); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
let drag = null;
canvas.addEventListener('pointerdown', (e) => { if (!roaming) return; drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!roaming || !drag) return;
  yaw -= (e.clientX - drag.x) * 0.0032; pitch -= (e.clientY - drag.y) * 0.0032;
  pitch = Math.max(-1.3, Math.min(1.3, pitch));
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => { if (!roaming) return; e.preventDefault(); roamPos.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), -e.deltaY * 0.05); }, { passive: false });

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
function roamStep(dt) {
  const speed = 46;
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  const mv = new THREE.Vector3();
  if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
  if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
  if (keys.has('d') || keys.has('arrowright')) mv.add(right);
  if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
  if (keys.has(' ') || keys.has('e')) mv.add(up);
  if (keys.has('shift') || keys.has('q')) mv.sub(up);
  if (mv.lengthSq()) roamPos.addScaledVector(mv.normalize(), speed * dt);
  // stay inside the world, above the ground
  roamPos.x = THREE.MathUtils.clamp(roamPos.x, -600, 600);
  roamPos.z = THREE.MathUtils.clamp(roamPos.z, -760, 260);
  roamPos.y = THREE.MathUtils.clamp(roamPos.y, 3, 260);
  // towers are solid: step out through the nearest wall (or stand on the roof)
  for (const [x, z, w, h, d] of city?.towers || []) {
    const m = 2.5, hx = w / 2 + m, hz = d / 2 + m;
    const dx = roamPos.x - x, dz = roamPos.z - z;
    if (Math.abs(dx) >= hx || Math.abs(dz) >= hz || roamPos.y >= h + m) continue;
    const px = hx - Math.abs(dx), pz = hz - Math.abs(dz), py = h + m - roamPos.y;
    if (py < px && py < pz) roamPos.y = h + m;
    else if (px < pz) roamPos.x = x + Math.sign(dx || 1) * hx;
    else roamPos.z = z + Math.sign(dz || 1) * hz;
  }
  camera.position.lerp(roamPos, 1 - Math.exp(-dt * 10));
  camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')), 1 - Math.exp(-dt * 14));
}

// ---------- loop ----------
const look = new THREE.Vector3(), target = new THREE.Vector3(), lookM = new THREE.Matrix4(), railQ = new THREE.Quaternion();
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; }, { passive: true });
const prog = $('#w-prog');
let smooth = 0, last = performance.now();
function railPose(p, outPos, outQ) {
  // both curves by the same segment parameter, so where it is and where it looks stay paired (each stop gets equal scroll)
  railPos.getPoint(p, outPos);
  railLook.getPoint(p, look);
  // a touch of parallax from the pointer
  look.x += mouse.sx * 14; look.y -= mouse.sy * 8;
  lookM.lookAt(outPos, look, up);
  outQ.setFromRotationMatrix(lookM);
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  lenis?.raf(now);
  mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 3));
  mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 3));
  if (roaming) roamStep(dt);
  else {
    smooth += (progress - smooth) * (1 - Math.exp(-dt * (reduce ? 30 : 6)));
    railPose(smooth, target, railQ);
    if (back > 0) {
      back = Math.max(0, back - dt / 1.1);
      const k = THREE.MathUtils.smootherstep(1 - back, 0, 1);
      camera.position.lerpVectors(backFrom, target, k);
      camera.quaternion.slerpQuaternions(backQ, railQ, k);
    } else {
      camera.position.copy(target);
      camera.quaternion.copy(railQ);
    }
    updatePanels(smooth);
    prog.style.transform = `scaleX(${smooth})`;
  }
  // the crowd flares as the camera drops into the bowl
  const pulse = THREE.MathUtils.smoothstep(smooth, 0.72, 0.8) * (1 - THREE.MathUtils.smoothstep(smooth, 0.82, 0.95));
  city?.update(time);
  arena?.update(time, roaming ? 0 : pulse);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---------- go ----------
window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
build().then(() => {
  requestAnimationFrame(frame);
  // the cut opens the world
  setTimeout(() => {
    const wl = $('#wl');
    wl.classList.add('is-cut');
    document.body.classList.remove('is-loading');
    setTimeout(() => wl.remove(), 1600);
  }, 250);
});
