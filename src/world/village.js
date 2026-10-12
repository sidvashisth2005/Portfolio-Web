import * as THREE from 'three';
import { rng, fbm, Bins, box, cyl, sphere, place, paint, gableRoof, gableEnd, roofTiles } from './kit.js';
import { toon, glow, textTexture, PAL } from './toon.js';
import { LAYOUT, reserved } from './land.js';

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
  if (kind === 'apt') {
    // the mid-rise: 3-5 floors, balconies on the street side, a zigzag stair climbing the outside wall
    const w = 12 + r() * 6, d = 10 + r() * 4, fl = 3 + Math.floor(r() * 3), fh = 3.6, h = fl * fh;
    P.push(['plaster', box(w, h, d, wall, { at: [0, h / 2, 0] })]);
    P.push(['plaster', box(w + 0.6, 1, d + 0.6, 0xd8cfc2, { at: [0, h + 0.5, 0] })]);
    P.push(['wood', box(w + 0.2, 1, d + 0.2, 0x7d6a5c, { at: [0, 0.5, 0] })]);
    for (let f = 0; f < fl; f++) {
      const n = Math.max(2, Math.floor(w / 3.4));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (i + 0.5) * (w / n);
        P.push([r() < 0.38 ? 'lit' : 'glass', box(1.6, 1.6, 0.2, 0x000000, { at: [x, 1.9 + f * fh, d / 2 + 0.08] })]);
        if (i < 3) P.push([r() < 0.3 ? 'lit' : 'glass', box(0.2, 1.6, 1.6, 0x000000, { at: [-w / 2 - 0.08, 1.9 + f * fh, -d / 2 + (i + 0.7) * (d / 3.2)] })]);
      }
      if (f > 0) {
        P.push(['plaster', box(w * 0.56, 0.35, 1.7, 0xd8cfc2, { at: [-w * 0.12, f * fh, d / 2 + 0.85] })]);
        P.push(['wood', box(w * 0.56, 1, 0.14, DARK, { at: [-w * 0.12, f * fh + 0.65, d / 2 + 1.65] })]);
      }
    }
    // the outside stair: a flight per floor, alternating direction, with a landing at each floor
    const run = d * 0.7, ang = Math.atan2(fh, run);
    for (let f = 0; f < fl - 1; f++) {
      const dir = f % 2 ? 1 : -1;
      P.push(['wood', box(1.5, 0.3, Math.hypot(run, fh), 0x6b5a50, { at: [w / 2 + 1, f * fh + fh / 2 + 0.2, 0], rot: [dir * ang, 0, 0] })]);
      P.push(['wood', box(1.6, 0.3, 1.8, 0x6b5a50, { at: [w / 2 + 1, (f + 1) * fh + 0.2, -dir * (run / 2 + 0.6)] })]);
      P.push(['wood', box(0.12, 1, Math.hypot(run, fh), DARK, { at: [w / 2 + 1.75, f * fh + fh / 2 + 0.9, 0], rot: [dir * ang, 0, 0] })]);
    }
    const tx = (r() - 0.5) * (w - 6), tz = (r() - 0.5) * (d - 6);
    [0, 1].forEach((k) => {
      if (k && r() < 0.5) return;
      const ox = tx + k * 4.2;
      P.push(['tank', cyl(1.7, 1.7, 3, 16, k ? 0xa58a6e : 0x8a9aa6, { at: [ox, h + 3.1, tz] })]);
      P.push(['tank', cyl(1.8, 1.8, 0.35, 16, 0x5d6870, { at: [ox, h + 4.7, tz] })]);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => P.push(['wood', box(0.22, 1.6, 0.22, DARK, { at: [ox + a * 1.1, h + 0.8, tz + b * 1.1] })]));
    });
    if (r() < 0.6) P.push(['plaster', box(3.2, 2.6, 3.2, wall, { at: [-w / 2 + 2.4, h + 1.3, -d / 2 + 2.4] })]);
    return { P, w: w + 2.6, d, h: h + 5 };
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
    return rr < 62 || reserved(x, z);
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
  const target = mobile ? 300 : 880;
  let placed = 0, tries = 0;
  const lots = [];
  while (placed < target && tries++ < target * 30) {
    const rr = 70 + Math.sqrt(r()) * 215, a = r() * Math.PI * 2;
    let x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const shop = z > 20 && Math.abs(x) < 34 && r() < 0.9;
    if (shop) x = Math.sign(x || 1) * (MAIN + 10 + r() * 4);
    if (onStreet(x, z) && !shop) continue;
    if (shop && Math.abs(z - LAYOUT.riverZ) < 22) continue;
    if (lots.some(([lx, lz, lr]) => Math.hypot(lx - x, lz - z) < lr + 4.5)) continue;
    const k0 = r(), core = rr < 135; // the heart of the village builds up; the edges stay low and traditional
    const kind = shop ? (k0 < 0.55 ? 'trad' : 'block') : core ? (k0 < 0.42 ? 'apt' : k0 < 0.78 ? 'block' : 'trad') : (k0 < 0.48 ? 'trad' : k0 < 0.8 ? 'block' : 'apt');
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

  // the heart: the village's headquarters, in the anime's manner. A broad round orange-red hall of three floors
  // under an overhanging rim and a flat roof; a smaller drum rising from the roof; the village crest on a great
  // white disc standing on the roof's front edge; an entrance porch at its foot and two wings behind it.
  const T = { r: 24, h: 24, base: 2 };
  const HQ = 0xc4432a, RIM = 0x7a2418, HQ2 = 0xe2c9a2;
  const top = T.base + T.h;
  bins.add('stone', cyl(30, 31, 2, 64, 0x9a8e84, { at: [0, 1, 0] }));
  [0, 1, 2].forEach((k) => bins.add('stone', box(16 - k * 2, 0.7, 4, 0xb3a492, { at: [0, 0.35 + k * 0.7, 32 - k * 2] })));
  bins.add('red', cyl(T.r, T.r, T.h, 64, HQ, { at: [0, T.base + T.h / 2, 0] }));
  [10, 18].forEach((y) => bins.add('red', cyl(T.r + 0.3, T.r + 0.3, 0.7, 64, RIM, { at: [0, y, 0] })));
  // three rows of windows round the drum (the porch takes the front of the ground floor)
  [6, 14, 22].forEach((y, row) => {
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + (row % 2) * 0.1;
      if (row === 0 && Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.42) continue;
      bins.add((i + row) % 4 ? 'glass' : 'lit', box(2.4, 2.8, 0.4, 0x000000, { at: [Math.cos(a) * (T.r + 0.1), y, Math.sin(a) * (T.r + 0.1)], rot: [0, Math.PI / 2 - a, 0] }));
    }
  });
  // the overhanging rim, the parapet and the roof deck
  bins.add('red', cyl(T.r + 1.8, T.r + 1.2, 1.6, 64, RIM, { at: [0, top + 0.8, 0] }));
  bins.add('red', cyl(T.r + 1.2, T.r + 1.2, 1.8, 64, HQ, { at: [0, top + 2.5, 0] }));
  bins.add('stone', cyl(T.r + 0.6, T.r + 0.6, 0.3, 64, 0x6a5e58, { at: [0, top + 3.3, 0] }));
  // the upper drum and its own rim and roof, with a little hut, a water tank and a mast
  bins.add('red', cyl(11, 11, 7, 48, HQ, { at: [0, top + 3.4 + 3.5, -2] }));
  bins.add('red', cyl(12.2, 11.4, 1.2, 48, RIM, { at: [0, top + 11, -2] }));
  bins.add('stone', cyl(11.6, 11.6, 0.4, 48, 0x6a5e58, { at: [0, top + 11.7, -2] }));
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; bins.add(i % 3 ? 'glass' : 'lit', box(1.8, 2, 0.4, 0x000000, { at: [Math.cos(a) * 11.1, top + 7.6, -2 + Math.sin(a) * 11.1], rot: [0, Math.PI / 2 - a, 0] })); }
  bins.add('plaster', box(5, 3, 4, HQ2, { at: [-4, top + 13.4, -4] }));
  bins.add('tank', cyl(1.8, 1.8, 3, 16, 0x8a9aa6, { at: [4, top + 14.6, -5] }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a2, b2]) => bins.add('wood', box(0.25, 1.4, 0.25, DARK, { at: [4 + a2 * 1.1, top + 12.6, -5 + b2 * 1.1] })));
  bins.add('wood', cyl(0.15, 0.2, 9, 6, DARK, { at: [0, top + 16.4, -9] }));
  // the entrance porch with its signboard
  bins.add('plaster', box(13, 7, 7, HQ2, { at: [0, T.base + 3.5, T.r + 1.6] }));
  bins.add('red', box(15, 0.9, 9, RIM, { at: [0, T.base + 7.4, T.r + 2] }));
  bins.add('wood', box(4.4, 5, 0.3, 0x3a2418, { at: [0, T.base + 2.5, T.r + 5.2] }));
  // two wings behind, three floors each, flat roofs with tanks
  [-1, 1].forEach((k) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(k * 27, 0, -15), new THREE.Quaternion().setFromAxisAngle(up, k * 0.55), new THREE.Vector3(1, 1, 1));
    const P = [['plaster', box(18, 15, 16, HQ2, { at: [0, 7.5, 0] })], ['plaster', box(18.8, 0.9, 16.8, 0xd8cfc2, { at: [0, 15.45, 0] })], ['wood', box(18.2, 1, 16.2, 0x7d6a5c, { at: [0, 0.5, 0] })],
      ['tank', cyl(1.8, 1.8, 3, 16, 0xa58a6e, { at: [k * 4, 17.6, 2] })]];
    for (let f = 0; f < 3; f++) for (let i = 0; i < 4; i++) P.push([(f + i) % 3 ? 'glass' : 'lit', box(2.2, 1.8, 0.2, 0x000000, { at: [-6.6 + i * 4.4, 3 + f * 4.4, 8.1] })]);
    bins.addAll(P, m);
    colliders.push([k * 27, -15, 12, 19]);
  });
  colliders.push([0, 0, T.r + 3, top + 20]);
  // the crest: a great white disc on the roof's front edge, framed and propped from behind
  const crestTex = textTexture((x, w, h) => {
    x.fillStyle = '#f4ead8'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#b8232c'; x.lineWidth = w * 0.035; x.beginPath(); x.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#b8232c'; x.font = `${w * 0.56}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('閃', w / 2, h * 0.54);
  }, 512, 512);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(7.6, 64), new THREE.MeshBasicMaterial({ map: crestTex, fog: true }));
  crest.position.set(0, top + 11.6, T.r - 2.4);
  g.add(crest);
  bins.add('red', cyl(8.2, 8.2, 0.8, 64, RIM, { at: [0, top + 11.6, T.r - 2.95], rot: [Math.PI / 2, 0, 0] }));
  [-4.5, 4.5].forEach((x) => bins.add('wood', box(0.6, 6, 0.6, DARK, { at: [x, top + 4.6, T.r - 3.6] })));
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
    b.position.set(Math.cos(a) * (T.r + 0.5), 14.5, Math.sin(a) * (T.r + 0.5));
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
  for (let i = 0; i < (mobile ? 32 : 56); i++) { const a = (i / (mobile ? 32 : 56)) * Math.PI * 2; poles.push([Math.cos(a) * 237, Math.sin(a) * 237]); }
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

  // strings of festival flags across the main street
  const flags = [];
  for (let z = GZ - 30; z > 80; z -= 23) for (let i = 0; i < 11; i++) { const t = i / 10; flags.push([-MAIN - 2 + t * (MAIN * 2 + 4), 9.6 - Math.sin(t * Math.PI) * 1.4, z + ((i * 7) % 3) * 0.01]); }
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.7, 0, 0, 0.7, 0, 0, 0, -1.4, 0], 3));
  tri.computeVertexNormals();
  const fl = new THREE.InstancedMesh(tri, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true }), flags.length);
  const FLAG = [0xe0182d, 0xf4ead8, 0xffd60a, 0x3f7f7a];
  flags.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); fl.setMatrixAt(i, m4); fl.setColorAt(i, new THREE.Color(FLAG[i % 4])); });
  fl.instanceColor.needsUpdate = true;
  g.add(fl);
  const fw = [];
  for (let z = GZ - 30; z > 80; z -= 23) for (let i = 0; i < 10; i++) { const t0 = i / 10, t1 = (i + 1) / 10; fw.push(-MAIN - 2 + t0 * (MAIN * 2 + 4), 9.6 - Math.sin(t0 * Math.PI) * 1.4, z, -MAIN - 2 + t1 * (MAIN * 2 + 4), 9.6 - Math.sin(t1 * Math.PI) * 1.4, z); }
  const fwg = new THREE.BufferGeometry();
  fwg.setAttribute('position', new THREE.Float32BufferAttribute(fw, 3));
  g.add(new THREE.LineSegments(fwg, new THREE.LineBasicMaterial({ color: 0x1a1214 })));

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
