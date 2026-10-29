import * as THREE from 'three';
import { box, cyl, sphere, paint, place, gableEnd, metric } from './kit.js';

// A townhouse built the way the real ones are (a machiya): a stone plinth and a wooden sill, a timber frame of
// posts and beams with plaster between them and charred cedar boards round the foot of the walls, a street front
// of wooden lattices (kōshi) over the shop windows, sliding doors under a split curtain (noren), a little tiled
// pent roof over the ground floor, a low upper floor with slatted plaster windows (mushiko-mado), and a tiled
// gable roof whose ridge runs along the street, capped with ridge-end tiles (onigawara) and trimmed with barge
// boards, fascia and a copper gutter.
//
// Built at the origin, its front on +z, as [material, geometry] pieces like every other building in the village.
// Every random number is drawn up front, the same sixteen whatever the detail, so a dry run (dry: no geometry,
// see village.js) draws exactly what the real build will.
//   detail 0: the silhouette only (houses seen from above)   1: the street front   2: everything, for close-ups
export const NOREN = [0x1f3a5f, 0xb8232c, 0x2f5d3a, 0x4a2c5e, 0xc27b1a, 0x1a1214, 0x2b6f74];
const WOOD = 0x5a3b2a, DARK = 0x2a1f22, CHAR = 0x30282a, STONE = 0x8d847c, RIDGE = 0x2a2228, COPPER = 0x9a6a3a;
const LAT = 0.11; // metres from one lattice slat to the next

export function machiya(r, { wall = 0xeadcc2, roof = 0x4a4552, dry = false, detail = 1, noren, norenKey = 'cloth', engawa = false, width, depth, storeys } = {}) {
  const R = Array.from({ length: 16 }, () => r());
  const P = [];
  const add = (k, make) => { if (!dry) P.push([k, make()]); };
  const B = (k, w, h, d, c, o) => add(k, () => box(w, h, d, c, o));
  const C = (k, rt, rb, h, seg, c, o) => add(k, () => cyl(rt, rb, h, seg, c, o));
  // a piece built at the origin, tilted about x, then turned about y, then moved: roof slabs and anything on a slope
  const pose = (g, rx, ry, at) => g.rotateX(rx).rotateY(ry).translate(...at);
  const tiles = (w, l, t, c, rx, ry, at) => add('roof', () => pose(paint(metric(new THREE.BoxGeometry(w, t, l), w, l, 0.9), c), rx, ry, at));
  const lattice = (w, h, c, at, ry = 0) => add('lattice', () => pose(paint(metric(new THREE.BoxGeometry(w, h, 0.08), w, h, LAT), c), 0, ry, at));
  const pane = (lit, w, h, at, ry = 0) => add(lit ? 'lit' : 'glass', () => pose(paint(new THREE.BoxGeometry(w, h, 0.06), 0), 0, ry, at));

  const w = width ?? 9.5 + R[0] * 5, d = depth ?? 9 + R[1] * 4.5, two = storeys ? storeys > 1 : R[2] < 0.62;
  const F1 = 3.7, F2 = 2.9, base = 0.9, h = F1 + (two ? F2 : 0), fz = d / 2;
  const bays = Math.max(3, Math.round(w / 2.7)), bw = w / bays, door = Math.floor(R[3] * bays);
  const doorX = -w / 2 + (door + 0.5) * bw, iw = bw - 0.32;
  const lit = (k) => R[(k * 5 + 4) % 16] < 0.55;

  // the plinth, the sill, the walls: plaster above, charred cedar boards round the foot
  B('stone', w + 0.8, 0.6, d + 0.8, STONE, { at: [0, 0.3, 0] });
  B('wood', w + 0.24, 0.3, d + 0.24, DARK, { at: [0, 0.75, 0] });
  B('plaster', w, h - base, d, wall, { at: [0, (h + base) / 2, 0] });
  B('wood', w + 0.08, 1.3, d + 0.08, CHAR, { at: [0, base + 0.65, 0] });

  // the frame: a post at every bay of the front, posts at the back corners and halfway down each side, and a beam
  // round the walls at each floor
  for (let i = 0; i <= bays; i++) B('wood', 0.3, h - base, 0.3, WOOD, { at: [-w / 2 + i * bw, (h + base) / 2, fz + 0.06] });
  [-1, 1].forEach((s) => B('wood', 0.3, h - base, 0.3, WOOD, { at: [s * w / 2, (h + base) / 2, -fz] }));
  if (detail) [-1, 1].forEach((s) => B('wood', 0.26, h - base, 0.26, WOOD, { at: [s * (w / 2 + 0.04), (h + base) / 2, 0] }));
  for (const y of two ? [F1 - 0.12, h - 0.12] : [h - 0.12]) {
    B('wood', w + 0.3, 0.3, 0.3, WOOD, { at: [0, y, fz + 0.06] });
    [-1, 1].forEach((s) => B('wood', 0.3, 0.3, d + 0.3, WOOD, { at: [s * (w / 2 + 0.03), y, 0] }));
  }

  // the street front, bay by bay: the entrance in one, a lattice over a window in the others
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + (i + 0.5) * bw;
    if (i === door) {
      // two sliding doors, one in front of the other, under a lattice transom that glows from inside
      B('wood', iw / 2 + 0.06, 2.3, 0.08, DARK, { at: [x - iw / 4, base + 1.15, fz + 0.03] });
      B('wood', iw / 2 + 0.06, 2.3, 0.08, 0x3d2c25, { at: [x + iw / 4, base + 1.15, fz + 0.1] });
      pane(true, iw, 0.5, [x, base + 2.6, fz + 0.02]);
      lattice(iw, 0.56, WOOD, [x, base + 2.6, fz + 0.09]);
      B('stone', Math.min(iw, 1.8), 0.28, 0.9, 0x9a9088, { at: [x, 0.14, fz + 0.95] }); // the step stone
    } else {
      pane(lit(i), iw, 1.9, [x, base + 1.45, fz + 0.02]);
      lattice(iw + 0.06, 2.1, WOOD, [x, base + 1.5, fz + 0.16]);
      if (detail) B('wood', iw, 0.1, 0.5, WOOD, { at: [x, base + 0.3, fz + 0.36] }); // a fold-down bench (battari shōgi)
    }
  }
  // the noren: three panels on a rod across the doorway; its uv spans the whole curtain, so a crest can be painted
  // across it (the residents' quarter does)
  const nw = Math.min(iw * 0.98, 2.7), nh = 1.05, ny = base + 2.25 - nh / 2, nz = fz + 0.42;
  const nc = noren ?? NOREN[Math.floor(R[5] * NOREN.length)];
  for (let k = 0; k < 3; k++) add(norenKey, () => {
    const g = new THREE.PlaneGeometry(nw / 3 - 0.05, nh), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (k + 0.02 + uv.getX(i) * 0.96) / 3);
    return place(paint(g, nc), { at: [doorX - nw / 3 + k * (nw / 3), ny, nz] });
  });
  C('wood', 0.045, 0.045, nw + 0.4, 6, DARK, { at: [doorX, base + 2.28, nz], rot: [0, 0, Math.PI / 2] });

  // a tiled pent roof (hisashi) over the ground floor's front (a single storey's own eaves come down low enough)
  if (two) {
    const L = 1.6, a = 0.36, y0 = F1 + 0.12;
    tiles(w + 0.8, L, 0.2, roof, a, 0, [0, y0 - Math.sin(a) * L / 2, fz + 0.1 + Math.cos(a) * L / 2]);
    B('wood', w + 0.8, 0.2, 0.12, DARK, { at: [0, y0 - Math.sin(a) * L - 0.08, fz + 0.12 + Math.cos(a) * L] });
  }

  // the low upper floor: slatted plaster windows on the front, a lattice window in each side
  if (two) {
    const n2 = Math.max(2, Math.floor(w / 4));
    for (let i = 0; i < n2; i++) {
      const x = -w / 2 + (i + 0.5) * (w / n2);
      pane(lit(i + 7), 1.7, 0.95, [x, F1 + F2 * 0.5, fz + 0.02]);
      lattice(1.9, 1.15, wall, [x, F1 + F2 * 0.5, fz + 0.1]);
    }
    if (detail && R[8] < 0.45) B('cloth', 1.9, 1.3, 0.04, 0xc8a46a, { at: [-w / 2 + 0.5 * (w / n2), F1 + F2 * 0.55, fz + 0.24] }); // a reed blind (sudare)
  }
  if (detail) [-1, 1].forEach((s, k) => {
    const y = two && k ? F1 + F2 * 0.5 : base + 1.6;
    pane(lit(k + 11), 1.6, 1.0, [s * (w / 2 + 0.02), y, -d * 0.18], Math.PI / 2);
    lattice(1.8, 1.2, WOOD, [s * (w / 2 + 0.1), y, -d * 0.18], Math.PI / 2);
  });

  // the main roof: two tiled slabs on a ridge that runs along the street, eaves well out over the walls
  const over = 1.0, ov2 = 0.75, half = d / 2 + over, pitch = 0.5 + R[6] * 0.12, rise = Math.tan(pitch) * half;
  const L = Math.hypot(half, rise), RW = w + 2 * ov2;
  const Y0 = h + 0.12 - rise * (over / half); // the eaves: low enough that the slab meets the wall's top plate
  [-1, 1].forEach((s) => tiles(RW, L, 0.32, roof, s * pitch, 0, [0, Y0 + rise / 2, s * half / 2]));
  B('roof', RW + 0.2, 0.55, 0.75, RIDGE, { at: [0, Y0 + rise + 0.18, 0] });
  [-1, 1].forEach((s) => B('roof', 0.45, 0.85, 1.15, 0x3a3540, { at: [s * (RW / 2 + 0.05), Y0 + rise + 0.36, 0] })); // onigawara
  const gr = Y0 + rise - h; // the gable triangle, from the top plate to the ridge
  [-1, 1].forEach((s) => {
    add('plaster', () => place(gableEnd(d, gr, 0.3, wall), { at: [s * w / 2, h, 0], rot: [0, Math.PI / 2, 0] }));
    // the timbers in the gable: a tie beam across it and a king post up to the ridge
    B('wood', 0.2, 0.26, d * (1 - 0.38) + 0.2, WOOD, { at: [s * (w / 2 + 0.17), h + gr * 0.38, 0] });
    B('wood', 0.2, gr * 0.9, 0.26, WOOD, { at: [s * (w / 2 + 0.17), h + gr * 0.45, 0] });
  });
  // barge boards along the gable edges, fascia along the eaves
  [-1, 1].forEach((s) => [-1, 1].forEach((t) => B('wood', 0.14, 0.42, L, WOOD, { at: [s * (RW / 2 - 0.05), Y0 + rise / 2 - 0.12, t * half / 2], rot: [t * pitch, 0, 0] })));
  [-1, 1].forEach((t) => B('wood', RW, 0.26, 0.14, DARK, { at: [0, Y0 - 0.14, t * (half + 0.02)] }));
  if (detail) {
    // a copper gutter along the front eaves and its downpipe
    C('tank', 0.1, 0.1, RW - 0.4, 8, COPPER, { at: [0, Y0 - 0.32, half + 0.06], rot: [0, 0, Math.PI / 2] });
    C('tank', 0.07, 0.07, Y0 - 0.3, 6, COPPER, { at: [RW / 2 - 0.6, (Y0 - 0.3) / 2, half + 0.06] });
    // potted plants either side of the door, a rain barrel, a lantern by the door
    [-1, 1].forEach((s) => {
      if (R[9 + (s > 0)] < 0.35) return;
      const x = doorX + s * (iw / 2 + 0.55);
      C('tank', 0.32, 0.24, 0.55, 8, s > 0 ? 0x8a4a2a : 0x5d6870, { at: [x, 0.28, fz + 0.95] });
      add('tank', () => sphere(0.5, s > 0 ? 0x4f7a30 : 0x6a8a3a, { at: [x, 0.95, fz + 0.95] }, 7, 5));
    });
    if (R[11] < 0.45) C('tank', 0.45, 0.4, 1.0, 10, 0x6b4a30, { at: [w / 2 - 0.6, 0.5, fz + 0.9] });
    if (R[12] < 0.6) add('lit', () => box(0.36, 0.5, 0.36, 0, { at: [doorX + nw / 2 + 0.35, base + 2.05, fz + 0.4] }));
  }
  if (R[13] < 0.35) {
    // a smoke vent on the ridge (kemuridashi): a little roof of its own
    B('plaster', 1.2, 0.6, 1.1, wall, { at: [w * 0.22, Y0 + rise + 0.55, 0] });
    tiles(1.8, 1.0, 0.14, roof, 0.45, 0, [w * 0.22, Y0 + rise + 0.95, 0.35]);
    tiles(1.8, 1.0, 0.14, roof, -0.45, 0, [w * 0.22, Y0 + rise + 0.95, -0.35]);
  }

  if (detail > 1) {
    // rafter ends under the front eaves
    const nr = Math.floor(RW / 0.6);
    for (let i = 0; i <= nr; i++) B('wood', 0.12, 0.14, over + 0.1, WOOD, { at: [-RW / 2 + 0.2 + i * ((RW - 0.4) / nr), Y0 + 0.05, fz + over / 2 + 0.05], rot: [pitch, 0, 0] });
    // a laundry pole off the upper floor
    if (two && R[14] < 0.6) {
      C('wood', 0.04, 0.04, w * 0.5, 5, 0x8a7a60, { at: [w * 0.1, F1 + F2 - 0.2, fz + 0.7], rot: [0, 0, Math.PI / 2] });
      [[0xf4efe6, 0], [0x6f8fae, 1], [0xd9b25a, 2]].forEach(([c, k]) => add('cloth', () => place(paint(new THREE.PlaneGeometry(0.8, 1.1), c), { at: [w * 0.1 - w * 0.18 + k * 1.1, F1 + F2 - 0.8, fz + 0.7] })));
    }
    // an engawa: a veranda down one side, posts, a pent roof, and shoji glowing behind it
    if (engawa) {
      const ed = d * 0.75, ex = w / 2 + 0.7;
      B('wood', 1.4, 0.14, ed, 0x7a5a40, { at: [ex, base + 0.05, -d * 0.08] });
      [-1, 0, 1].forEach((k) => {
        B('wood', 0.2, 0.75, 0.2, DARK, { at: [ex + 0.5, base * 0.5, -d * 0.08 + k * ed * 0.45] });
        B('wood', 0.2, 2.6, 0.2, WOOD, { at: [ex + 0.55, base + 1.3, -d * 0.08 + k * ed * 0.45] });
      });
      add('lit', () => box(0.06, 2.1, ed * 0.85, 0, { at: [w / 2 + 0.05, base + 1.15, -d * 0.08] }));
      lattice(ed * 0.85, 2.15, 0xf4efe6, [w / 2 + 0.11, base + 1.15, -d * 0.08], Math.PI / 2);
      tiles(ed + 1, 1.7, 0.18, roof, 0.4, Math.PI / 2, [ex - 0.05, base + 2.85, -d * 0.08]);
    }
  }
  // eave: where a lantern can hang along the front, [height, z]
  const eave = two ? [F1 + 0.12 - Math.sin(0.36) * 1.6 - 0.2, fz + 0.1 + Math.cos(0.36) * 1.6] : [Y0 - 0.3, half - 0.1];
  return { P, w: w + 1.6, d: d + 3, h: Y0 + rise + 1, door: [doorX, fz + 1.2], body: [w, d], eave };
}
