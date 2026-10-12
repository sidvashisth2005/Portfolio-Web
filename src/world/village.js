import * as THREE from 'three';
import { rng, fbm, Bins, box, cyl, sphere, place, paint, gableRoof, gableEnd, roofTiles } from './kit.js';
import { toon, glow, textTexture, PAL } from './toon.js';
import { LAYOUT } from './land.js';

// The hidden village, laid out like the anime's: a round crimson tower at the heart, streets radiating out to the
// wall, a main street from the great gate lined with shops, lanterns and signboards, and houses that mix tiled
// gable roofs with plain stucco blocks crowned by round water tanks, all strung together by utility poles.
// Original throughout: the crest is 一閃, the kanji are the portfolio's own.
const WALLS = [0xeadcc2, 0xe2c9a2, 0xe9bf98, 0xf0e6d6, 0xbfd3c2, 0xd8b48e, 0xe6d3b0];
const ROOFS = [0xb3262e, 0xc0532e, 0x3f7f7a, 0x4a4552, 0xd9772b, 0x8e2a2a, 0x5b6b4a];
const WOOD = 0x5a3b2a, DARK = 0x2a1f22;
const SIGNS = ['修行', '大会', '光', '伝', '巻', '力', '技', '勝', '戦', '影'];

// one house, built at the origin facing +z (its street), as [material, geometry] pieces
function house(r, kind) {
  const P = [];
  const wall = WALLS[Math.floor(r() * WALLS.length)], roof = ROOFS[Math.floor(r() * ROOFS.length)];
  if (kind === 'trad') {
    const w = 9 + r() * 6, d = 8 + r() * 5, fl = r() < 0.4 ? 2 : 1, h = fl * 4.4;
    P.push(['plaster', box(w, h, d, wall, { at: [0, h / 2, 0] })]);
    P.push(['wood', box(w + 0.3, 0.9, d + 0.3, WOOD, { at: [0, 0.45, 0] })]);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => P.push(['wood', box(0.5, h, 0.5, WOOD, { at: [sx * w / 2, h / 2, sz * d / 2] })]));
    if (fl === 2) P.push(['wood', box(w + 0.4, 0.4, d + 0.4, WOOD, { at: [0, 4.4, 0] })]);
    // windows: lattice panels, some lit for the evening
    for (let f = 0; f < fl; f++) for (let i = 0; i < Math.max(1, Math.floor(w / 4.5)); i++) {
      const x = -w / 2 + (i + 0.5) * (w / Math.max(1, Math.floor(w / 4.5)));
      P.push([r() < 0.45 ? 'lit' : 'glass', box(2, 1.6, 0.2, 0x000000, { at: [x, 2.4 + f * 4.4, d / 2 + 0.08] })]);
    }
    P.push(['wood', box(2, 3, 0.3, DARK, { at: [w * 0.25, 1.5, d / 2 + 0.1] })]); // door
    const rise = 2.4 + r() * 1.4;
    gableRoof(w, d, rise, 1.4, roof).forEach((g) => P.push(['roof', place(g, { at: [0, h, 0] })]));
    [-1, 1].forEach((s) => P.push(['plaster', place(gableEnd(w, rise, 0.3, wall), { at: [0, h, s * d / 2], rot: [0, s < 0 ? Math.PI : 0, 0] })]));
    if (r() < 0.3) P.push(['tank', cyl(1.5, 1.5, 2.6, 14, 0x8a9aa6, { at: [w / 2 - 2, h + rise * 0.4 + 1.3, -d / 4] })]);
    return { P, w, d, h: h + rise };
  }
  // the stucco block: 2-4 floors, flat roof with a parapet, a round water tank on legs, a little roof hut
  const w = 10 + r() * 7, d = 9 + r() * 6, fl = 2 + Math.floor(r() * 3), h = fl * 3.8;
  P.push(['plaster', box(w, h, d, wall, { at: [0, h / 2, 0] })]);
  P.push(['plaster', box(w + 0.6, 0.9, d + 0.6, 0xd8cfc2, { at: [0, h + 0.45, 0] })]);
  P.push(['wood', box(w + 0.2, 1, d + 0.2, 0x7d6a5c, { at: [0, 0.5, 0] })]);
  for (let f = 0; f < fl; f++) {
    const n = Math.max(1, Math.floor(w / 3.6));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n);
      P.push([r() < 0.35 ? 'lit' : 'glass', box(1.8, 1.6, 0.2, 0x000000, { at: [x, 2 + f * 3.8, d / 2 + 0.08] })]);
      if (r() < 0.5) P.push([r() < 0.35 ? 'lit' : 'glass', box(0.2, 1.6, 1.8, 0x000000, { at: [w / 2 + 0.08, 2 + f * 3.8, -d / 2 + (i + 0.5) * (d / n)] })]);
    }
    // a striped awning over some ground floors
    if (f === 0 && r() < 0.35) P.push(['red', box(w * 0.6, 0.25, 2, ROOFS[Math.floor(r() * 3)], { at: [0, 3.3, d / 2 + 1], rot: [0.25, 0, 0] })]);
  }
  const tx = (r() - 0.5) * (w - 5), tz = (r() - 0.5) * (d - 5);
  P.push(['tank', cyl(1.9, 1.9, 3.2, 16, r() < 0.5 ? 0x8a9aa6 : 0xa58a6e, { at: [tx, h + 3.2, tz] })]);
  P.push(['tank', cyl(2.0, 2.0, 0.4, 16, 0x5d6870, { at: [tx, h + 4.9, tz] })]);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => P.push(['wood', box(0.25, 1.6, 0.25, DARK, { at: [tx + a * 1.2, h + 0.8, tz + b * 1.2] })]));
  if (r() < 0.5) P.push(['plaster', box(3, 2.4, 3, wall, { at: [-tx * 0.5, h + 1.2, -tz * 0.5 + 1] })]);
  if (r() < 0.5) P.push(['tank', box(1.6, 1.1, 1, 0x9aa0a6, { at: [w / 2 - 1.2, h + 1.4, d / 2 - 1] })]); // AC unit
  return { P, w, d, h: h + 5 };
}

export function buildVillage(scene, { mobile, portrait, heightAt }) {
  const g = new THREE.Group();
  scene.add(g);
  const bins = new Bins();
  const r = rng(2024);
  const colliders = []; // [x, z, radius, height] for free roam
  const updates = [];
  const lanterns = []; // [x, y, z]
  const signs = []; // [x, y, z, rotation, kanji index]
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);

  // streets: the main street from the gate, a ring road, and radial lanes
  const MAIN = 9, RADIALS = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75, Math.PI * 1.5];
  const onStreet = (x, z) => {
    const rr = Math.hypot(x, z), a = Math.atan2(z, x);
    if (z > 0 && Math.abs(x) < MAIN + 6) return true;
    if (Math.abs(rr - 150) < 9 || Math.abs(rr - 230) < 7) return true;
    if (RADIALS.some((ra) => Math.abs(Math.atan2(Math.sin(a - ra), Math.cos(a - ra))) * rr < 7)) return true;
    if (Math.abs(z - LAYOUT.riverZ) < 16) return true;
    return rr < 62;
  };
  // the main street runs from the plaza out through the gate and on into the forest
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(MAIN * 2 + 4, LAYOUT.gateZ + 420).rotateX(-Math.PI / 2), toon(0xb79a72));
  paving.position.set(0, 0.06, (LAYOUT.gateZ + 420) / 2);
  g.add(paving);
  [150, 230].forEach((rad) => { const ring = new THREE.Mesh(new THREE.RingGeometry(rad - 6, rad + 6, 160).rotateX(-Math.PI / 2), toon(0xa88e6a)); ring.position.y = 0.05; g.add(ring); });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(60, 64).rotateX(-Math.PI / 2), toon(0xc9b08a));
  plaza.position.y = 0.07;
  g.add(plaza);

  // houses on lots in rings, each turned to face the heart of the village (shops face the main street)
  const target = mobile ? 230 : 560;
  let placed = 0, tries = 0;
  const lots = [];
  while (placed < target && tries++ < target * 30) {
    const rr = 70 + Math.sqrt(r()) * 215, a = r() * Math.PI * 2;
    let x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const shop = z > 20 && Math.abs(x) < 34 && r() < 0.9;
    if (shop) x = Math.sign(x || 1) * (MAIN + 10 + r() * 4);
    if (onStreet(x, z) && !shop) continue;
    if (shop && Math.abs(z - LAYOUT.riverZ) < 22) continue;
    if (lots.some(([lx, lz, lr]) => Math.hypot(lx - x, lz - z) < lr + 8)) continue;
    const kind = shop ? (r() < 0.6 ? 'trad' : 'block') : r() < 0.5 ? 'trad' : 'block';
    const H = house(r, kind);
    const face = shop ? (x > 0 ? -Math.PI / 2 : Math.PI / 2) : Math.atan2(-x, -z);
    m4.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(up, face), new THREE.Vector3(1, 1, 1));
    bins.addAll(H.P, m4);
    const rad = Math.hypot(H.w, H.d) / 2;
    lots.push([x, z, rad]);
    colliders.push([x, z, rad * 0.85, H.h]);
    placed++;
    // shops along the main street: a hanging lantern and a vertical signboard
    if (shop) {
      const sx = x - Math.sign(x) * (H.d / 2 + 0.6);
      lanterns.push([sx, 4.6, z + (r() - 0.5) * 4]);
      signs.push([sx - Math.sign(x) * 0.4, 7.5, z + H.w * 0.3, x > 0 ? -Math.PI / 2 : Math.PI / 2, Math.floor(r() * SIGNS.length)]);
    }
  }

  // the heart: a round crimson tower with a flared tiled roof, a balcony, and the 閃 crest on its face
  const T = { r: 24, h: 30 };
  bins.add('red', cyl(T.r, T.r + 1, T.h, 48, 0xb8232c, { at: [0, T.h / 2, 0] }));
  bins.add('wood', cyl(T.r + 1.6, T.r + 1.6, 1.2, 48, 0x4a2e22, { at: [0, 0.6, 0] }));
  bins.add('plaster', cyl(T.r + 3.2, T.r + 3.2, 0.8, 48, 0xd8cfc2, { at: [0, 14, 0] })); // balcony
  for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; bins.add('wood', box(0.3, 1.6, 0.3, DARK, { at: [Math.cos(a) * (T.r + 3), 15, Math.sin(a) * (T.r + 3)] })); }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.4) continue;
    bins.add(i % 3 ? 'glass' : 'lit', box(2.6, 3, 0.4, 0x000000, { at: [Math.cos(a) * (T.r + 0.6), 21, Math.sin(a) * (T.r + 0.6)], rot: [0, -a + Math.PI / 2, 0] }));
  }
  // flared roof turned on a lathe: upswept eaves, a steep cap
  const roofProf = [[0.01, 13], [6, 12.4], [14, 9.4], [22, 5.6], [28, 2.2], [31.5, 0.6], [32.5, 1.4], [32.8, 0]].map(([x, y]) => new THREE.Vector2(x, y));
  const rl = new THREE.LatheGeometry(roofProf, 48);
  const ruv = rl.attributes.uv; for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) * 60, ruv.getY(i) * 22);
  bins.add('roof', place(paint(rl, 0x7a1d24), { at: [0, T.h, 0] }));
  bins.add('plaster', cyl(3.5, 4.5, 4, 16, 0xd8cfc2, { at: [0, T.h + 14, 0] }));
  bins.add('roof', place(paint(new THREE.ConeGeometry(5.5, 3.5, 16), 0x7a1d24), { at: [0, T.h + 17.6, 0] }));
  colliders.push([0, 0, T.r + 4, T.h + 20]);
  const crestTex = textTexture((x, w, h) => {
    x.fillStyle = '#f4ead8'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#b8232c'; x.lineWidth = w * 0.035; x.beginPath(); x.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#b8232c'; x.font = `${w * 0.56}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('閃', w / 2, h * 0.54);
  }, 512, 512);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(7.5, 48), new THREE.MeshBasicMaterial({ map: crestTex, fog: true }));
  crest.position.set(0, 21, T.r + 1.2);
  g.add(crest);
  // a long banner down the tower
  const banner = textTexture((x, w, h) => {
    x.fillStyle = '#1a0a0e'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#e0182d'; x.fillRect(w * 0.08, 0, w * 0.84, h);
    x.fillStyle = '#fff'; x.font = `${w * 0.62}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['作', 'る', '戦', '略', '家'].forEach((ch, i) => x.fillText(ch, w / 2, h * (0.12 + i * 0.19)));
  }, 128, 640);
  [-1, 1].forEach((s) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 17), new THREE.MeshBasicMaterial({ map: banner, fog: true, side: THREE.DoubleSide }));
    const a = Math.PI / 2 + s * 0.55;
    b.position.set(Math.cos(a) * (T.r + 1.4), 21, Math.sin(a) * (T.r + 1.4));
    b.rotation.y = -a + Math.PI / 2;
    g.add(b);
  });

  // the great gate: two timber pillars under a tiled roof, doors that swing open as you arrive
  const GZ = LAYOUT.gateZ;
  [-1, 1].forEach((s) => {
    bins.add('wood', box(6, 30, 6, 0x5a3424, { at: [s * 17, 15, GZ] }));
    bins.add('stone', box(8, 3, 8, 0x7f6f66, { at: [s * 17, 1.5, GZ] }));
    // watch towers flanking the gate
    bins.add('plaster', box(12, 22, 10, 0xe9dcc6, { at: [s * 29, 11, GZ - 2] }));
    const m = new THREE.Matrix4().makeTranslation(s * 29, 22, GZ - 2);
    bins.addAll(gableRoof(12, 10, 3.2, 1.6, 0x4a4552).map((p) => ['roof', p]), m);
  });
  bins.add('wood', box(42, 3, 7, 0x4a2e22, { at: [0, 30, GZ] }));
  bins.add('wood', box(38, 1.4, 6, 0x5a3424, { at: [0, 26.5, GZ] }));
  // the ridge runs across the gate
  bins.addAll(gableRoof(9, 42, 5, 2.6, 0x3a3540).map((p) => ['roof', p]), new THREE.Matrix4().compose(new THREE.Vector3(0, 31.5, GZ), new THREE.Quaternion().setFromAxisAngle(up, Math.PI / 2), new THREE.Vector3(1, 1, 1)));
  colliders.push([-17, GZ, 5, 32], [17, GZ, 5, 32], [-29, GZ - 2, 8, 26], [29, GZ - 2, 8, 26]);
  const plaque = textTexture((x, w, h) => {
    x.fillStyle = '#2a1410'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#c9a45c'; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24);
    x.fillStyle = '#f4ead8'; x.font = `${h * 0.62}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('一閃', w / 2, h * 0.54);
  }, 512, 220);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.7), new THREE.MeshBasicMaterial({ map: plaque, fog: true }));
  pl.position.set(0, 28.6, GZ + 3.6);
  g.add(pl);
  [-1, 1].forEach((s) => {
    lanterns.push([s * 10, 23.6, GZ + 4.4]);
    bins.add('wood', box(0.15, 1.6, 0.15, DARK, { at: [s * 10, 25.4, GZ + 4.4] }));
  });
  const doorTex = textTexture((x, w, h) => {
    x.fillStyle = '#6b3a26'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 8; i++) x.fillRect(i * w / 8, 0, 3, h);
    x.strokeStyle = '#2a1410'; x.lineWidth = 10; x.strokeRect(10, 10, w - 20, h - 20);
    x.strokeStyle = '#a3202a'; x.fillStyle = '#a3202a'; x.lineWidth = w * 0.035;
    x.beginPath(); x.arc(w / 2, h * 0.4, w * 0.24, 0, Math.PI * 2); x.stroke();
    x.font = `${w * 0.26}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('閃', w / 2, h * 0.41);
  }, 256, 512);
  const doors = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 14, 0, GZ + 3.1);
    const dm = new THREE.Mesh(new THREE.BoxGeometry(14, 25, 1), [toon(0x5a3424), toon(0x5a3424), toon(0x5a3424), toon(0x5a3424), new THREE.MeshToonMaterial({ map: doorTex }), toon(0x5a3424)]);
    dm.position.set(-s * 7, 12.5, 0);
    pivot.add(dm);
    g.add(pivot);
    return { pivot, s };
  });
  // the portrait, hung on the gate as a long scroll (kakejiku): paper, the ink portrait, and 作る戦略家
  const scroll = new THREE.Group();
  scroll.position.set(-23.5, 0, GZ + 4.2);
  g.add(scroll);
  scroll.add(new THREE.Mesh(new THREE.PlaneGeometry(9.6, 23), toon(0xefe4cf)));
  scroll.children[0].position.y = 15;
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(8, 9.6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }));
  pm.position.set(0, 19.2, 0.02);
  scroll.add(pm);
  portrait.then((t) => { pm.material.map = t; pm.material.needsUpdate = true; }, () => {});
  const sTex = textTexture((x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = '#b8232c'; x.font = `${w * 0.62}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['作', 'る', '戦', '略', '家'].forEach((ch, i) => x.fillText(ch, w / 2, h * (0.1 + i * 0.2)));
  }, 128, 640);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 10), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, fog: true }));
  st.position.set(0, 8.7, 0.02);
  scroll.add(st);
  [26.6, 3.4].forEach((y) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 11, 10), toon(0x3a2418));
    rod.position.set(0, y, 0.2);
    rod.rotation.z = Math.PI / 2;
    scroll.add(rod);
  });

  // utility poles down the main street and around the ring, with sagging wires between them
  const poles = [];
  for (let z = GZ - 20; z > 70; z -= 26) [-1, 1].forEach((s) => poles.push([s * (MAIN + 2.5), z]));
  for (let i = 0; i < (mobile ? 24 : 40); i++) { const a = (i / (mobile ? 24 : 40)) * Math.PI * 2; poles.push([Math.cos(a) * 158, Math.sin(a) * 158]); }
  poles.forEach(([x, z]) => {
    bins.add('wood', cyl(0.3, 0.4, 13, 6, 0x4a3a30, { at: [x, 6.5, z] }));
    bins.add('wood', box(3.4, 0.3, 0.3, 0x4a3a30, { at: [x, 12, z], rot: [0, Math.atan2(x, z), 0] }));
  });
  const wire = [];
  const sag = (a, b) => {
    const N = 10;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const p = (t) => [a[0] + (b[0] - a[0]) * t, 11.6 - Math.sin(t * Math.PI) * 1.6, a[1] + (b[1] - a[1]) * t];
      wire.push(...p(t0), ...p(t1));
    }
  };
  for (let i = 0; i + 2 < poles.length; i++) {
    const a = poles[i], b = poles[i + 2];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 60) sag(a, b);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  g.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x1a1214 })));

  // paper lanterns: red with a warm glow, hung at shops and strung over the main street
  for (let z = GZ - 14; z > 70; z -= 9) lanterns.push([(r() - 0.5) * 6, 10.4 - Math.sin(((z % 26) / 26) * Math.PI) * 1.2, z]);
  const sc = new THREE.Vector3();
  const lsize = (y) => (y > 20 ? 2.6 : 1); // the gate's pair are huge
  const lg = new THREE.InstancedMesh(new THREE.SphereGeometry(0.85, 12, 8).scale(1, 1.15, 1), glow(0xff5a3a), lanterns.length);
  lanterns.forEach(([x, y, z], i) => { m4.compose(new THREE.Vector3(x, y, z), q.identity(), sc.setScalar(lsize(y))); lg.setMatrixAt(i, m4); });
  g.add(lg);
  const lc = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 8), toon(0x1a1214), lanterns.length * 2);
  lanterns.forEach(([x, y, z], i) => {
    const k = lsize(y);
    m4.compose(new THREE.Vector3(x, y + 0.95 * k, z), q.identity(), sc.setScalar(k)); lc.setMatrixAt(i * 2, m4);
    m4.compose(new THREE.Vector3(x, y - 0.95 * k, z), q.identity(), sc.setScalar(k)); lc.setMatrixAt(i * 2 + 1, m4);
  });
  g.add(lc);

  // signboards: one shared texture of the kanji, each board showing its own cell
  const atlas = textTexture((x, w, h) => {
    const cw = w / SIGNS.length;
    SIGNS.forEach((s, i) => {
      x.fillStyle = i % 3 === 0 ? '#1a1214' : i % 3 === 1 ? '#f0e6d6' : '#b8232c';
      x.fillRect(i * cw, 0, cw, h);
      x.strokeStyle = '#3a2418'; x.lineWidth = 8; x.strokeRect(i * cw + 4, 4, cw - 8, h - 8);
      x.fillStyle = i % 3 === 1 ? '#1a1214' : '#fff';
      x.font = `${cw * 0.62}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      [...s].forEach((ch, k, arr) => x.fillText(ch, i * cw + cw / 2, h * (arr.length === 1 ? 0.5 : 0.3 + k * 0.4)));
    });
  }, 1280, 384);
  signs.forEach(([x, y, z, ry, k]) => {
    const geo = new THREE.PlaneGeometry(2, 6);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / SIGNS.length);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: atlas, fog: true, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    g.add(m);
  });

  const mats = {
    plaster: toon(0xffffff, { vertexColors: true }), wood: toon(0xffffff, { vertexColors: true }), stone: toon(0xffffff, { vertexColors: true }),
    red: toon(0xffffff, { vertexColors: true }), tank: toon(0xffffff, { vertexColors: true }), roof: toon(0xffffff, { vertexColors: true, map: roofTiles() }),
    glass: toon(0x2a2430), lit: glow(0xffc070),
  };
  bins.build(mats, g);

  return {
    group: g,
    colliders,
    // open: 0..1, the gate's doors swinging inward as the journey begins
    update(t, open) { doors.forEach(({ pivot, s }) => { pivot.rotation.y = -s * open * 1.6; }); updates.forEach((f) => f(t)); },
  };
}
