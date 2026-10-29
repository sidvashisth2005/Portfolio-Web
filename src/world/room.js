import * as THREE from 'three';
import { toon, glow, textTexture, gradientMap } from './toon.js';
import { NOREN } from '../registry.js';

// Inside a house in the residents' quarter: a tatami room at sunset. The tokonoma alcove holds the resident's
// hanging scroll (their crest, motto and seal); the staggered shelves beside it, the stepped chest, the alcove's
// floor, the low table and the corners hold the things they keep, each as an object of its kind (a scroll, a
// blade on its stand, a bonsai...). Shoji glow on the left, fusuma painted in the resident's colour on the right,
// cushions to match, their noren over the door behind you. Its own scene, lights and camera; main.js renders it
// through the same anime pass as the village while you are inside.
const PAPER = 0xf4ecd8, CEDAR = 0x7a5238, DARKW = 0x3a2418, TATAMI_EDGE = '#2b2a22';
// where things go: [x, y, z, the most room a thing has there (m)], in the order they fill
const SLOTS = [
  [-3.7, 0.2, -3.95, 0.8], [-1.95, 0.2, -3.95, 0.75], // the alcove floor, either side of the scroll
  [-0.62, 1.27, -3.95, 0.55], [0.62, 1.57, -3.95, 0.55], // the staggered shelves
  [-0.6, 0.42, -3.9, 0.6], [0.6, 0.42, -3.9, 0.6], // the low cupboard's top
  [2.1, 0.6, -3.3, 0.75], [3.0, 1.2, -3.3, 0.75], [3.9, 1.8, -3.3, 0.75], // the stepped chest
  [0.05, 0.38, 0.05, 0.62], // the low table
  [-3.6, 0, 1.4, 0.9], [3.6, 0, 1.2, 0.9], // the front corners
];

const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
function mesh(geo, color, at, rot, opts) {
  const m = new THREE.Mesh(geo, opts?.glow ? glow(color) : toon(color, opts));
  if (at) m.position.set(...at);
  if (rot) m.rotation.set(...rot);
  return m;
}
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

// each kind of thing, about half a metre at most, standing on y = 0
const MAKE = {
  scroll(r) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.4, 14), PAPER, [0, 0.07, 0], [0, 0, Math.PI / 2]));
    [-1, 1].forEach((s) => g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), DARKW, [s * 0.23, 0.07, 0], [0, 0, Math.PI / 2])));
    g.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), 0xb8232c, [0.05, 0.07, 0], [0, Math.PI / 2, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.36, 0.02, 0.14), DARKW, [0, 0.01, 0])); // its little stand
    g.rotation.y = (r - 0.5) * 0.6;
    return g;
  },
  letter(r) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.32, 0.015, 0.2), PAPER, [0, 0.01, 0], [0, 0.3, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.015, 0.19), 0xe9dcc0, [0.03, 0.026, 0.02], [0, -0.15, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 12), 0xb8232c, [0.05, 0.04, 0.03]));
    g.rotation.y = r * 0.8;
    return g;
  },
  tag() {
    const g = new THREE.Group();
    const s = new THREE.Shape([[-0.14, 0], [0.14, 0], [0.14, 0.17], [0, 0.24], [-0.14, 0.17]].map(([x, y]) => new THREE.Vector2(x, y)));
    const p = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }), 0xd9b27a, [0, 0.05, 0], [-0.18, 0, 0]);
    g.add(p, mesh(new THREE.BoxGeometry(0.2, 0.04, 0.12), DARKW, [0, 0.02, -0.02]));
    g.add(mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), 0xb8232c, [0, 0.27, -0.03]));
    return g;
  },
  book(r) {
    const g = new THREE.Group();
    [0x2b3f6a, 0x7a3a2a, 0x3f5a3a].forEach((c, i) => {
      const y = 0.03 + i * 0.058, a = (hash(r + i) - 0.5) * 0.4;
      g.add(mesh(new THREE.BoxGeometry(0.27, 0.055, 0.2), c, [0, y, 0], [0, a, 0]));
      g.add(mesh(new THREE.BoxGeometry(0.255, 0.045, 0.205), PAPER, [0.01, y, 0], [0, a, 0]));
    });
    return g;
  },
  blade() {
    // a sword on its two-tier stand
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.14), DARKW, [0, 0.02, 0]));
    [-0.18, 0.18].forEach((x) => g.add(mesh(new THREE.BoxGeometry(0.035, 0.2, 0.1), DARKW, [x, 0.12, 0])));
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.028, 0.03), 0x15110f, [0.04, 0.2, 0], [0, 0, 0.04]));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 14), 0xc9a45c, [-0.2, 0.19, 0], [0, 0, Math.PI / 2]));
    g.add(mesh(new THREE.BoxGeometry(0.14, 0.032, 0.034), 0xefe4cf, [-0.29, 0.188, 0], [0, 0, 0.04]));
    return g;
  },
  cup() {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [0.07, 0], [0.07, 0.02], [0.03, 0.04], [0.03, 0.12], [0.11, 0.17], [0.13, 0.26], [0.12, 0.26], [0.1, 0.19], [0, 0.16]]), 0xd8a837));
    g.add(mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), DARKW, [0, -0.02, 0]));
    return g;
  },
  lantern() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.17, 0.26, 0.17), 0xffd08a, [0, 0.18, 0], null, { glow: true }));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(mesh(new THREE.BoxGeometry(0.02, 0.36, 0.02), DARKW, [a * 0.09, 0.18, b * 0.09])));
    g.add(mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), DARKW, [0, 0.36, 0]));
    return g;
  },
  plant(r) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.07, 0.2), 0x3f5f8a, [0, 0.035, 0]));
    g.add(mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.2, 6), 0x5a3a2a, [0.02, 0.15, 0], [0, 0, -0.35]));
    g.add(mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.14, 6), 0x5a3a2a, [-0.03, 0.27, 0], [0, 0, 0.6]));
    [[0.07, 0.24, 0, 0.07], [-0.09, 0.32, 0.02, 0.08], [0.0, 0.36, -0.03, 0.06]].forEach(([x, y, z, s], i) => g.add(mesh(new THREE.IcosahedronGeometry(s, 0).scale(1.4, 0.7, 1.2), [0x4f7a30, 0x5f8a3a, 0x6a9a42][i], [x, y, z])));
    g.rotation.y = r * Math.PI;
    return g;
  },
  pot(r) {
    const c = [0x2b5a6a, 0x8a3a2a, 0xd9c9a8, 0x2a2a30, 0x6a7a3a][Math.floor(r * 5)];
    return mesh(lathe([[0, 0], [0.08, 0], [0.12, 0.06], [0.14, 0.16], [0.11, 0.26], [0.06, 0.31], [0.065, 0.35], [0.055, 0.35], [0, 0.33]]), c);
  },
  box() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.12, 0.22), 0x1a1214, [0, 0.06, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.31, 0.04, 0.23), 0x8e1c22, [0, 0.13, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.32, 0.012, 0.025), 0xc9a45c, [0, 0.152, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.025, 0.012, 0.24), 0xc9a45c, [0, 0.152, 0]));
    return g;
  },
};

// the floor: tatami mats in the classic pattern, each with its black cloth border along its long sides
function tatami() {
  return textTexture((x, w, h) => {
    const s = w / 9; // pixels per metre (the floor is 9 × 7.2 m)
    x.fillStyle = '#b9a868'; x.fillRect(0, 0, w, h);
    const mat = (mx, mz, mw, md) => {
      const X = mx * s, Y = mz * s, W = mw * s, H = md * s;
      const gr = x.createLinearGradient(X, Y, X + W, Y + H);
      gr.addColorStop(0, '#cbbb7c'); gr.addColorStop(1, '#bba962');
      x.fillStyle = gr; x.fillRect(X, Y, W, H);
      x.strokeStyle = 'rgba(90,80,40,.14)'; x.lineWidth = 1;
      if (mw > md) for (let i = 2; i < H; i += 4) { x.beginPath(); x.moveTo(X, Y + i); x.lineTo(X + W, Y + i); x.stroke(); }
      else for (let i = 2; i < W; i += 4) { x.beginPath(); x.moveTo(X + i, Y); x.lineTo(X + i, Y + H); x.stroke(); }
      x.fillStyle = TATAMI_EDGE;
      if (mw > md) { x.fillRect(X, Y, W, 5); x.fillRect(X, Y + H - 5, W, 5); } else { x.fillRect(X, Y, 5, H); x.fillRect(X + W - 5, Y, 5, H); }
      x.strokeStyle = 'rgba(40,30,10,.35)'; x.lineWidth = 2; x.strokeRect(X, Y, W, H);
    };
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      const flip = (r + c) % 2;
      if (flip) mat(c * 1.8, r * 1.8, 1.8, 0.9), mat(c * 1.8, r * 1.8 + 0.9, 1.8, 0.9);
      else mat(c * 1.8, r * 1.8, 0.9, 1.8), mat(c * 1.8 + 0.9, r * 1.8, 0.9, 1.8);
    }
  }, 1152, 922);
}
// shoji: paper in a wooden grid, lit from outside by the sunset
const shoji = () => textTexture((x, w, h) => {
  const gr = x.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#ffe9c4'); gr.addColorStop(1, '#ffc98a');
  x.fillStyle = gr; x.fillRect(0, 0, w, h);
  x.fillStyle = '#5a3a28';
  for (let i = 0; i <= 4; i++) x.fillRect(i * (w - 8) / 4, 0, 8, h);
  for (let j = 0; j <= 6; j++) x.fillRect(0, j * (h - 8) / 6, w, 8);
  x.fillRect(0, h - 40, w, 40);
  // a branch's shadow falls across it
  x.strokeStyle = 'rgba(120,70,40,.25)'; x.lineWidth = 6; x.lineCap = 'round';
  x.beginPath(); x.moveTo(w * 0.1, h * 0.15); x.quadraticCurveTo(w * 0.4, h * 0.3, w * 0.9, h * 0.22); x.stroke();
  x.lineWidth = 3; [[0.3, 0.24], [0.55, 0.27], [0.75, 0.23]].forEach(([a, b]) => { x.beginPath(); x.moveTo(w * a, h * b); x.lineTo(w * (a + 0.05), h * (b + 0.12)); x.stroke(); });
}, 512, 512);

export function createRoom({ mobile }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a0e0a);
  const camera = new THREE.PerspectiveCamera(mobile ? 74 : 60, 1, 0.05, 60);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x6a4a3a, 1.25), new THREE.AmbientLight(0x6a4a4a, 0.35));
  const sunIn = new THREE.DirectionalLight(0xffcf9a, 1.6);
  sunIn.position.set(-6, 3, 1.5);
  const andon = new THREE.PointLight(0xffa860, 4, 7, 1.4);
  andon.position.set(3.9, 0.7, 2.4);
  scene.add(sunIn, andon);

  const room = new THREE.Group();
  scene.add(room);
  // floor and ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 7.2).rotateX(-Math.PI / 2), new THREE.MeshToonMaterial({ map: tatami(), gradientMap: gradientMap() }));
  room.add(floor);
  const ceilTex = textTexture((x, w, h) => {
    x.fillStyle = '#8a6a4a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'; x.fillRect(0, i * h / 18, w, h / 18); }
    x.fillStyle = '#3a2418'; for (let i = 0; i < 12; i++) x.fillRect(i * w / 12, 0, 6, h);
  }, 512, 512);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 7.2).rotateX(Math.PI / 2), new THREE.MeshToonMaterial({ map: ceilTex, gradientMap: gradientMap() }));
  ceil.position.y = 3;
  room.add(ceil);
  const wallM = toon(0xe6d7bb), postM = toon(CEDAR), darkM = toon(DARKW);
  const B = (w, h, d, m, at) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(...at); room.add(o); return o; };
  // the back wall, with the alcove and the shelves set into it
  B(9, 3, 0.2, wallM, [0, 1.5, -4.7]); // behind the alcove and shelves
  B(0.2, 3, 1.1, wallM, [-4.5, 1.5, -4.15]); B(0.2, 3, 1.1, wallM, [1.55, 1.5, -4.15]); B(0.16, 3, 0.9, wallM, [-1.25, 1.5, -4.15]);
  B(2.95, 3, 0.2, wallM, [3.0, 1.5, -3.7]);
  B(5.9, 0.6, 1.0, wallM, [-1.5, 2.7, -4.15]); // the lintel over the alcove and shelves
  B(6.1, 0.12, 0.14, postM, [-1.45, 2.4, -3.62]); // its beam (otoshigake)
  // the alcove: a raised floor of dark wood, the hanging scroll on the back wall
  B(3.1, 0.2, 0.92, toon(0x4a2c1c), [-2.85, 0.1, -4.15]);
  B(0.18, 2.4, 0.18, toon(0x8a6040), [-1.25, 1.2, -3.66]); // the alcove post (tokobashira)
  const scrollM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const scrollP = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.05), scrollM);
  scrollP.position.set(-2.85, 1.42, -4.585);
  room.add(scrollP);
  [2.47, 0.37].forEach((y) => { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.08, 8), darkM); rod.rotation.z = Math.PI / 2; rod.position.set(-2.85, y, -4.56); room.add(rod); });
  // the staggered shelves (chigaidana), a cupboard above and below
  B(2.6, 0.06, 0.6, postM, [-0.6, 1.24, -4.1]); B(1.3, 0.06, 0.6, postM, [0.65, 1.54, -4.1]); B(0.05, 0.3, 0.05, postM, [0.02, 1.4, -3.88]);
  B(2.6, 0.42, 0.62, toon(0x6a4630), [0.15, 0.21, -4.1]);
  B(2.6, 0.4, 0.62, toon(0x6a4630), [0.15, 2.2, -4.1]);
  [-0.5, 0.8].forEach((x) => B(1.2, 0.36, 0.01, toon(0xefe4cf), [x, 0.22, -3.78]));
  // the stepped chest (kaidan-dansu)
  [[2.1, 0.6], [3.0, 1.2], [3.9, 1.8]].forEach(([x, h]) => {
    B(0.9, h, 0.8, toon(0x5a3424), [x, h / 2, -3.3]);
    for (let k = 0; k < Math.round(h / 0.3); k++) B(0.8, 0.22, 0.02, toon(0x6e4430), [x, 0.15 + k * 0.3, -2.89]);
  });
  // shoji down the left, fusuma down the right
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.4), new THREE.MeshBasicMaterial({ map: shoji() }));
  sh.material.map.wrapS = THREE.RepeatWrapping; sh.material.map.repeat.set(4, 1);
  sh.rotation.y = Math.PI / 2; sh.position.set(-4.5, 1.2, 0);
  room.add(sh);
  B(0.2, 0.6, 7.2, wallM, [-4.6, 2.7, 0]);
  const fusumaCv = document.createElement('canvas');
  fusumaCv.width = 1024; fusumaCv.height = 340;
  const fusumaTex = new THREE.CanvasTexture(fusumaCv);
  fusumaTex.colorSpace = THREE.SRGBColorSpace;
  const fu = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.4), new THREE.MeshToonMaterial({ map: fusumaTex, gradientMap: gradientMap() }));
  fu.rotation.y = -Math.PI / 2; fu.position.set(4.5, 1.2, 0);
  room.add(fu);
  B(0.2, 0.6, 7.2, wallM, [4.6, 2.7, 0]);
  // the front wall behind you: the doorway you came in by, the resident's noren in it
  B(3.4, 3, 0.2, wallM, [-2.8, 1.5, 3.7]); B(3.4, 3, 0.2, wallM, [2.8, 1.5, 3.7]); B(2.2, 0.75, 0.2, wallM, [0, 2.62, 3.7]);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.25), new THREE.MeshBasicMaterial({ color: 0xff9a5a }));
  doorGlow.position.set(0, 1.12, 3.85); doorGlow.rotation.y = Math.PI; room.add(doorGlow);
  const norenCv = document.createElement('canvas');
  norenCv.width = 512; norenCv.height = 256;
  const norenTex = new THREE.CanvasTexture(norenCv);
  norenTex.colorSpace = THREE.SRGBColorSpace;
  const noren = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.05), new THREE.MeshToonMaterial({ map: norenTex, side: THREE.DoubleSide, gradientMap: gradientMap() }));
  noren.position.set(0, 1.72, 3.55); noren.rotation.y = Math.PI;
  room.add(noren);
  // posts at the corners and between the panels, a rail (nageshi) all round
  [[-4.45, -3.55], [4.45, -3.55], [-4.45, 3.55], [4.45, 3.55], [-4.45, 0], [4.45, 0]].forEach(([x, z]) => B(0.18, 3, 0.18, postM, [x, 1.5, z]));
  B(0.12, 0.14, 7.2, postM, [-4.42, 2.42, 0]); B(0.12, 0.14, 7.2, postM, [4.42, 2.42, 0]); B(9, 0.14, 0.12, postM, [0, 2.42, 3.58]);
  // the low table, a tea set, two cushions, the paper lamp
  B(1.5, 0.06, 0.95, toon(0x4a2c1c), [0.05, 0.35, 0.05]);
  [[-0.65, -0.4], [0.75, -0.4], [-0.65, 0.48], [0.75, 0.48]].forEach(([x, z]) => B(0.07, 0.32, 0.07, darkM, [x, 0.16, z]));
  const tea = toon(0x6a7a6a);
  [[0.55, 0.25], [0.35, -0.2]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.07, 10), tea); c.position.set(x, 0.415, z); room.add(c); });
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8).scale(1, 0.85, 1), toon(0x2a2a2a)); pot.position.set(0.55, 0.45, -0.15); room.add(pot);
  const cushionM = toon(0xb8232c);
  [[0.05, 1.05], [0.05, -0.95]].forEach(([x, z]) => B(0.85, 0.09, 0.85, cushionM, [x, 0.05, z]));
  B(0.36, 0.56, 0.36, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), [3.9, 0.42, 2.4]);
  B(0.42, 0.04, 0.42, darkM, [3.9, 0.72, 2.4]); B(0.42, 0.14, 0.42, darkM, [3.9, 0.07, 2.4]);
  // flowers in the alcove (ikebana) when nothing else is there
  const ikebana = new THREE.Group();
  ikebana.add(mesh(lathe([[0, 0], [0.09, 0], [0.11, 0.08], [0.07, 0.22], [0.08, 0.26], [0, 0.25]]), 0x2a3a4a));
  ikebana.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), 0x4a6a2a, [0.04, 0.45, 0], [0, 0, -0.25]));
  ikebana.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), 0xd8232c, [0.1, 0.7, 0]));
  ikebana.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), 0xf2e6c8, [-0.04, 0.55, 0.03]));
  ikebana.position.set(-2.1, 0.2, -4.0);
  room.add(ikebana);

  // ---------- the resident ----------
  const things = new THREE.Group();
  room.add(things);
  let byId = new Map();
  function paintScroll(h) {
    const tex = textTexture((x, w, hh) => {
      x.fillStyle = '#8a6a4a'; x.fillRect(0, 0, w, hh); // the mounting
      x.fillStyle = '#f6efe0'; x.fillRect(w * 0.1, hh * 0.08, w * 0.8, hh * 0.84);
      const c = NOREN[h.color] || NOREN[0];
      x.fillStyle = c; x.beginPath(); x.arc(w / 2, hh * 0.26, w * 0.28, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#f6efe0'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `${w * (graphemeCount(h.crest) > 1 && /^[\x20-\x7e]+$/.test(h.crest) ? 0.2 : 0.3)}px "Dela Gothic One", sans-serif`;
      x.fillText(h.crest || '家', w / 2, hh * 0.265);
      // the motto, in lines, then the resident's name and a red seal
      x.fillStyle = '#1a1214'; x.font = `600 ${w * 0.062}px "Archivo", sans-serif`;
      const lines = wrap(x, h.motto || '', w * 0.66).slice(0, 7);
      lines.forEach((l, i) => x.fillText(l, w / 2, hh * 0.47 + i * w * 0.085));
      x.font = `800 ${w * 0.07}px "Archivo", sans-serif`; x.fillStyle = '#3a2418';
      x.fillText(h.name, w / 2, hh * 0.82);
      x.fillStyle = '#b8232c'; x.fillRect(w * 0.62, hh * 0.86, w * 0.1, w * 0.1);
      x.fillStyle = '#f6efe0'; x.font = `${w * 0.06}px "Dela Gothic One", sans-serif`; x.fillText([...(h.crest || '印')][0], w * 0.67, hh * 0.86 + w * 0.05);
    }, 400, 864);
    scrollM.map?.dispose();
    scrollM.map = tex; scrollM.needsUpdate = true;
  }
  function paintColour(h) {
    const c = NOREN[h.color] || NOREN[0];
    cushionM.color.set(c);
    // the fusuma: gold-leaf paper with waves (seigaiha) in the resident's colour
    const x = fusumaCv.getContext('2d'), w = fusumaCv.width, hh = fusumaCv.height;
    x.fillStyle = '#e9d9a8'; x.fillRect(0, 0, w, hh);
    x.strokeStyle = c; x.globalAlpha = 0.55; x.lineWidth = 3;
    const R = 26;
    for (let row = 0; row < hh / (R * 0.5) + 2; row++) for (let i = -1; i < w / (R * 2) + 1; i++) {
      const cx = i * R * 2 + (row % 2) * R, cy = row * R * 0.5;
      for (let k = 3; k > 0; k--) { x.beginPath(); x.arc(cx, cy, (R * k) / 3, Math.PI, 0); x.stroke(); }
    }
    x.globalAlpha = 1;
    x.fillStyle = '#3a2418';
    for (let i = 0; i <= 4; i++) x.fillRect(i * (w - 10) / 4, 0, 10, hh);
    x.fillRect(0, 0, w, 10); x.fillRect(0, hh - 10, w, 10);
    [0.2, 0.45, 0.7, 0.95].forEach((f) => { x.fillStyle = '#2a1a12'; x.beginPath(); x.ellipse(w * (f - 0.1), hh * 0.5, 8, 18, 0, 0, Math.PI * 2); x.fill(); });
    fusumaTex.needsUpdate = true;
    // the noren over the door
    const n = norenCv.getContext('2d');
    n.fillStyle = c; n.fillRect(0, 0, 512, 256);
    n.fillStyle = '#1a1214'; n.fillRect(168, 0, 6, 256); n.fillRect(338, 0, 6, 256);
    n.fillStyle = '#f4efe6'; n.beginPath(); n.arc(256, 118, 82, 0, Math.PI * 2); n.fill();
    n.fillStyle = c; n.textAlign = 'center'; n.textBaseline = 'middle'; n.font = '96px "Dela Gothic One", sans-serif';
    n.save(); n.translate(512, 0); n.scale(-1, 1); n.fillText(h.crest || '', 256, 122); n.restore(); // it's seen from inside
    norenTex.needsUpdate = true;
  }
  // put the things on their places, in order
  function setHouse(h, items = []) {
    paintScroll(h); paintColour(h);
    things.children.slice().forEach((o) => { things.remove(o); o.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose?.(); } }); });
    byId = new Map();
    items.slice(0, SLOTS.length).forEach((it, i) => {
      const [x, y, z, room0] = SLOTS[i];
      const o = (MAKE[it.kind] || MAKE.box)(hash(it.id));
      const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      // things on the floor are shown bigger (and get a cushion to sit on)
      const s = Math.min(2.2, room0 / Math.max(size.x, size.z, size.y * 0.8)) * (y === 0 ? 1.3 : 1);
      o.scale.setScalar(s);
      o.position.set(x, y + (y === 0 ? 0.06 : 0), z);
      if (y === 0) { const base = mesh(new THREE.BoxGeometry(0.7, 0.06, 0.7), 0x5a3424, [x, 0.03, z]); things.add(base); }
      o.userData.item = it.id;
      o.traverse((m) => { m.userData.item = it.id; });
      things.add(o);
      byId.set(it.id, o);
    });
    ikebana.visible = items.length < 2;
  }

  // ---------- looking around ----------
  const look = { yaw: 0, pitch: -0.06, ty: 0, tp: -0.06 };
  const base = new THREE.Vector3(0, mobile ? 1.5 : 1.42, 2.45);
  let hovered = null;
  function hover(id) {
    if (hovered === id) return;
    if (hovered && byId.get(hovered)) byId.get(hovered).traverse((m) => { if (m.isMesh && m.material.emissive) m.material.emissive.setHex(0); });
    hovered = id;
    if (id && byId.get(id)) byId.get(id).traverse((m) => { if (m.isMesh && m.material.emissive) m.material.emissive.setHex(0x5a2a10); });
  }
  // turn to face a thing
  function focus(id) {
    const o = byId.get(id);
    if (!o) return;
    const p = o.getWorldPosition(new THREE.Vector3()).sub(base);
    look.ty = THREE.MathUtils.clamp(Math.atan2(-p.x, -p.z), -1.25, 1.25);
    look.tp = THREE.MathUtils.clamp(Math.atan2(p.y + 0.15, Math.hypot(p.x, p.z)), -0.6, 0.3);
  }
  const ray = new THREE.Raycaster();
  function pick(ndc) {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(things.children, true).find((h) => h.object.userData.item);
    return hit ? hit.object.userData.item : null;
  }
  const e = new THREE.Euler(0, 0, 0, 'YXZ');
  return {
    scene, camera, setHouse, pick, focus, hover,
    turn(dx, dy) { look.ty = THREE.MathUtils.clamp(look.ty - dx, -1.3, 1.3); look.tp = THREE.MathUtils.clamp(look.tp - dy, -0.65, 0.4); },
    // on the way in: the view swings round from the door to the alcove
    reset() { look.yaw = 0.5; look.ty = 0; look.pitch = look.tp = -0.06; },
    // on a wide screen the panel sits on the right: the frame shifts so the room centres in what's left of it
    resize(w, h) {
      camera.aspect = w / h;
      camera.filmOffset = w > 900 ? 0.15 * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * camera.getFilmWidth() : 0;
      camera.updateProjectionMatrix();
    },
    update(t, dt) {
      const k = 1 - Math.exp(-dt * 5);
      look.yaw += (look.ty - look.yaw) * k; look.pitch += (look.tp - look.pitch) * k;
      camera.position.copy(base);
      camera.position.x += Math.sin(t * 0.4) * 0.03; camera.position.y += Math.sin(t * 0.6) * 0.015;
      camera.quaternion.setFromEuler(e.set(look.pitch, look.yaw, 0));
      andon.intensity = 4 + Math.sin(t * 7) * 0.15 + Math.sin(t * 13) * 0.1;
    },
  };
}
function graphemeCount(s) { try { return [...new Intl.Segmenter().segment(s)].length; } catch { return [...s].length; } }
function wrap(x, text, max) {
  const out = []; let cur = '';
  for (const word of text.split(/\s+/)) {
    const t = cur ? `${cur} ${word}` : word;
    if (x.measureText(t).width > max && cur) { out.push(cur); cur = word; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
