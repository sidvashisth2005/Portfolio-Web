import * as THREE from 'three';
import { rng, fbm, Bins, box, cyl, sphere, place, paint, metric, gableRoof, gableEnd, roofTiles, latticeTex, breathe } from './kit.js';
import { toon, triToon, glow, textTexture, PAL } from './toon.js';
import { machiya, townhouse, apartment } from './house.js';
import { plaster, wood, stone, thatch, paving } from './textures.js';
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
// A house can be planned without being built: in a dry run every random draw happens exactly as in the real one,
// but no geometry is made, so a lot can be tried and turned down cheaply. Only houses that fit are built.
let DRY = false;
const bx = (...a) => (DRY ? null : box(...a)), cy = (...a) => (DRY ? null : cyl(...a));
const pl = (g, o) => (DRY ? null : place(g, o)), pt = (g, c) => (DRY ? null : paint(g, c));
const gr = (...a) => (DRY ? [] : gableRoof(...a)), ge = (...a) => (DRY ? null : gableEnd(...a));
function plan(r, kind, detail = 1) {
  const s0 = r.save();
  DRY = true;
  const H = house(r, kind, detail);
  DRY = false;
  return { ...H, kind, detail, s0 };
}
// build a planned house: replay its draws from where the plan started, then carry on from where the plan ended
function realize(r, H) {
  const s1 = r.save();
  r.load(H.s0);
  const R = house(r, H.kind, H.detail);
  r.load(s1);
  return R.P;
}

function house(r, kind, detail = 1) {
  const P = [];
  const wall = WALLS[Math.floor(r() * WALLS.length)], roof = ROOFS[Math.floor(r() * ROOFS.length)];
  // the traditional townhouse: a real one, frame, lattices, noren and all (see house.js)
  if (kind === 'trad') return machiya(r, { wall, roof, dry: DRY, detail });
  if (kind === 'pagoda') {
    // white walls under stacked hip-roof skirts, red tiles over a green fascia at every floor, in the anime's manner
    const w = 12 + r() * 5, d = 10 + r() * 3, fl = 2 + Math.floor(r() * 2), fh = 4.2, h = fl * fh;
    const skirtC = r() < 0.75 ? 0xc0392b : 0x3f6fae, bandC = r() < 0.7 ? 0x3f8f5a : 0x8e2a2a;
    P.push(['plaster', bx(w, h, d, 0xf4efe6, { at: [0, h / 2, 0] })]);
    P.push(['wood', bx(w + 0.3, 0.9, d + 0.3, 0x7d6a5c, { at: [0, 0.45, 0] })]);
    const hip = (bw, bd, tw, td, hh, y, color) => {
      if (DRY) return null;
      const g = new THREE.BoxGeometry(bw, hh, bd);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * tw / bw); p.setZ(i, p.getZ(i) * td / bd); }
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * bw / 0.9, uv.getY(i) * hh / 0.9);
      g.computeVertexNormals();
      return pl(pt(g, color), { at: [0, y + hh / 2, 0] });
    };
    for (let f = 0; f < fl; f++) {
      const n = Math.max(2, Math.floor(w / 3.2));
      for (let i = 0; i < n; i++) {
        // each window in a dark timber frame behind a lattice, with a sill
        const x = -w / 2 + (i + 0.5) * (w / n), y = 1.9 + f * fh;
        if (!f && Math.abs(x - w * 0.28) < 2.4) { r(); continue; } // the doorway's bay
        P.push(['wood', bx(1.85, 1.85, 0.1, 0x4a3226, { at: [x, y, d / 2 + 0.04] })]);
        P.push([r() < 0.4 ? 'lit' : 'glass', bx(1.5, 1.5, 0.08, 0x000000, { at: [x, y, d / 2 + 0.1] })]);
        if (!DRY) P.push(['lattice', place(paint(metric(new THREE.BoxGeometry(1.5, 1.5, 0.06), 1.5, 1.5, 0.16), 0x5a3b2a), { at: [x, y, d / 2 + 0.16] })]);
        P.push(['stone', bx(2, 0.14, 0.34, 0xb8ad9e, { at: [x, y - 1.0, d / 2 + 0.17] })]);
      }
      if (f < fl - 1) {
        P.push(['plaster', bx(w + 0.5, 0.7, d + 0.5, bandC, { at: [0, (f + 1) * fh - 0.9, 0] })]);
        P.push(['roof', hip(w + 3.4, d + 3.4, w + 0.4, d + 0.4, 1.4, (f + 1) * fh - 0.6, skirtC)]);
      }
    }
    P.push(['plaster', bx(w + 0.5, 0.7, d + 0.5, bandC, { at: [0, h - 0.3, 0] })]);
    P.push(['roof', hip(w + 3, d + 3, w * 0.35, d * 0.2, 3.6, h, skirtC)]);
    if (r() < 0.5) P.push(['tank', cy(1.4, 1.4, 2.2, 14, 0x8a9aa6, { at: [w * 0.3, h + 2.6, -d * 0.2] })]);
    // the doorway: a timber frame, sliding doors, a noren across it, a step; posts at the corners
    P.push(['wood', bx(3, 3.4, 0.24, 0x5a3b2a, { at: [w * 0.28, 2.15, d / 2 + 0.06] })]);
    P.push(['wood', bx(2.4, 2.9, 0.1, DARK, { at: [w * 0.28, 1.9, d / 2 + 0.16] })]);
    P.push(['cloth', bx(2.6, 1, 0.04, skirtC === 0xc0392b ? 0x1f3a5f : 0xb8232c, { at: [w * 0.28, 2.95, d / 2 + 0.4] })]);
    P.push(['stone', bx(2.6, 0.3, 1, 0x9a9088, { at: [w * 0.28, 0.15, d / 2 + 0.8] })]);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => P.push(['wood', bx(0.4, h, 0.4, 0x7d6a5c, { at: [a * w / 2, h / 2, c * d / 2] })]));
    return { P, w: w + 3.4, d: d + 3.4, h: h + 4 };
  }
  // the apartment house and the stucco townhouse (a shop on the main street): built as they really are, see house.js
  if (kind === 'apt') return apartment(r, { wall, dry: DRY, detail });
  return townhouse(r, { wall, dry: DRY, detail, shop: kind === 'shop' });
}

export async function buildVillage(scene, { mobile, portrait, heightAt }) {
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
  const street = new THREE.Mesh(new THREE.PlaneGeometry(MAIN * 2 + 4, LAYOUT.gateZ + 420).rotateX(-Math.PI / 2), triToon(paving(), 0.09, { vertexColors: false, color: 0xd9c4a4 }));
  street.position.set(0, 0.06, (LAYOUT.gateZ + 420) / 2);
  g.add(street);
  [150, 230].forEach((rad) => { const ring = new THREE.Mesh(new THREE.RingGeometry(rad - 8, rad + 8, 200).rotateX(-Math.PI / 2), triToon(paving(), 0.09, { vertexColors: false, color: 0xcbb592 })); ring.position.y = 0.05; g.add(ring); });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(88, 72).rotateX(-Math.PI / 2), triToon(paving(), 0.07, { vertexColors: false, color: 0xe2d2b4 }));
  plaza.position.y = 0.07;
  g.add(plaza);

  // houses in rows along the streets, each facing its street with an even gap to its neighbours and a setback
  // from the road: every frontage (both sides of the main street, the two ring roads and the radial lanes) is
  // walked a house-width at a time. What's left behind the rows becomes back lanes, gardens and a few courtyards.
  const lots = []; // [x, z, radius, frontage, index]
  const GAP = 2.6, SET = 3;
  const kindFor = (zone) => {
    const k0 = r();
    if (zone === 'shop') return k0 < 0.5 ? 'trad' : k0 < 0.64 ? 'pagoda' : 'shop';
    if (zone === 'core') return k0 < 0.3 ? 'apt' : k0 < 0.58 ? 'pagoda' : k0 < 0.8 ? 'block' : 'trad';
    return k0 < 0.45 ? 'trad' : k0 < 0.6 ? 'pagoda' : k0 < 0.85 ? 'block' : 'apt';
  };
  const free = (x, z, rad, fr, idx) => {
    if (onStreet(x, z)) return false;
    if (Math.hypot(x, z) > LAYOUT.wallR - 14) return false;
    return !lots.some(([lx, lz, lr, lf, li]) => !(lf === fr && Math.abs(li - idx) === 1) && Math.hypot(lx - x, lz - z) < lr + rad);
  };
  // place a house whose front faces direction `face`, its front edge `back` metres behind a frontage point
  const put = (H, px, pz, nx, nz, back, fr, idx, shop) => {
    const x = px - nx * (back + H.d / 2), z = pz - nz * (back + H.d / 2);
    const rad = Math.hypot(H.w, H.d) * 0.42;
    if (!free(x, z, rad, fr, idx)) return false;
    m4.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(up, Math.atan2(nx, nz)), new THREE.Vector3(1, 1, 1));
    bins.addAll(realize(r, H), m4);
    lots.push([x, z, rad, fr, idx]);
    colliders.push([x, z, rad, H.h]);
    if (shop) {
      // a lantern at the door and a vertical signboard by it
      lanterns.push([px - nx * (back - 0.6), 4.6, pz - nz * (back - 0.6)]);
      signs.push([px - nx * (back - 1), 7.5, pz - nz * (back - 1) + (r() - 0.5) * 3, Math.atan2(nx, nz) + Math.PI / 2, Math.floor(r() * SIGNS.length)]);
    }
    return true;
  };
  let fr = 0;
  // the main street: shops shoulder to shoulder from the gate to the plaza
  for (const side of [-1, 1]) {
    fr++;
    let z = LAYOUT.gateZ - 26, i = 0;
    while (z > 104) {
      await breathe();
      if (Math.abs(z - LAYOUT.riverZ) < 20) { z -= 4; continue; }
      const H = plan(r, kindFor('shop'), 1);
      // the house faces the street: its front normal points toward the centre line
      if (put(H, side * (MAIN + 2), z - H.w / 2, -side, 0, SET, fr, i++, true)) z -= H.w + GAP; else z -= 3;
    }
  }
  // the ring roads, both sides
  for (const [R0, half, zone] of [[150, 9, 'core'], [230, 7, 'edge']]) {
    for (const side of [-1, 1]) {
      fr++;
      const rad0 = R0 + side * half; // the frontage line
      let a = 0, i = 0;
      while (a < Math.PI * 2) {
        await breathe();
        if (mobile && zone === 'edge' && i % 2) { a += 14 / rad0; i++; continue; }
        const H = plan(r, kindFor(zone), !mobile && zone === 'core' ? 1 : 0);
        const am = a + (H.w / 2) / rad0;
        const nx = Math.cos(am) * -side, nz = Math.sin(am) * -side; // facing the road
        if (put(H, Math.cos(am) * rad0, Math.sin(am) * rad0, nx, nz, SET, fr, i++, false)) a += (H.w + GAP) / rad0; else a += 4 / rad0;
      }
    }
  }
  // the radial lanes, both sides, between the plaza and the wall
  if (!mobile) for (const ra of RADIALS) {
    const dx = Math.cos(ra), dz = Math.sin(ra), px0 = -dz, pz0 = dx;
    for (const side of [-1, 1]) {
      fr++;
      let d = 100, i = 0;
      while (d < LAYOUT.wallR - 20) {
        await breathe();
        const H = plan(r, kindFor(d < 160 ? 'core' : 'edge'), 0);
        const cx = dx * (d + H.w / 2) + px0 * side * 7, cz = dz * (d + H.w / 2) + pz0 * side * 7;
        if (put(H, cx, cz, -px0 * side, -pz0 * side, SET, fr, i++, false)) d += H.w + GAP; else d += 4;
      }
    }
  }
  // back lots: a few low courtyard houses and gardens between the rows
  fr++;
  for (let n = 0, tries = 0; n < (mobile ? 40 : 140) && tries < 4000; tries++) {
    await breathe();
    const rr = 100 + r() * 185, a = r() * Math.PI * 2, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    const H = plan(r, 'trad', 0);
    const face = Math.atan2(-x, -z);
    const rad = Math.hypot(H.w, H.d) * 0.42 + 2;
    if (!free(x, z, rad, fr, -9)) continue;
    m4.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(up, face), new THREE.Vector3(1, 1, 1));
    bins.addAll(realize(r, H), m4);
    lots.push([x, z, rad, fr, -9]);
    colliders.push([x, z, rad, H.h]);
    n++;
  }

  await breathe();
  // the heart: the village's headquarters, the biggest thing in the valley, built in the anime's manner as a
  // stack of round tiers: a grey stone base, a wide straw-gold skirt roof, the orange-red hall, a second skirt, the
  // upper drum under an overhanging rim, and the village crest on a great white disc on the roof's front edge,
  // flanked by two white horns. Two lower round wings with their own skirts stand behind it.
  const HQS = 1.6; // everything below is built at 1:1 and scaled up as one piece
  // (the thatch and plaster textures carry their own tone, so these colours are lighter than they read)
  const HQ = 0xec6a4c, RIM = 0x8e2c1e, GOLD = 0xfff0c4, BASEC = 0xd2cbc2, WHITE = 0xffffff;
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
  H.push(['thatch', cyl(25.5, 33.5, 4, 72, GOLD, { at: [0, 11, 0] })]);
  H.push(['wood', place(paint(new THREE.TorusGeometry(29.6, 0.32, 6, 96), 0x2a1f22), { at: [0, 11.2, 0], rot: [Math.PI / 2, 0, 0] })]); // the rope
  // 3 · the orange-red hall
  ring(25, 25, 11, 12.6, HQ);
  ring(25.3, 25.3, 0.6, 18.6, RIM);
  windowsRound(25, 16, 30, 0);
  windowsRound(25, 21.4, 30, 0);
  // 4 · the second skirt
  H.push(['thatch', cyl(20, 27.5, 3.6, 72, GOLD, { at: [0, 25.2, 0] })]);
  H.push(['wood', place(paint(new THREE.TorusGeometry(23.9, 0.3, 6, 96), 0x2a1f22), { at: [0, 25.3, 0] , rot: [Math.PI / 2, 0, 0] })]);
  // 5 · the upper drum, its rim and roof deck
  ring(19.5, 19.5, 9, 26.6, HQ);
  windowsRound(19.5, 31, 24, 0.5);
  H.push(['red', cyl(21.2, 20.2, 1.6, 72, RIM, { at: [0, 36.4, 0] })]);
  H.push(['stone', cyl(19.6, 19.6, 0.4, 72, 0x6a5e58, { at: [0, 37.3, 0] })]);
  H.push(['plaster', box(5, 3, 4, WHITE, { at: [-6, 38.9, -8] })]);
  H.push(['tank', cyl(1.8, 1.8, 3, 16, 0x8a9aa6, { at: [6, 39.6, -9] })]);
  // 6 · a crown of white pillars round the roof's rim
  for (let i = 0; i < 8; i++) {
    const b = (i / 8) * Math.PI * 2 + Math.PI / 8;
    H.push(['plaster', cyl(0.7, 1, 7, 10, WHITE, { at: [Math.cos(b) * 19.4, 40.4, Math.sin(b) * 19.4] })]);
  }
  // 7 · the wings: lower round halls behind, each with a gold skirt and a red cap
  [-1, 1].forEach((k) => {
    const wx = k * 33, wz = -8;
    H.push(['stone', cyl(16, 16.5, 2, 48, 0x9a8e84, { at: [wx, 1, wz] })]);
    H.push(['red', cyl(14, 14, 10, 48, HQ, { at: [wx, 7, wz] })]);
    H.push(['thatch', cyl(11.5, 17, 3.2, 48, GOLD, { at: [wx, 13.6, wz] })]);
    H.push(['red', cyl(11, 11, 4, 48, HQ, { at: [wx, 17.2, wz] })]);
    H.push(['red', cyl(12, 11.2, 1.2, 48, RIM, { at: [wx, 19.6, wz] })]);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      H.push([i % 3 ? 'glass' : 'lit', box(2, 2.4, 0.4, 0x000000, { at: [wx + Math.cos(a) * 14.1, 7.4, wz + Math.sin(a) * 14.1], rot: [0, Math.PI / 2 - a, 0] })]);
    }
  });
  const TER = 4; // the terrace height
  bins.add('stone', cyl(64, 66, TER, 80, 0xa49c92, { at: [0, TER / 2, 0] }));
  bins.add('stone', cyl(64.6, 64.6, 0.8, 80, 0x8a8278, { at: [0, TER + 0.4, 0] }));
  for (let k = 0; k < 6; k++) bins.add('stone', box(26 - k, 0.68, 2.2, 0xb3a492, { at: [0, 0.34 + k * 0.68, 66 + 6 * 2.2 - k * 2.2] }));
  bins.addAll(H, new THREE.Matrix4().makeTranslation(0, TER, 0).multiply(new THREE.Matrix4().makeScale(HQS, HQS, HQS)));
  colliders.push([0, 0, 34 * HQS, 50 * HQS + 4], [-33 * HQS, -8 * HQS, 17 * HQS, 21 * HQS + 4], [33 * HQS, -8 * HQS, 17 * HQS, 21 * HQS + 4]);
  const hq = new THREE.Group(); // the painted parts, scaled with the rest
  hq.scale.setScalar(HQS);
  hq.position.y = 4;
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

  await breathe();
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

  await breathe();
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

  await breathe();
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

  await breathe();
  const mats = {
    plaster: triToon(plaster(), 0.16), wood: triToon(wood(), 0.32), stone: triToon(stone(), 0.2), red: triToon(plaster(), 0.08),
    thatch: triToon(thatch(), 0.26), tank: toon(0xffffff, { vertexColors: true }), roof: toon(0xffffff, { vertexColors: true, map: roofTiles() }),
    glass: toon(0x2a2430), lit: glow(0xffc070),
    lattice: toon(0xffffff, { vertexColors: true, map: latticeTex(), alphaTest: 0.5 }), cloth: toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }),
  };
  bins.build(mats, g);

  return {
    group: g,
    colliders,
    // open: 0..1, the gate's doors swinging inward as the journey begins
    doorMeshes: doors.map(({ pivot }) => pivot.children[0]), // tapping the gate's doors starts the journey
    update(t, open) { doors.forEach(({ pivot, s }) => { pivot.rotation.y = -s * open * 1.6; }); updates.forEach((f) => f(t)); },
  };
}
