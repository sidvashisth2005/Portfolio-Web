// The Arc in 3D: a hidden shinobi village at sunset. One canvas, one camera: scroll carries it along a rail from
// the great gate, down the main street, past the tower, over the village and into the exam stadium; Free roam
// hands it to the visitor (WASD + drag). The text is HTML over the world (see world.html).
import './world.css';
import '../fonts.css';
import './fonts.css';
import * as THREE from 'three';
import Lenis from 'lenis';
import { buildLand, heightAt, LAYOUT, FACE_X } from './land.js';
import { buildVillage } from './village.js';
import { buildForest, buildLeaves } from './nature.js';
import { buildArena, ARENA } from './arena.js';
import { createPost } from './post.js';
import { buildPlaces } from './places.js';
import { panelsHTML, wirePanels, PHOTO_SHOTS } from './panels.js';
import { stats, moves, dojos, gallery } from '../data.js';

const $ = (s) => document.querySelector(s);
const mobile = window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = $('#w-canvas');

function hasGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
if (!hasGL()) window.location.replace('./?site=2d'); // no 3D here: the full site is the world

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

let land, village, arena, leaves, places;
async function build() {
  // painted signs use the site's fonts, so wait for them first
  await Promise.all([
    document.fonts.load('900 100px "Big Shoulders Display"'), document.fonts.load('100px "Dela Gothic One"', '作る戦略家一閃大会勝修行光伝巻力技戦影第章門'),
    document.fonts.load('500 20px "Azeret Mono"'), document.fonts.load('100px "Anton"'), document.fonts.load('700 20px "Archivo"'),
  ]).catch(() => {});
  setLoad(0.2);
  land = buildLand(scene, { mobile, sunDir });
  setLoad(0.35); await tick();
  village = buildVillage(scene, { mobile, portrait, heightAt });
  setLoad(0.55); await tick();
  buildForest(scene, { mobile, heightAt });
  setLoad(0.7); await tick();
  arena = buildArena(scene, { mobile });
  // phones travel the shorter journey, so the places beyond it aren't built there
  if (!mobile) places = buildPlaces(scene, { mobile });
  leaves = buildLeaves(scene, { mobile });
  setLoad(0.82);
  resize();
  railPose(0, camera.position, camera.quaternion);
  await (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera)));
  await portrait.catch(() => {});
  setLoad(1);
}

// ---------- the rail ----------
// where the camera is and what it looks at, stop by stop (each stop gets an equal share of the scroll).
// Desktop takes the whole journey; phones take the shorter one (gate, street, tower, stadium) and the full site
// carries the rest.
const G = LAYOUT.gateZ, A = ARENA;
// a point near one of the places, in its own 1:1 units (the places are built bigger by their scale)
const P = (key, x, y, z) => { const { at: c, scale: k } = LAYOUT[key]; return [c[0] + x * k, c[1] + y * k, c[2] + z * k]; };
const [LX, , LZ] = LAYOUT.library.at, LK = LAYOUT.library.scale;
const LF = [-LX / Math.hypot(LX, LZ), -LZ / Math.hypot(LX, LZ)]; // the library's front, toward the heart
const LR = [LF[1], -LF[0]]; // to the right as you face into it
const PL = (f, r, y) => [LX + (LF[0] * f + LR[0] * r) * LK, y * LK, LZ + (LF[1] * f + LR[1] * r) * LK];
const CZ = LAYOUT.cliffZ;
// A close-up of a flat thing (a board, a plaque, a photograph) at c in a place's own units, facing along n (x, z): the
// camera stands d in front of it, and the subject sits off the centre of the frame by off (positive: on the left,
// leaving the right for a panel).
const face = (key, c, n, d, off, camY = c[1], lookY = c[1]) => {
  const [nx, nz] = n, rx = nz, rz = -nx; // the frame's right, as the camera sees it
  return [P(key, c[0] + nx * d, camY, c[2] + nz * d), P(key, c[0] + rx * off, lookY, c[2] + rz * off)];
};
// the shrine's two boards (see places.js): Strategist with its panel on the right, Builder with its panel on the left
const board = (k, z) => { const ry = Math.PI / 2 + k * 0.55; return face('shrine', [8, 9.5, z], [Math.sin(ry), Math.cos(ry)], 14, 4 * k, 9.4, 9.3); }; // inside the last torii
// the training ground's stage stones stand on an arc of radius 22, each turned to face the posts at (0, 10)
const stoneShot = (i) => {
  const ang = Math.PI * (0.62 + i * 0.25), px = Math.cos(ang) * 22, pz = -Math.sin(ang) * 22, l = Math.hypot(px, 10 - pz);
  return face('training', [px, 5.4, pz], [-px / l, (10 - pz) / l], i === 3 ? 12 : 14, 4.2, 6.2, 5.2);
};
// the grove's photographs hang on a half ring of radius 20 round the stone at (0, -4), each facing it
const photoShot = (c) => {
  const a = Math.PI * (1.15 + (c / 9) * 0.7), cx = Math.cos(a) * 20, cz = -Math.sin(a) * 20 - 4;
  return face('memorial', [cx, 6.2, cz], [-Math.cos(a), Math.sin(a)], 13, 0, 6.4, 4.6);
};
const START = [
  // the great gate from the road, the portrait scroll on the left
  [mobile ? [-2, 3, 440] : [30, 3.5, 410], mobile ? [0, 22, 300] : [16, 18, 300], 'gate'], // low and wide: the gate towers over the road
  [[2, 11, G + 16], [0, 13, G - 60], 'through'], // through the gate
  [[0, 13, G - 50], [0, 20, 120], 'street'], // the main street: lanterns, signboards, shops
  [[0, 16, 190], [0, 22, 60], 'bridge'], // over the bridge
  [[6, 3, 92], [0, 54, 0], 'ahead'], // from the plaza's edge, looking up: the headquarters, the biggest thing in the valley
  [mobile ? [90, 70, 230] : [110, 64, 196], mobile ? [-40, 74, -120] : [-48, 76, -120], 'tower'], // the headquarters with the carved face behind it
  // up to the monument: the face carved into the cliff above the village
  [[FACE_X + 44, mobile ? 100 : 116, LAYOUT.cliffZ + (mobile ? 300 : 280)], [FACE_X + (mobile ? 0 : 40), mobile ? 128 : 118, LAYOUT.cliffZ + 30], 'monument'],
];
const STADIUM = [
  [[330, 110, 60], [A.x, 20, A.z], 'toStadium'], // over the forest to the stadium
  [[A.x + 60, 70, A.z + 70], [A.x, 6, A.z], 'rim'], // over the rim
  [[A.x + 30, mobile ? 22 : 20, A.z + 26], [A.x, mobile ? 2 : 7, A.z], 'bowl'], // into the bowl
  [[A.x - 4, 12, A.z + 25], [A.x, mobile ? 3 : 8.5, A.z], 'trophy'], // face to face with the trophy
];
const STOPS = mobile ? [
  ...START,
  [[130, 150, 170], [0, 0, -110], 'overview'], // the whole village, the cliff and the sun
  ...STADIUM,
  [[A.x - 90, 74, A.z - 60], [-300, 110, -700], 'sunset'], // up and out, into the sunset
] : [
  ...START,
  [[-120, 150, 160], [-300, 20, -40], 'overview'], // over the village, turning west to the hills
  [P('shrine', 70, 7, 7), P('shrine', 8, 9, -3), 'torii'], // the path of torii up to the shrine
  [P('shrine', 50, 22, 0), P('shrine', -4, 12, 0), 'sides'], // over the last torii: the two great boards either side of the path, the hall between
  // then each board in turn, a whip pan from one to the other
  [...board(1, 13), 'sideA'], [...board(-1, -13), 'sideB'],
  [P('shrine', -6, 2.6, -3), P('shrine', -6, 3.4, -24), 'stats'], // the ema rack, up in the top half of the view
  // a sideways track along the rack, three plaques at a time
  [...face('shrine', [-11.5, 6.8, -23.5], [0, 1], 13, 0, 6.6, 4.6), 'statsL'], [...face('shrine', [3.5, 6.8, -23.5], [0, 1], 13, 0, 6.6, 4.6), 'statsR'],
  [PL(70, 8, 34), PL(0, 0, 8), 'toLibrary'], // back over the wall to the library
  [PL(8, 17, 10), PL(-10.6, -6, 9), 'moves'], // the four scrolls on the left, the panel on the right
  // walking the wall: each scroll in turn, on the left of the frame
  ...moves.map((m, i) => [PL(4.4, -15 + i * 10 + 1.5, 9.8), PL(-10.6, -15 + i * 10 + 5.2, 9.2), `scroll${i + 1}`]),
  [P('training', 45, 50, 48), P('training', -5, 2, -2), 'toTraining'], // the training ground from above
  // round the ring: each stage stone in turn, first to latest
  ...[0, 1, 2, 3].map((i) => [...stoneShot(i), `stage${i + 1}`]),
  [P('training', 26, 16, 36), P('training', -18, 4, -10), 'quests'],
  ...STADIUM,
  [[A.x + 10, 30, A.z + 20], [A.x + 40, 54, A.z - 88], 'awards'], // up to the great banner
  [[280, 90, 120], P('memorial', 0, 5, 0), 'overVillage'], // back over the village
  [P('memorial', -4, 7.6, -3), P('memorial', 15.6, 5.2, 11.2), 'memorial'], // inside the ring of photographs, the stone behind
  // a slow pan round the ring, a few photographs at a time
  ...PHOTO_SHOTS.map((g, k) => [...photoShot((g[0] + g[g.length - 1]) / 2), `photos${k + 1}`]),
  [[80, 140, 120], [40, 214, CZ], 'rise'], // rising toward the cliff
  [P('mast', -40, 16, 50), P('mast', 8, 14, 9), 'onair'], // the radio mast and the ON AIR hut
  [P('summit', 0, 14, 32), [-10, 40, 200], 'summit'], // past the summit rail: the whole village at sunset
];
// Every stop is a shot, planned like a film: a lens (fov, degrees on desktop), a tilt of the horizon (roll, degrees),
// a slow push-in while the camera rests there (push, metres along the view) and a caption saying what is in frame.
const SHOT = {
  gate: { fov: 36, push: 7, cap: ['門', 'The great gate', 'The only way into the village. Scroll, and its doors swing open.'] },
  through: { fov: 58, roll: -2, cap: ['入', 'Through the gate', 'Under the 一閃 plaque and into the village.'] },
  street: { fov: 44, push: 6, cap: ['道', 'Main street', 'Lanterns, signboards and shops: everyday life on the way to the centre.'] },
  bridge: { fov: 50, roll: 2, cap: ['橋', 'The red bridge', 'Over the river that cuts the village in two.'] },
  ahead: { fov: 50, push: 8, cap: ['本部', 'Headquarters', 'The biggest building in the valley, where the strategist works.'] },
  tower: { fov: 40, push: 8, cap: ['本部', 'Headquarters', 'Tiered roofs, thatch skirts, the 閃 crest on top.'] },
  monument: { fov: 30, push: 14, cap: ['顔', 'The monument', 'His face, carved into the cliff that guards the village.'] },
  overview: { fov: 46, roll: -3, cap: ['里', 'The hidden village', mobile ? 'From above: the whole valley at sunset, the carved cliff behind it.' : 'From above: the whole valley at sunset, the shrine hills to the west.'] },
  torii: { fov: 40, push: 6, cap: ['鳥居', 'The path of torii', 'Red gates climbing the hill to the shrine.'] },
  sides: { fov: 44, push: 5, cap: ['二面', 'Two sides', 'Two great boards either side of the path: the strategist and the builder.'] },
  sideA: { fov: 58, push: 3, cap: ['略', 'Side A · The strategist', 'Market research, ROI, go-to-market and the pitch.'] },
  sideB: { fov: 58, push: 3, cap: ['技', 'Side B · The builder', 'Python and adversarial ML, Flutter, ARCore, IoT.'] },
  stats: { fov: 36, push: 1.2, cap: ['絵馬', 'The plaque rack', 'Six wooden plaques, each one a real number from the arc.'] },
  statsL: { fov: 40, push: 1.5, cap: ['絵馬', 'Plaques 1 to 3', stats.slice(0, 3).map((x) => `${x.kanji} ${x.meaning}: ${x.type.toLowerCase()}`).join(' · ')] },
  statsR: { fov: 40, push: 1.5, cap: ['絵馬', 'Plaques 4 to 6', stats.slice(3).map((x) => `${x.kanji} ${x.meaning}: ${x.type.toLowerCase()}`).join(' · ')] },
  toLibrary: { fov: 48, roll: 2, cap: ['書庫', 'The library', 'Where the village keeps its scrolls.'] },
  moves: { fov: 38, push: 3, cap: ['巻', 'Four scrolls', 'One scroll for each flagship project. The case files are linked.'] },
  toTraining: { fov: 46, roll: -2, cap: ['演習場', 'The training ground', 'A ring of posts and four stage stones.'] },
  ...Object.fromEntries(moves.map((m, i) => [`scroll${i + 1}`, { fov: 44, push: 2, cap: [m.kanji, `Scroll ${i + 1} · ${m.title}`, `${m.category}: ${m.big} ${m.bigLabel}`] }])),
  ...Object.fromEntries([...dojos].reverse().map((d, i) => [`stage${i + 1}`, { fov: 44, push: 2, cap: [['壱', '弐', '参', '肆'][i], `Stage ${i + 1} · ${d.name || d.short}`, `${d.role}, ${d.period}`] }])),
  quests: { fov: 42, push: 4, cap: ['外伝', 'Side quests', 'The clubs, fests and teams run off the main path.'] },
  toStadium: { fov: 44, roll: -3, cap: ['闘技場', 'The exam stadium', 'Beyond the forest: HackNITR 7.0, 6,200+ participants from 20+ countries.'] },
  rim: { fov: 52, roll: 3, cap: ['闘技場', 'Over the rim', 'Every figure in the stands is one of the participants.'] },
  bowl: { fov: 56, push: 3, cap: ['会場', 'Into the arena', 'Down to the floor, where the final was decided.'] },
  trophy: { fov: 34, push: 2, cap: ['優勝', 'Rank 1', 'The trophy. One team took the whole thing.'] },
  awards: { fov: 40, push: 4, cap: ['栄光', 'The honours', 'The great banner: the rest of the wins.'] },
  overVillage: { fov: 46, roll: 2, cap: ['回想', 'Back over the village', 'To the grove where the photographs hang.'] },
  memorial: { fov: 40, push: 3, cap: ['写真', 'Flashbacks', 'Real photographs from the arc, hung in a ring around the stone.'] },
  ...Object.fromEntries(PHOTO_SHOTS.map((g, k) => [`photos${k + 1}`, { fov: 42, push: 2, cap: ['写真', `Frames ${g[0] + 1} to ${g[g.length - 1] + 1}`, g.map((i) => gallery[i].caption).join(' · ')] }])),
  rise: { fov: 48, roll: -2, cap: ['崖', 'Up the cliff', 'To the top of the rock, above the carved face.'] },
  onair: { fov: 38, push: 4, cap: ['放送', 'On air', 'The radio mast and the hut where the podcast is recorded.'] },
  summit: { fov: 44, push: 6, cap: ['頂上', 'The summit', 'The whole village at sunset. The next chapter starts with you.'] },
  sunset: { fov: 48, cap: ['夕日', 'Into the sunset', 'The rest of the story is in the full site.'] },
};
// the journey in chapters: a title card opens each one
const CHAPTERS = (mobile ? [
  ['gate', '一', 'The village', 'A hidden village at sunset'], ['monument', '二', 'The monument', 'The face on the cliff'],
  ['toStadium', '三', 'The exam', 'HackNITR 7.0'], ['sunset', '終', 'To be continued', 'The rest of the arc'],
] : [
  ['gate', '一', 'The village', 'A hidden village at sunset'], ['monument', '二', 'The monument', 'The face on the cliff'],
  ['overview', '三', 'The shrine', 'Two sides and six plaques'], ['toLibrary', '四', 'The library', 'Four projects, four scrolls'],
  ['toTraining', '五', 'The training ground', 'Where I levelled up'], ['toStadium', '六', 'The exam', 'HackNITR 7.0'],
  ['overVillage', '七', 'Flashbacks', 'Frames from the arc'], ['rise', '八', 'On air', 'The podcast'],
  ['summit', '終', 'To be continued', 'The next arc starts with you'],
]).filter((c) => STOPS.some((s) => s[2] === c[0]));

const V = (a) => new THREE.Vector3(...a);
const railPos = new THREE.CatmullRomCurve3(STOPS.map((s) => V(s[0])), false, 'centripetal');
const railLook = new THREE.CatmullRomCurve3(STOPS.map((s) => V(s[1])), false, 'centripetal');
const N = STOPS.length - 1;
const stop = (name) => STOPS.findIndex((s) => s[2] === name);
const at = (name) => stop(name) / N; // scroll progress at a named stop
const shotOf = (i) => SHOT[STOPS[i][2]] || {};
// phones are narrow: the same shot needs a wider lens there
const lens = (i) => { const f = shotOf(i).fov || 46; return mobile ? THREE.MathUtils.clamp(f + 16, 52, 72) : f; };
const chapterAt = (i) => { let c = 0; CHAPTERS.forEach((ch, k) => { if (stop(ch[0]) <= i) c = k; }); return c; };
// each panel shows while the camera rests at its stop: [stop, before, after] in stops
const SHOW = {
  hero: ['gate', 0, 0.42], welcome: ['street', 0.3, 0.32], about: ['tower', 0.3, 0.36], monument: ['monument', 0.3, 0.36],
  tournament: ['toStadium', 0.3, 0.5], rank: ['trophy', 0.3, 0.36], end: ['sunset', 0.3, 0.1],
  sides: ['sides', 0.3, 0.34], stats: ['stats', 0.3, 0.34], moves: ['moves', 0.3, 0.36], training: ['toTraining', 0.3, 0.36], quests: ['quests', 0.3, 0.36],
  sideA: ['sideA', 0.3, 0.34], sideB: ['sideB', 0.3, 0.34], statsL: ['statsL', 0.3, 0.34], statsR: ['statsR', 0.3, 0.34],
  scroll1: ['scroll1', 0.3, 0.34], scroll2: ['scroll2', 0.3, 0.34], scroll3: ['scroll3', 0.3, 0.34], scroll4: ['scroll4', 0.3, 0.34],
  stage1: ['stage1', 0.3, 0.34], stage2: ['stage2', 0.3, 0.34], stage3: ['stage3', 0.3, 0.34], stage4: ['stage4', 0.3, 0.34],
  photos1: ['photos1', 0.3, 0.34], photos2: ['photos2', 0.3, 0.34], photos3: ['photos3', 0.3, 0.34],
  awards: ['awards', 0.3, 0.36], flashbacks: ['memorial', 0.3, 0.36], onair: ['onair', 0.3, 0.36], contact: ['summit', 0.3, 0.1],
};

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

// the later stops' panels come from the portfolio's data; each panel shows over its stretch of the journey
$('#w-content').insertAdjacentHTML('beforeend', panelsHTML());
wirePanels();
// scroll length: about a screen and a quarter per stop (the camera rests for part of it at every shot)
$('#w-content').style.height = `${(N + 1) * (mobile ? 95 : 105)}vh`;
const panels = [...document.querySelectorAll('.w-panel')].map((el) => {
  const sh = SHOW[el.dataset.key], i = sh ? stop(sh[0]) : -1;
  if (i < 0) { el.remove(); return null; } // not on this journey
  el.dataset.range = `${(i - sh[1]) / N},${(i + sh[2]) / N}`;
  return { el, r: [(i - sh[1]) / N, (i + sh[2]) / N], on: false };
}).filter(Boolean);
function updatePanels(p) {
  panels.forEach((x) => {
    const on = p >= x.r[0] && p < x.r[1];
    if (on !== x.on) { x.on = on; x.el.classList.toggle('is-on', on); }
  });
}

// ---------- the film: letterbox, a caption for every shot, a title card for every chapter ----------
const cap = $('#w-cap'), capK = $('#w-cap-k'), capT = $('#w-cap-t'), capL = $('#w-cap-l'), slate = $('#w-slate'), card = $('#w-chapter');
const pad = (n) => String(n).padStart(2, '0');
let capAt = -1, capOn = false, capOff = -1e9, chapter = -1, rolling = false;
// The title card: it comes up when the camera settles on a new chapter, and goes the moment the visitor scrolls on
// (or after a few seconds). While it is up, the chapter's text waits.
let pending = -1, cardOn = false, cardAt = 0, cardTimer = 0, still = 0;
function showCard(c) {
  const [, no, title, sub] = CHAPTERS[c], fin = no === '終';
  card.querySelector('.w-chapter__kj').textContent = fin ? '終章' : `第${no}章`;
  card.querySelector('.w-chapter__n').textContent = fin ? 'Finale' : `Chapter ${pad(c + 1)}`;
  card.querySelector('.w-chapter__t').textContent = title;
  card.querySelector('.w-chapter__s').textContent = sub;
  card.classList.add('is-on');
  document.body.classList.add('is-titling');
  cardOn = true; cardAt = progress;
  clearTimeout(cardTimer); cardTimer = setTimeout(hideCard, 2600);
}
function hideCard() {
  if (!cardOn) return;
  cardOn = false;
  clearTimeout(cardTimer);
  card.classList.remove('is-on');
  document.body.classList.remove('is-titling');
}
function updateCard(dt) {
  // scrolling on clears the card at once
  if (cardOn && Math.abs(progress - cardAt) > 0.4 / N / 100) hideCard();
  // the camera has settled: the scroll has stopped and the rail has caught up with it
  still = Math.abs(progress - smooth) < 0.02 / N ? still + dt : 0;
  if (pending >= 0 && rolling && still > 0.15) { showCard(pending); pending = -1; }
}
function updateFilm(i, d) {
  // swap the caption only once the old one has faded out
  if (i !== capAt && performance.now() - capOff > 450) {
    const c = shotOf(i).cap;
    if (c) { capK.textContent = c[0]; capT.textContent = c[1]; capL.textContent = c[2]; }
    capAt = i;
  }
  const on = capAt === i && Math.abs(d) < 0.36 && !!shotOf(i).cap;
  if (on !== capOn) { capOn = on; cap.classList.toggle('is-on', on); if (!on) capOff = performance.now(); }
  const ch = chapterAt(i);
  if (ch !== chapter) {
    chapter = ch;
    slate.innerHTML = `<b>${CHAPTERS[ch][1] === '終' ? 'Finale' : `Ch. ${pad(ch + 1)}`}</b> ${CHAPTERS[ch][2]}<span>Shot ${pad(i + 1)} / ${pad(N + 1)}</span>`;
    pending = ch; hideCard();
  } else slate.lastChild && (slate.lastChild.textContent = `Shot ${pad(i + 1)} / ${pad(N + 1)}`);
}

// ---------- free roam ----------
const roamBtn = $('#w-roam'), roamT = $('#w-roam-t'), roamHint = $('#w-roamhint');
const keys = new Set();
let roaming = false, yaw = 0, pitch = 0, back = 0;
const roamPos = new THREE.Vector3(), backFrom = new THREE.Vector3(), backQ = new THREE.Quaternion();
function setRoam(on) {
  if (on === roaming) return;
  roaming = on;
  hideCard();
  document.body.classList.toggle('is-roaming', on);
  resize(); // the frame opens to the full window while roaming, and closes to the letterbox again after
  roamBtn.setAttribute('aria-pressed', String(on));
  roamT.textContent = on ? 'Back to the path' : 'Free roam';
  roamHint.hidden = !on;
  if (travel) travel.hidden = !on;
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
// free roam: jump to any place on the journey (the camera glides there)
const TRAVEL = [['gate', 'The gate'], ['tower', 'Headquarters'], ['monument', 'The monument'], ['sides', 'Two sides'], ['stats', 'Battle stats'],
  ['moves', 'Special moves'], ['toTraining', 'Training arc'], ['trophy', 'HackNITR 7.0'], ['memorial', 'Flashbacks'], ['onair', 'On air'], ['summit', 'Contact']];
const travel = $('#w-travel');
if (travel) {
  travel.innerHTML = `<p class="label muted">Travel to</p>${TRAVEL.filter(([k]) => stop(k) >= 0).map(([k, n]) => `<button type="button" class="w-chip" data-stop="${k}">${n}</button>`).join('')}`;
  travel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-stop]');
    if (!b) return;
    const st = STOPS[stop(b.dataset.stop)];
    roamPos.set(...st[0]);
    const d = V(st[1]).sub(V(st[0]));
    yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
  });
}
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
  for (const [x, z, rad, h] of [...(village?.colliders || []), ...(places?.colliders || [])]) {
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
let smooth = 0, last = performance.now(), roamFade = 0;
// The camera rests at every stop for HOLD of a stop's scroll either side, then cranes to the next one, easing out of
// the old shot and into the new. While it rests it keeps a slow push-in and a faint handheld breath, so a held
// shot is never a still frame.
const HOLD = 0.2;
const rollQ = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), dolly = new THREE.Vector3();
const lerp = THREE.MathUtils.lerp, sm = THREE.MathUtils.smootherstep, D2R = Math.PI / 180;
const rail = { fov: lens(0), i: 0, d: 0 };
function railPose(p, outPos, outQ, t = 0) {
  const u = p * N, i = Math.min(N - 1, Math.floor(u)), g = sm(u - i, HOLD, 1 - HOLD);
  railPos.getPoint((i + g) / N, outPos);
  railLook.getPoint((i + g) / N, look);
  const k = Math.round(u), d = u - k, near = 1 - sm(Math.abs(d), HOLD, 0.5);
  const sh = shotOf(k);
  // the push-in: from half a push short of the mark to half a push past it, over the rest
  dolly.subVectors(look, outPos).normalize();
  outPos.addScaledVector(dolly, (sh.push || 2) * THREE.MathUtils.clamp(d / HOLD, -1, 1) * 0.5 * near);
  if (!reduce) {
    const breath = 0.18 * near;
    outPos.x += Math.sin(t * 0.61) * breath; outPos.y += Math.sin(t * 0.83 + 1.3) * breath * 0.6;
    look.x += Math.sin(t * 0.47 + 2.1) * breath * 1.5; look.y += Math.sin(t * 0.71) * breath;
  }
  look.x += mouse.sx * 14; look.y -= mouse.sy * 8; // a touch of parallax from the pointer
  lookM.lookAt(outPos, look, up);
  outQ.setFromRotationMatrix(lookM);
  const roll = lerp(shotOf(i).roll || 0, shotOf(i + 1).roll || 0, g);
  if (roll) outQ.multiply(rollQ.setFromAxisAngle(zAxis, roll * D2R));
  rail.fov = lerp(lens(i), lens(i + 1), g);
  rail.i = k; rail.d = d;
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
    railPose(smooth, target, railQ, t);
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
    updateFilm(rail.i, rail.d);
    updateCard(dt);
    prog.style.transform = `scaleX(${smooth})`;
  }
  // each shot has its own lens; free roam goes back to the standard one
  const fov = roaming ? (mobile ? 60 : 48) : rail.fov;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * (roaming || back > 0 ? 1 - Math.exp(-dt * 4) : 1); camera.updateProjectionMatrix(); }
  // the gate opens as the journey starts; the crowd rises as the camera drops into the bowl
  const p = roaming ? 1 : smooth;
  land?.update(t);
  village?.update(t, ss(p, 0.005, (1 / N) * 0.9));
  // (on the long journey they settle again once the camera has left the stadium)
  const settle = stop('overVillage') > 0 ? ss(p, at('awards') + 0.02, at('overVillage')) : 0;
  arena?.update(t, roaming ? 0.3 : ss(p, at('rim'), at('bowl')) * (1 - settle));
  roamFade += ((roaming ? 1 : 0) - roamFade) * (1 - Math.exp(-dt * 4));
  places?.update(t, camera.position, roamFade);
  leaves?.update(t, camera.position);
  post.render(scene, camera, t);
  requestAnimationFrame(frame);
}

function resize() {
  // the world renders only inside the letterbox, so nothing in a shot is hidden under the bars
  const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.setSize(w, h);
}
window.addEventListener('resize', resize);

// ---------- go ----------
window.history.scrollRestoration = 'manual';
// for the screenshot checks: the stops by name, and a jump straight to a point of the journey
window.__rail = {
  N, names: STOPS.map((x) => x[2]),
  jump(p) { lenis?.scrollTo(p * (document.documentElement.scrollHeight - window.innerHeight), { immediate: true }); progress = smooth = p; },
};
window.scrollTo(0, 0);
build().then(() => {
  requestAnimationFrame(frame);
  // the cut opens the world
  setTimeout(() => {
    const wl = $('#wl');
    wl.classList.add('is-cut');
    document.body.classList.remove('is-loading');
    // the opening title card comes in as the halves part
    setTimeout(() => { rolling = true; }, 1000);
    setTimeout(() => wl.remove(), 1600);
  }, 250);
});
