// The Arc in 3D: a hidden shinobi village at sunset. One canvas, one camera: scroll carries it along a rail from
// the great gate, down the main street, past the tower, over the village and into the exam stadium; Free roam
// hands it to the visitor (WASD + drag). The text is HTML over the world (see world.html).
import './world.css';
import '../fonts.css';
import * as THREE from 'three';
import Lenis from 'lenis';
import { buildLand, heightAt, LAYOUT } from './land.js';
import { buildVillage } from './village.js';
import { buildForest, buildLeaves } from './nature.js';
import { buildArena, ARENA } from './arena.js';
import { createPost } from './post.js';

const $ = (s) => document.querySelector(s);
const mobile = window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = $('#w-canvas');

function hasGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
if (!hasGL()) window.location.replace('./'); // no 3D here: the full site is the world

// ---------- loader ----------
const bars = document.querySelectorAll('.wl__bar i');
let loaded = 0;
const setLoad = (p) => { loaded = Math.max(loaded, p); bars.forEach((b) => (b.style.transform = `scaleX(${loaded})`)); };
setLoad(0.08);
const tick = () => new Promise((r) => setTimeout(r, 0));

// ---------- renderer, scene, camera, light ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8704e, mobile ? 320 : 420, mobile ? 1500 : 1900);
const camera = new THREE.PerspectiveCamera(mobile ? 60 : 48, 1, 0.5, 4000);
const post = createPost(renderer);

// a low sun in the west-north-west: long warm light, cool violet shade
const sunDir = new THREE.Vector3(-0.62, 0.2, -0.5).normalize();
const sun = new THREE.DirectionalLight(0xffc49a, 2.6);
sun.position.copy(sunDir).multiplyScalar(500);
scene.add(sun, new THREE.HemisphereLight(0xffa98a, 0x3a3a5a, 1.1), new THREE.AmbientLight(0x6a4a6a, 0.35));

const portrait = new Promise((res, rej) => new THREE.TextureLoader().load(mobile ? 'img/hero-ink-m.webp' : 'img/hero-ink.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, rej));

let land, village, arena, leaves;
async function build() {
  // painted signs use the site's fonts, so wait for them first
  await Promise.all([
    document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('100px "Dela Gothic One"', '作る戦略家一閃大会勝修行光伝巻力技戦影'),
    document.fonts.load('500 20px "Azeret Mono"'),
  ]).catch(() => {});
  setLoad(0.2);
  land = buildLand(scene, { mobile, sunDir });
  setLoad(0.35); await tick();
  village = buildVillage(scene, { mobile, portrait, heightAt });
  setLoad(0.55); await tick();
  buildForest(scene, { mobile, heightAt });
  setLoad(0.7); await tick();
  arena = buildArena(scene, { mobile });
  leaves = buildLeaves(scene, { mobile });
  setLoad(0.82);
  resize();
  railPose(0, camera.position, camera.quaternion);
  await (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera)));
  await portrait.catch(() => {});
  setLoad(1);
}

// ---------- the rail ----------
// where the camera is and what it looks at, stop by stop (each stop gets an equal share of the scroll)
const G = LAYOUT.gateZ, A = ARENA;
const STOPS = [
  // the great gate from the road, the portrait scroll on the left
  [mobile ? [-6, 7, 384] : [16, 9, 390], mobile ? [-10, 1, 300] : [22, 19, 300]],
  [[2, 11, G + 16], [0, 13, G - 60]], // through the gate
  [[0, 13, G - 50], [0, 20, 120]], // the main street: lanterns, signboards, shops
  [[0, 16, 190], [0, 22, 60]], // over the bridge
  [[0, 21, 110], [0, 26, 0]], // the tower ahead
  [mobile ? [74, 84, 112] : [46, 58, 62], mobile ? [0, 12, 0] : [0, 24, 0]], // around the tower and its crest
  [[130, 150, 170], mobile ? [0, 0, -110] : [0, 40, -260]], // the whole village, the cliff and the sun
  [[330, 110, 60], [A.x, 20, A.z]], // over the forest to the stadium
  [[A.x + 60, 70, A.z + 70], [A.x, 6, A.z]], // over the rim
  [[A.x + 30, mobile ? 22 : 20, A.z + 26], [A.x, mobile ? 2 : 7, A.z]], // into the bowl
  [[A.x - 4, 12, A.z + 25], [A.x, mobile ? 3 : 8.5, A.z]], // face to face with the trophy
  [[A.x - 90, 74, A.z - 60], [-300, 110, -700]], // up and out, into the sunset
];
const V = (a) => new THREE.Vector3(...a);
const railPos = new THREE.CatmullRomCurve3(STOPS.map((s) => V(s[0])), false, 'centripetal');
const railLook = new THREE.CatmullRomCurve3(STOPS.map((s) => V(s[1])), false, 'centripetal');
const at = (i) => i / (STOPS.length - 1); // scroll progress at a stop

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
  const panel = $(a.getAttribute('href'));
  if (!panel?.dataset.range) return;
  e.preventDefault();
  const [from] = panel.dataset.range.split(',').map(Number);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = (from + 0.03) * max;
  lenis ? lenis.scrollTo(y, { duration: 3 }) : window.scrollTo({ top: y, behavior: 'smooth' });
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
const roamPos = new THREE.Vector3(), backFrom = new THREE.Vector3(), backQ = new THREE.Quaternion();
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

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), mv = new THREE.Vector3(), roamQ = new THREE.Quaternion(), eul = new THREE.Euler();
function roamStep(dt) {
  fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  mv.set(0, 0, 0);
  if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
  if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
  if (keys.has('d') || keys.has('arrowright')) mv.add(right);
  if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
  if (keys.has(' ') || keys.has('e')) mv.add(up);
  if (keys.has('shift') || keys.has('q')) mv.sub(up);
  if (mv.lengthSq()) roamPos.addScaledVector(mv.normalize(), 40 * dt);
  roamPos.x = THREE.MathUtils.clamp(roamPos.x, -1300, 1300);
  roamPos.z = THREE.MathUtils.clamp(roamPos.z, -1300, 1300);
  roamPos.y = THREE.MathUtils.clamp(roamPos.y, heightAt(roamPos.x, roamPos.z) + 2.5, 420);
  // buildings are solid: step out through the nearest side, or stand on the roof
  for (const [x, z, rad, h] of village?.colliders || []) {
    const dx = roamPos.x - x, dz = roamPos.z - z, d = Math.hypot(dx, dz), m = rad + 1.5;
    if (d >= m || roamPos.y >= h + 1.5) continue;
    if (h + 1.5 - roamPos.y < m - d) roamPos.y = h + 1.5;
    else { const k = m / (d || 1); roamPos.x = x + (dx || 1) * k; roamPos.z = z + dz * k; }
  }
  camera.position.lerp(roamPos, 1 - Math.exp(-dt * 10));
  camera.quaternion.slerp(roamQ.setFromEuler(eul.set(pitch, yaw, 0, 'YXZ')), 1 - Math.exp(-dt * 14));
}

// ---------- loop ----------
const look = new THREE.Vector3(), target = new THREE.Vector3(), lookM = new THREE.Matrix4(), railQ = new THREE.Quaternion();
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', (e) => { mouse.x = e.clientX / window.innerWidth - 0.5; mouse.y = e.clientY / window.innerHeight - 0.5; }, { passive: true });
const prog = $('#w-prog');
let smooth = 0, last = performance.now();
function railPose(p, outPos, outQ) {
  railPos.getPoint(p, outPos);
  railLook.getPoint(p, look);
  look.x += mouse.sx * 14; look.y -= mouse.sy * 8; // a touch of parallax from the pointer
  lookM.lookAt(outPos, look, up);
  outQ.setFromRotationMatrix(lookM);
}
const ss = THREE.MathUtils.smoothstep;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
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
  // the gate opens as the journey starts; the crowd rises as the camera drops into the bowl
  const p = roaming ? 1 : smooth;
  land?.update(t);
  village?.update(t, ss(p, 0.005, at(1) * 0.9));
  arena?.update(t, roaming ? 0.3 : ss(p, at(8), at(9)));
  leaves?.update(t, camera.position);
  post.render(scene, camera, t);
  requestAnimationFrame(frame);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.setSize(w, h);
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
