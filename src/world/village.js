import * as THREE from 'three';
import { rng, fbm, Bins, box, cyl, sphere, place, paint, gableRoof, gableEnd, roofTiles } from './kit.js';
import { toon, glow, textTexture, PAL } from './toon.js';
import { LAYOUT, reserved } from './land.js';

// The hidden village, laid out like the anime's: a round crimson tower at the heart, streets radiating out to the
// wall, a main street from the great gate lined with shops, lanterns and signboards, and houses that mix tiled
// gable roofs with plain stucco blocks crowned by round water tanks, all strung together by utility poles.
// Original throughout: the crest is 一閃, the kanji are the portfolio's own.
const WALLS = [0xeadcc2, 0xe2c9a2, 0xe9bf98, 0xf0e6d6, 0xbfd3c2, 0xd8b48e, 0xe6d3b0];
const ROOFS = [0xb3262e, 0xc0532e, 0x3f7f7a, 0x4a4552, 0xd9772b, 0x8e2a2a, 0x5b6b4a, 0xd9b25a, 0x3f6fae, 0x3f6fae];
const WOOD = 0x5a3b2a, DARK = 0x2a1f22;
// round towers with blue cone roofs: [angle, radius] round the plaza (kept clear of houses)
const CONE_TOWERS = [[2.6, 122], [0.45, 128], [-1.1, 118], [2.0, 200]];
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
    if (CONE_TOWERS.some(([ta, tr]) => Math.hypot(x - Math.cos(ta) * tr, z - Math.sin(ta) * tr) < 20)) return true;
    return rr < 92 || reserved(x, z); // the headquarters' plaza
  };
  // the main street runs from the plaza out through the gate and on into the forest
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(MAIN * 2 + 4, LAYOUT.gateZ + 420).rotateX(-Math.PI / 2), toon(0xb79a72));
  paving.position.set(0, 0.06, (LAYOUT.gateZ + 420) / 2);
  g.add(paving);
  [150, 230].forEach((rad) => { const ring = new THREE.Mesh(new THREE.RingGeometry(rad - 6, rad + 6, 160).rotateX(-Math.PI / 2), toon(0xa88e6a)); ring.position.y = 0.05; g.add(ring); });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(88, 72).rotateX(-Math.PI / 2), toon(0xc9b08a));
  plaza.position.y = 0.07;
  g.add(plaza);

  // houses on lots in rings, each turned to face the heart of the village (shops face the main street)
  const target = mobile ? 300 : 880;
  let placed = 0, tries = 0;
  const lots = [];
  while (placed < target && tries++ < target * 30) {
    const rr = 96 + Math.sqrt(r()) * 192, a = r() * Math.PI * 2;
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

  // the heart: the village's headquarters, the biggest thing in the valley, built in the anime's manner as a
  // stack of round tiers: a grey stone base, a wide straw-gold skirt roof, the orange-red hall, a second skirt, the
  // upper drum under an overhanging rim, and the village crest on a great white disc on the roof's front edge,
  // flanked by two white horns. Two lower round wings with their own skirts stand behind it.
  const HQS = 1.6; // everything below is built at 1:1 and scaled up as one piece
  const HQ = 0xd44a2c, RIM = 0x7a2418, GOLD = 0xe2b75e, BASEC = 0xb8afa4, WHITE = 0xf2ece2;
  const H = [];
  const ring = (r0, r1, h, y, color, key = 'red') => H.push([key, cyl(r1, r0, h, 72, color, { at: [0, y + h / 2, 0] })]);
  const windowsRound = (rad, y, n, skipFront, w = 2.4, h = 2.6) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (skipFront && Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < skipFront) continue;
      H.push([(i * 7) % 5 ? 'glass' : 'lit', box(w, h, 0.4, 0x000000, { at: [Math.cos(a) * (rad + 0.1), y, Math.sin(a) * (rad + 0.1)], rot: [0, Math.PI / 2 - a, 0] })]);
    }
  };
  H.push(['stone', cyl(35, 36, 2, 72, 0x9a8e84, { at: [0, 1, 0] })]);
  [0, 1, 2, 3].forEach((k) => H.push(['stone', box(18 - k * 2, 0.7, 4, 0xb3a492, { at: [0, 0.35 + k * 0.7, 38 - k * 2] })]));
  // 1 · the grey stone base with the entrance
  ring(31, 31, 7, 2, BASEC, 'stone');
  windowsRound(31, 5.4, 36, 0.3, 1.8, 1.8);
  H.push(['wood', box(7, 5.6, 0.6, 0x2a1f22, { at: [0, 4.8, 31] })]);
  H.push(['stone', box(11, 1, 3.4, 0x8d847c, { at: [0, 8.2, 31.6] })]);
  // 2 · the first skirt roof, wide and gold
  H.push(['roof', cyl(25.5, 33.5, 4, 72, GOLD, { at: [0, 11, 0] })]);
  // 3 · the orange-red hall
  ring(25, 25, 11, 12.6, HQ);
  ring(25.3, 25.3, 0.6, 18.6, RIM);
  windowsRound(25, 16, 30, 0);
  windowsRound(25, 21.4, 30, 0);
  // 4 · the second skirt
  H.push(['roof', cyl(20, 27.5, 3.6, 72, GOLD, { at: [0, 25.2, 0] })]);
  // 5 · the upper drum, its rim and roof deck
  ring(19.5, 19.5, 9, 26.6, HQ);
  windowsRound(19.5, 31, 24, 0.5);
  H.push(['red', cyl(21.2, 20.2, 1.6, 72, RIM, { at: [0, 36.4, 0] })]);
  H.push(['stone', cyl(19.6, 19.6, 0.4, 72, 0x6a5e58, { at: [0, 37.3, 0] })]);
  H.push(['plaster', box(5, 3, 4, WHITE, { at: [-6, 38.9, -8] })]);
  H.push(['tank', cyl(1.8, 1.8, 3, 16, 0x8a9aa6, { at: [6, 39.6, -9] })]);
  // 6 · two white horns rising either side of the crest
  [-1, 1].forEach((k) => {
    const horn = new THREE.CylinderGeometry(0.25, 1.4, 11, 10, 6);
    const hp = horn.attributes.position;
    for (let i = 0; i < hp.count; i++) { const t = (hp.getY(i) + 5.5) / 11; hp.setX(i, hp.getX(i) + k * t * t * 3.2); }
    horn.computeVertexNormals();
    H.push(['plaster', place(paint(horn, WHITE), { at: [k * 11.5, 42.8, 14.5] })]);
  });
  // 7 · the wings: lower round halls behind, each with a gold skirt and a red cap
  [-1, 1].forEach((k) => {
    const wx = k * 33, wz = -8;
    H.push(['stone', cyl(16, 16.5, 2, 48, 0x9a8e84, { at: [wx, 1, wz] })]);
    H.push(['red', cyl(14, 14, 10, 48, HQ, { at: [wx, 7, wz] })]);
    H.push(['roof', cyl(11.5, 17, 3.2, 48, GOLD, { at: [wx, 13.6, wz] })]);
    H.push(['red', cyl(11, 11, 4, 48, HQ, { at: [wx, 17.2, wz] })]);
    H.push(['red', cyl(12, 11.2, 1.2, 48, RIM, { at: [wx, 19.6, wz] })]);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      H.push([i % 3 ? 'glass' : 'lit', box(2, 2.4, 0.4, 0x000000, { at: [wx + Math.cos(a) * 14.1, 7.4, wz + Math.sin(a) * 14.1], rot: [0, Math.PI / 2 - a, 0] })]);
    }
  });
  bins.addAll(H, new THREE.Matrix4().makeScale(HQS, HQS, HQS));
  colliders.push([0, 0, 34 * HQS, 50 * HQS], [-33 * HQS, -8 * HQS, 17 * HQS, 21 * HQS], [33 * HQS, -8 * HQS, 17 * HQS, 21 * HQS]);
  const hq = new THREE.Group(); // the painted parts, scaled with the rest
  hq.scale.setScalar(HQS);
  g.add(hq);
  // the crest on its great white disc, framed and propped on the roof's front edge
  const crestTex = textTexture((x, w, h) => {
    x.fillStyle = '#f4ead8'; x.beginPath(); x.arc(w / 2, h / 2, w * 0.48, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#b8232c'; x.lineWidth = w * 0.035; x.beginPath(); x.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#b8232c'; x.font = `${w * 0.56}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('閃', w / 2, h * 0.54);
  }, 512, 512);
  const crest = new THREE.Mesh(new THREE.CircleGeometry(7.6, 64), new THREE.MeshBasicMaterial({ map: crestTex, fog: true }));
  crest.position.set(0, 45.6, 17.4);
  hq.add(crest);
  const crestBack = new THREE.Mesh(new THREE.CylinderGeometry(8.3, 8.3, 0.9, 64), toon(RIM));
  crestBack.rotation.x = Math.PI / 2;
  crestBack.position.set(0, 45.6, 16.85);
  hq.add(crestBack);
  [-4.6, 4.6].forEach((x) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6, 0.7), toon(DARK)); post.position.set(x, 39.6, 16.2); hq.add(post); });
  // long banners down the hall, either side of the entrance
  const banner = textTexture((x, w, h) => {
    x.fillStyle = '#1a0a0e'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#e0182d'; x.fillRect(w * 0.08, 0, w * 0.84, h);
    x.fillStyle = '#fff'; x.font = `${w * 0.62}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['作', 'る', '戦', '略', '家'].forEach((ch, i) => x.fillText(ch, w / 2, h * (0.12 + i * 0.19)));
  }, 128, 640);
  [-1, 1].forEach((k) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 10), new THREE.MeshBasicMaterial({ map: banner, fog: true, side: THREE.DoubleSide }));
    const a = Math.PI / 2 + k * 0.42;
    b.position.set(Math.cos(a) * 25.4, 18.4, Math.sin(a) * 25.4);
    b.rotation.y = Math.PI / 2 - a;
    hq.add(b);
  });

  // round towers with tall blue cone roofs, landmarks round the plaza
  CONE_TOWERS.forEach(([a, rr]) => {
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const T = [];
    T.push(['plaster', cyl(7, 7.4, 18, 24, 0xefe6d6, { at: [0, 9, 0] })]);
    T.push(['wood', cyl(7.6, 7.6, 1, 24, 0x7d6a5c, { at: [0, 0.5, 0] })]);
    T.push(['wood', cyl(7.3, 7.3, 0.6, 24, 0x6b4630, { at: [0, 9.4, 0] })]);
    for (let i = 0; i < 10; i++) { const b = (i / 10) * Math.PI * 2; T.push([i % 3 ? 'glass' : 'lit', box(1.6, 2.2, 0.3, 0x000000, { at: [Math.cos(b) * 7.1, 13.6, Math.sin(b) * 7.1], rot: [0, Math.PI / 2 - b, 0] })]); }
    const cone = new THREE.ConeGeometry(9.4, 15, 24, 1, true);
    const cu = cone.attributes.uv; for (let i = 0; i < cu.count; i++) cu.setXY(i, cu.getX(i) * 50, cu.getY(i) * 16);
    T.push(['roof', place(paint(cone, 0x3f6fae), { at: [0, 25.5, 0] })]);
    T.push(['plaster', sphere(1.3, 0xf2e6c8, { at: [0, 33.6, 0] })]);
    bins.addAll(T, new THREE.Matrix4().makeTranslation(x, 0, z));
    colliders.push([x, z, 9.5, 34]);
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
