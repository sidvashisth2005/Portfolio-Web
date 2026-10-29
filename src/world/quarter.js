import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, Bins, box, cyl, sphere, place, paint, metric, roofTiles, latticeTex, breathe } from './kit.js';
import { toon, triToon, glow, textTexture } from './toon.js';
import { plaster, wood, stone, paving } from './textures.js';
import { machiya } from './house.js';
import { LAYOUT, heightAt } from './land.js';
import { PLOTS, NOREN, ROOFS } from '../registry.js';

// 住人街 · The residents' quarter: a terrace on the hillside outside the south-west wall, two lanes of townhouses
// that visitors can claim (src/world/residents.js, api/house.js). Every house shows who lives there: the
// resident's crest on the noren, their name on the sign over the gate, the roof in their colour, lit windows, and
// one more paper lantern under the eaves for every few visitors who hung one. Empty houses stand dark, noren down,
// a 空き家 board in the yard. A registry board at the entrance lists everyone.
//
// Plots are fixed (the same 24 on every device): six to a row, two rows to a lane, numbered from the entrance.
// Local frame: x runs along the lanes (the entrance at +x, toward the village road), z across them.
const COLS = 6, PITCH = 17, LANE = 26;
const WALLS = [0xeadcc2, 0xe2c9a2, 0xf0e6d6, 0xe9bf98, 0xd8c8b0, 0xe6d3b0];
const WOOD = 0x5a3b2a, DARK = 0x2a1f22, STONE = 0x8d847c;
const MARK = new THREE.Color(0xff00fe); // the roofs are built in this colour, and each one is repainted in its resident's
const VACANT_ROOF = new THREE.Color(0x6e6a72), LIT = new THREE.Color(0xffc070), DIM = new THREE.Color(0x2a2430);
const NC = 4, NR = 6; // the atlases: a cell per plot, four across, six down

export function plotAt(id) {
  const row = Math.floor(id / COLS), col = id % COLS;
  const lane = row < 2 ? -LANE : LANE, s = row % 2 === 0 ? 1 : -1; // s: the way the house faces, along z
  return { id, row, col, x: 46 - col * PITCH, s, lane, fence: lane - s * 5, front: lane - s * 8 };
}
const cell = (id, u, v) => [((id % NC) + u) / NC, 1 - (Math.floor(id / NC) + 1 - v) / NR];

export function buildQuarter(scene, { mobile }) {
  const { at } = LAYOUT.quarter, Q = new THREE.Vector3(...at);
  const g = new THREE.Group();
  g.position.copy(Q);
  scene.add(g);
  const bins = new Bins();
  const colliders = [], lights = [], plots = [];
  const roofs = [], norens = [], wins = []; // [plot id, geometry, lit]: the pieces repainted for each resident
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
  const lattice = (w, h, c, at, ry = 0) => bins.add('lattice', paint(metric(new THREE.BoxGeometry(w, h, 0.08), w, h, 0.11), c).rotateY(ry).translate(...at));
  const tiles = (w, l, c, rx, ry, at) => bins.add('roof', paint(metric(new THREE.BoxGeometry(w, 0.22, l), w, l, 0.9), c).rotateX(rx).rotateY(ry).translate(...at));
  // a stone lantern (tōrō) standing on the ground at height y
  const toro = (x, z, s = 1, y = 0) => {
    bins.add('stone', box(1.6 * s, 0.5 * s + 1, 1.6 * s, STONE, { at: [x, y + 0.25 * s - 0.5, z] }));
    bins.add('stone', cyl(0.28 * s, 0.36 * s, 1.8 * s, 8, STONE, { at: [x, y + 1.4 * s, z] }));
    bins.add('stone', box(1.3 * s, 0.35 * s, 1.3 * s, STONE, { at: [x, y + 2.45 * s, z] }));
    lights.push([x, y + 3.05 * s, z, 0.55 * s]);
    bins.add('stone', place(paint(new THREE.ConeGeometry(1.2 * s, 0.8 * s, 4), 0x7a716a), { at: [x, y + 4 * s, z], rot: [0, Math.PI / 4, 0] }));
  };

  // the ground: a mossy garden floor, the two lanes, the cross street and the entrance plaza, paved
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(150, 112).rotateX(-Math.PI / 2), toon(0x6f8f3a));
  lawn.position.set(4, 0.03, 0);
  g.add(lawn);
  const pave = triToon(paving(), 0.09, { vertexColors: false, color: 0xd9c4a4 });
  [[-LANE, 8, 112, 4], [LANE, 8, 112, 4]].forEach(([z, wd, len, x]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, wd).rotateX(-Math.PI / 2), pave); m.position.set(x, 0.06, z); g.add(m); });
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(8, 60).rotateX(-Math.PI / 2), pave);
  cross.position.set(60, 0.06, 0);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(15, 40).rotateX(-Math.PI / 2), triToon(paving(), 0.09, { vertexColors: false, color: 0xe2d2b4 }));
  plaza.position.set(72, 0.07, 0);
  const entry = new THREE.Mesh(new THREE.PlaneGeometry(20, 7).rotateX(-Math.PI / 2), pave);
  entry.position.set(90, 0.065, 0);
  g.add(cross, plaza, entry);

  // the houses
  for (let id = 0; id < PLOTS; id++) {
    const p = plotAt(id), r = rng(4100 + id * 17);
    const width = 10.6 + ((id * 7) % 5) * 0.7, depth = 9.6 + ((id * 3) % 4) * 0.6;
    const H = machiya(r, {
      wall: WALLS[id % WALLS.length], roof: MARK.getHex(), detail: mobile ? 1 : 2, noren: 0xffffff, norenKey: 'noren',
      engawa: id % 3 === 1, width, depth, storeys: id % 4 === 2 ? 1 : 2,
    });
    const [, d] = H.body, cz = p.front - p.s * d / 2;
    m4.compose(new THREE.Vector3(p.x, 0, cz), q.setFromAxisAngle(up, p.s > 0 ? 0 : Math.PI), one);
    for (const [k, geo] of H.P) {
      geo.applyMatrix4(m4);
      if (k === 'roof') roofs.push([id, geo]);
      else if (k === 'noren') norens.push([id, geo]);
      else if (k === 'lit' || k === 'glass') wins.push([id, geo, k === 'lit']);
      else bins.add(k, geo);
    }
    colliders.push([Q.x + p.x, Q.z + cz, Math.hypot(H.body[0], d) * 0.5, Q.y + H.h]);
    // the door, in the quarter's frame: the house is turned to face its lane
    const doorX = p.x + p.s * H.door[0];
    // the yard: a lattice fence on a stone kerb along the lane, a roofed gate in line with the door, stepping stones
    const gateW = 2.6, x0 = p.x - PITCH / 2 + 0.4, x1 = p.x + PITCH / 2 - 0.4;
    [[x0, doorX - gateW / 2], [doorX + gateW / 2, x1]].forEach(([a, b]) => {
      if (b - a < 0.4) return;
      bins.add('stone', box(b - a, 0.45, 0.6, 0x9a9088, { at: [(a + b) / 2, 0.22, p.fence] }));
      lattice(b - a, 1.15, WOOD, [(a + b) / 2, 1.0, p.fence]);
      bins.add('wood', box(b - a, 0.12, 0.16, DARK, { at: [(a + b) / 2, 1.62, p.fence] }));
    });
    [-1, 1].forEach((k) => bins.add('wood', box(0.3, 2.9, 0.3, WOOD, { at: [doorX + k * gateW / 2, 1.45, p.fence] })));
    bins.add('wood', box(gateW + 1, 0.3, 0.36, DARK, { at: [doorX, 2.9, p.fence] }));
    [-1, 1].forEach((k) => tiles(gateW + 1.6, 0.9, 0x3a3540, k * 0.5, 0, [doorX, 3.25, p.fence + k * 0.38]));
    for (let k = 0; k < 3; k++) bins.add('stone', box(1.1, 0.16, 0.8, 0xa8a098, { at: [doorX + (k % 2 ? 0.25 : -0.2), 0.08, p.fence - p.s * (0.9 + k * 0.85)] }));
    // a tree in some back gardens
    if (id % 2 === 0) {
      const tx = p.x + (id % 4 ? 5 : -5), tz = p.front - p.s * (d + 3);
      bins.add('tank', cyl(0.3, 0.45, 3.4, 6, 0x5a3a2a, { at: [tx, 1.7, tz] }));
      bins.add('tank', sphere(2.4, id % 6 ? 0x4f8a3a : 0xf2a7c3, { at: [tx, 4.6, tz] }, 8, 6));
    }
    // lanterns for the visitors: up to four, hung under the front eaves either side of the door
    const ey = H.eave[0] - 0.6, ez = cz + p.s * (H.eave[1] - 0.25), half = H.body[0] / 2 - 0.6;
    const lant = [-1, 1, -2, 2].map((k) => [THREE.MathUtils.clamp(doorX + k * 1.6 + Math.sign(k) * 0.8, p.x - half, p.x + half), ey, ez]);
    plots.push({
      ...p, cz, doorX, lant, sign: [doorX, 2.35, p.fence + p.s * 0.22],
      box: new THREE.Box3(new THREE.Vector3(Q.x + p.x - PITCH / 2, Q.y, Q.z + Math.min(p.fence, p.front - p.s * (d + 2))), new THREE.Vector3(Q.x + p.x + PITCH / 2, Q.y + H.h, Q.z + Math.max(p.fence, p.front - p.s * (d + 2)))),
      // where a visitor stands to look at the house: across the lane, a little to one side
      view: [Q.x + doorX + 6, Q.y + 4.2, Q.z + p.lane + p.s * 3.5], look: [Q.x + p.x, Q.y + 4.6, Q.z + cz],
    });
  }

  // the back fence between the gardens, and stone lanterns down the lanes
  for (let x = -46; x < 56; x += 2) bins.add('wood', cyl(0.07, 0.07, 1.8, 5, 0x8a7a50, { at: [x, 0.9, 0] }));
  [0.6, 1.3].forEach((y) => bins.add('wood', box(102, 0.08, 0.1, 0x8a7a50, { at: [5, y, 0] })));
  for (let c = 0; c < COLS - 1; c++) [-LANE, LANE].forEach((z) => toro(46 - c * PITCH - PITCH / 2, z + (c % 2 ? 4.2 : -4.2), 0.8));

  // the entrance: a roofed gate facing the road, the plaza with a well and a cherry tree, and the registry board
  [-1, 1].forEach((k) => {
    bins.add('wood', box(0.6, 5, 0.6, WOOD, { at: [92, 2.5, k * 3.6] }));
    bins.add('stone', box(1, 0.6, 1, STONE, { at: [92, 0.3, k * 3.6] }));
  });
  bins.add('wood', box(1, 0.5, 9.6, DARK, { at: [92, 5, 0] }));
  [-1, 1].forEach((k) => tiles(10.6, 1.7, 0x3a3540, k * 0.55, Math.PI / 2, [92 + k * 0.7, 5.6, 0]));
  const gatePlate = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), new THREE.MeshBasicMaterial({ fog: true, map: textTexture((x, w, h) => {
    x.fillStyle = '#2a1410'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#c9a45c'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#f4ead8'; x.font = `${h * 0.56}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('住人街', w / 2, h * 0.55);
  }, 512, 168) }));
  gatePlate.position.set(92.55, 4.1, 0);
  gatePlate.rotation.y = Math.PI / 2;
  g.add(gatePlate);
  // the well
  bins.add('stone', cyl(1.6, 1.7, 1, 16, 0x9a9088, { at: [76, 0.5, -8] }));
  bins.add('glass', cyl(1.3, 1.3, 0.1, 16, 0, { at: [76, 0.95, -8] }));
  [-1, 1].forEach((k) => bins.add('wood', box(0.22, 3.2, 0.22, WOOD, { at: [76 + k * 1.5, 1.6, -8] })));
  [-1, 1].forEach((k) => tiles(1.6, 2.6, 0x3a3540, k * 0.6, 0, [76, 3.45, -8 + k * 0.6]));
  // the cherry tree
  bins.add('tank', cyl(0.5, 0.8, 5, 7, 0x4a3226, { at: [74, 2.5, 9] }));
  [[0, 7, 0, 3.4], [2.4, 6.2, 1.2, 2.6], [-2.2, 6.4, -1, 2.8], [0.6, 8.6, -0.8, 2.4], [-1, 6, 2.2, 2.2]].forEach(([x, y, z, rr], i) => bins.add('tank', sphere(rr, [0xf2a7c3, 0xf6bfd2, 0xe98fb0][i % 3], { at: [74 + x, y, 9 + z] }, 9, 7)));
  toro(86, -6); toro(86, 6);
  // the registry board: a roofed notice board facing the road
  [-1, 1].forEach((k) => bins.add('wood', box(0.4, 6.4, 0.4, WOOD, { at: [66, 3.2, k * 5.2] })));
  [-1, 1].forEach((k) => tiles(11.6, 1.5, 0x3a3540, k * 0.55, Math.PI / 2, [66 + k * 0.6, 6.7, 0]));
  const boardCv = document.createElement('canvas');
  boardCv.width = 1024; boardCv.height = 640;
  const boardTex = new THREE.CanvasTexture(boardCv);
  boardTex.colorSpace = THREE.SRGBColorSpace; boardTex.anisotropy = 4;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 6.25), new THREE.MeshBasicMaterial({ map: boardTex, fog: true }));
  board.position.set(66.25, 3.5, 0);
  board.rotation.y = Math.PI / 2;
  g.add(board);
  colliders.push([Q.x + 66, Q.z, 6, Q.y + 7], [Q.x + 76, Q.z - 8, 2.4, Q.y + 4], [Q.x + 74, Q.z + 9, 3.5, Q.y + 9]);

  // the path down to the road from the gate: a paved ribbon over the hillside, stone lanterns along it
  {
    const from = new THREE.Vector3(Q.x + 100, 0, Q.z), to = new THREE.Vector3(-26, 0, 386);
    const n = 40, pos = [], idx = [], wd = 3;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = THREE.MathUtils.lerp(from.x, to.x, t), z = THREE.MathUtils.lerp(from.z, to.z, t) + Math.sin(t * Math.PI) * 10;
      const y = heightAt(x, z) + 0.12 - Q.y;
      pos.push(x - Q.x, y, z - Q.z - wd, x - Q.x, y, z - Q.z + wd);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      if (i % 8 === 4) toro(x - Q.x, z - Q.z + 5.5, 0.8, heightAt(x, z + 5.5) - Q.y);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    pg.setIndex(idx);
    pg.computeVertexNormals();
    g.add(new THREE.Mesh(pg, pave));
  }

  // ---------- the parts that change with the registry ----------
  // roofs: one mesh, each plot's vertices known, the marked ones repainted
  const merge = (list) => { const ranges = new Array(PLOTS).fill(null).map(() => []); let n = 0; list.forEach(([id, geo, lit]) => { const c = geo.attributes.position.count; ranges[id].push([n, c, lit]); n += c; }); return { geo: mergeGeometries(list.map((x) => x[1]), false), ranges }; };
  const R = merge(roofs);
  const roofBase = R.geo.attributes.color.array.slice();
  const roofMesh = new THREE.Mesh(R.geo, toon(0xffffff, { vertexColors: true, map: roofTiles() }));
  // noren: their uv moved into each plot's cell of the atlas
  norens.forEach(([id, geo]) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, ...cell(id, uv.getX(i), uv.getY(i))); });
  const norenCv = document.createElement('canvas');
  norenCv.width = 2048; norenCv.height = 1024;
  const norenTex = new THREE.CanvasTexture(norenCv);
  norenTex.colorSpace = THREE.SRGBColorSpace;
  const norenMesh = new THREE.Mesh(mergeGeometries(norens.map((x) => x[1]), false), new THREE.MeshToonMaterial({ map: norenTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  // windows: lit for a resident, dark for an empty house
  const W = merge(wins);
  const winMesh = new THREE.Mesh(W.geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: true }));
  g.add(roofMesh, norenMesh, winMesh);
  // the sign over each gate: the resident's name, or 空き家 (vacant)
  const signCv = document.createElement('canvas');
  signCv.width = 1024; signCv.height = 512;
  const signTex = new THREE.CanvasTexture(signCv);
  signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = 4;
  const signGeos = plots.map((p) => {
    const sg = new THREE.PlaneGeometry(2.6, 0.95), uv = sg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ...cell(p.id, uv.getX(i), uv.getY(i)));
    return sg.rotateY(p.s > 0 ? 0 : Math.PI).translate(p.sign[0], p.sign[1], p.sign[2]);
  });
  const signMesh = new THREE.Mesh(mergeGeometries(signGeos, false), new THREE.MeshBasicMaterial({ map: signTex, fog: true, side: THREE.DoubleSide }));
  g.add(signMesh);
  // the 空き家 board in an empty house's yard
  const forClaim = textTexture((x, w, h) => {
    x.fillStyle = '#f0e6d2'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#3a2418'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
    x.fillStyle = '#b8232c'; x.font = `${h * 0.36}px "Dela Gothic One", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('空き家', w / 2, h * 0.34);
    x.fillStyle = '#1a1214'; x.font = `900 ${h * 0.16}px "Big Shoulders Display", sans-serif`;
    x.fillText('VACANT · CLAIM ME', w / 2, h * 0.72);
  }, 512, 300);
  const vac = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshBasicMaterial({ map: forClaim, fog: true, side: THREE.DoubleSide }), PLOTS);
  const stakes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), toon(WOOD), PLOTS * 2);
  g.add(vac, stakes);
  // lanterns, four places per house; the resident's own and the visitors'
  const lant = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 12, 8).scale(1, 1.25, 1), glow(0xff5a3a), PLOTS * 4);
  const caps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 8), toon(0x1a1214), PLOTS * 8);
  g.add(lant, caps);
  // a marker over your own house, and a ring round the house under the pointer
  const mine = new THREE.Mesh(new THREE.OctahedronGeometry(1.1).scale(1, 1.6, 1), glow(0xff2e44));
  mine.visible = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(8.6, 9.3, 48).rotateX(-Math.PI / 2), glow(0xff4a5c, { transparent: true, opacity: 0.8, depthWrite: false }));
  ring.visible = false;
  g.add(mine, ring);
  // the stone lanterns' fire boxes
  if (lights.length) {
    const lg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), glow(0xffb070), lights.length);
    lights.forEach(([x, y, z, s], i) => { m4.compose(new THREE.Vector3(x, y, z), q.identity(), new THREE.Vector3(s, s, s)); lg.setMatrixAt(i, m4); });
    g.add(lg);
  }
  const mats = {
    plaster: triToon(plaster(), 0.16), wood: triToon(wood(), 0.32), stone: triToon(stone(), 0.2), tank: toon(0xffffff, { vertexColors: true }),
    roof: toon(0xffffff, { vertexColors: true, map: roofTiles() }), glass: toon(0x2a2430), lit: glow(0xffc070),
    lattice: toon(0xffffff, { vertexColors: true, map: latticeTex(), alphaTest: 0.5 }), cloth: toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }),
  };
  bins.build(mats, g);

  // ---------- painting the registry onto the quarter ----------
  const col = new THREE.Color();
  const fit = (x, text, max, font) => { let s = max; do { x.font = font(s); s -= 2; } while (x.measureText(text).width > x.canvas.width / NC * 0.86 && s > 10); };
  let state = [];
  function apply(houses, myId = -1) {
    state = houses;
    // roofs
    const ca = R.geo.attributes.color;
    for (let id = 0; id < PLOTS; id++) {
      const h = houses[id];
      const c = h ? col.set(ROOFS[h.roof] || ROOFS[0]) : VACANT_ROOF;
      for (const [s, n] of R.ranges[id]) for (let v = s; v < s + n; v++) {
        const k = v * 3;
        if (Math.abs(roofBase[k] - MARK.r) + Math.abs(roofBase[k + 1] - MARK.g) + Math.abs(roofBase[k + 2] - MARK.b) < 0.01) ca.setXYZ(v, c.r, c.g, c.b);
        else ca.setXYZ(v, roofBase[k], roofBase[k + 1], roofBase[k + 2]);
      }
    }
    ca.needsUpdate = true;
    // windows
    const wa = W.geo.attributes.color;
    for (let id = 0; id < PLOTS; id++) for (const [s, n, lit] of W.ranges[id]) {
      const c = houses[id] && lit ? LIT : DIM;
      for (let v = s; v < s + n; v++) wa.setXYZ(v, c.r, c.g, c.b);
    }
    wa.needsUpdate = true;
    // noren and gate signs
    const nx = norenCv.getContext('2d'), sx = signCv.getContext('2d');
    nx.clearRect(0, 0, norenCv.width, norenCv.height);
    const cw = norenCv.width / NC, ch = norenCv.height / NR, sw = signCv.width / NC, sh = signCv.height / NR;
    for (let id = 0; id < PLOTS; id++) {
      const h = houses[id], x0 = (id % NC) * cw, y0 = Math.floor(id / NC) * ch;
      if (h) {
        nx.fillStyle = NOREN[h.color] || NOREN[0]; nx.fillRect(x0, y0, cw, ch);
        nx.fillStyle = 'rgba(255,255,255,.12)'; nx.fillRect(x0, y0 + ch * 0.86, cw, ch * 0.14);
        nx.fillStyle = '#f4efe6'; nx.beginPath(); nx.arc(x0 + cw / 2, y0 + ch * 0.46, ch * 0.34, 0, Math.PI * 2); nx.fill();
        nx.fillStyle = NOREN[h.color] || NOREN[0]; nx.textAlign = 'center'; nx.textBaseline = 'middle';
        nx.font = `${ch * (h.crest.length > 1 && /^[\x20-\x7e]+$/.test(h.crest) ? 0.3 : 0.4)}px "Dela Gothic One", "Hiragino Kaku Gothic Pro", sans-serif`;
        nx.fillText(h.crest, x0 + cw / 2, y0 + ch * 0.48);
      }
      // the sign: a wooden board, the name in ink, or the vacancy notice
      const a = (id % NC) * sw, b = Math.floor(id / NC) * sh;
      sx.fillStyle = h ? '#efe2c8' : '#5a4a3e'; sx.fillRect(a, b, sw, sh);
      sx.strokeStyle = '#2a1410'; sx.lineWidth = 6; sx.strokeRect(a + 3, b + 3, sw - 6, sh - 6);
      sx.textAlign = 'center'; sx.textBaseline = 'middle';
      if (h) {
        sx.fillStyle = NOREN[h.color] || '#b8232c'; sx.fillRect(a + 10, b + 10, 8, sh - 20);
        sx.fillStyle = '#1a1214';
        fit(sx, h.name, sh * 0.42, (s) => `800 ${s}px "Archivo", sans-serif`);
        sx.fillText(h.name, a + sw / 2 + 4, b + sh * 0.42);
        sx.fillStyle = '#6a5a4a'; sx.font = `500 ${sh * 0.17}px "Azeret Mono", monospace`;
        sx.fillText(`No. ${String(id + 1).padStart(2, '0')} · 住`, a + sw / 2 + 4, b + sh * 0.78);
      } else {
        sx.fillStyle = '#f0e6d2'; sx.font = `${sh * 0.36}px "Dela Gothic One", sans-serif`;
        sx.fillText('空き家', a + sw / 2, b + sh * 0.4);
        sx.fillStyle = '#d9c9b0'; sx.font = `500 ${sh * 0.16}px "Azeret Mono", monospace`;
        sx.fillText(`No. ${String(id + 1).padStart(2, '0')} · VACANT`, a + sw / 2, b + sh * 0.78);
      }
    }
    norenTex.needsUpdate = true; signTex.needsUpdate = true;
    // vacancy boards, lanterns
    const zero = new THREE.Vector3(0, 0, 0);
    plots.forEach((p, id) => {
      const h = houses[id];
      const bx = p.doorX - 4.2, bz = p.fence - p.s * 1.6;
      m4.compose(new THREE.Vector3(bx, 1.7, bz), q.setFromAxisAngle(up, p.s > 0 ? 0 : Math.PI), h ? zero : one); vac.setMatrixAt(id, m4);
      [-1, 1].forEach((k, j) => { m4.compose(new THREE.Vector3(bx + k * 1, 1.1, bz - p.s * 0.08), q.identity(), h ? zero : one); stakes.setMatrixAt(id * 2 + j, m4); });
      // one lantern for living there, then one more at 3, 12 and 40 lanterns from visitors
      const n = !h ? 0 : 1 + (h.lanterns >= 3) + (h.lanterns >= 12) + (h.lanterns >= 40);
      p.lant.forEach(([x, y, z], k) => {
        const s = k < n ? one : zero;
        m4.compose(new THREE.Vector3(x, y, z), q.identity(), s); lant.setMatrixAt(id * 4 + k, m4);
        m4.compose(new THREE.Vector3(x, y + 0.6, z), q.identity(), s); caps.setMatrixAt(id * 8 + k * 2, m4);
        m4.compose(new THREE.Vector3(x, y - 0.6, z), q.identity(), s); caps.setMatrixAt(id * 8 + k * 2 + 1, m4);
      });
    });
    [vac, stakes, lant, caps].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); });
    // your house
    mine.visible = myId >= 0 && !!houses[myId];
    if (mine.visible) { const p = plots[myId]; mine.position.set(p.x, 18, p.cz); }
    drawBoard(houses, myId);
  }
  function drawBoard(houses, myId) {
    const x = boardCv.getContext('2d'), w = boardCv.width, h = boardCv.height;
    x.fillStyle = '#3a2418'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#efe4cf'; x.fillRect(22, 22, w - 44, h - 44);
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = '#b8232c'; x.font = '64px "Dela Gothic One", sans-serif'; x.fillText('住人台帳', 56, 84);
    x.fillStyle = '#1a1214'; x.font = '900 40px "Big Shoulders Display", sans-serif'; x.fillText('RESIDENTS OF THE QUARTER', 340, 70);
    const n = houses.filter(Boolean).length;
    x.fillStyle = '#6a5a4a'; x.font = '500 22px "Azeret Mono", monospace'; x.fillText(`${n} of ${PLOTS} houses claimed · tap a house to visit`, 340, 106);
    x.fillStyle = '#b8232c'; x.fillRect(56, 132, w - 112, 3);
    for (let id = 0; id < PLOTS; id++) {
      const hh = houses[id], cx = 56 + Math.floor(id / 12) * ((w - 112) / 2), cy = 166 + (id % 12) * 36;
      x.fillStyle = hh ? NOREN[hh.color] : '#c9bba4';
      x.beginPath(); x.arc(cx + 14, cy, 13, 0, Math.PI * 2); x.fill();
      if (hh) { x.fillStyle = '#fff'; x.font = '15px "Dela Gothic One", sans-serif'; x.textAlign = 'center'; x.fillText([...hh.crest][0] || '', cx + 14, cy + 1); x.textAlign = 'left'; }
      x.fillStyle = hh ? '#1a1214' : '#9a8a74';
      x.font = hh ? '700 22px "Archivo", sans-serif' : '500 19px "Azeret Mono", monospace';
      const label = hh ? hh.name : 'vacant';
      x.fillText(`${String(id + 1).padStart(2, '0')}  ${label.length > 24 ? `${label.slice(0, 23)}…` : label}${id === myId ? '  ← you' : ''}`, cx + 36, cy + 1);
    }
    boardTex.needsUpdate = true;
  }
  apply(new Array(PLOTS).fill(null));

  // ---------- pointing at the houses ----------
  let hover = -1;
  const hit = new THREE.Vector3();
  return {
    group: g, colliders, plots, center: Q,
    apply, get houses() { return state; },
    // the house a ray points at, and how far away it is
    pick(ray) {
      let best = -1, dist = Infinity;
      plots.forEach((p, id) => { if (ray.intersectBox(p.box, hit)) { const d = hit.distanceTo(ray.origin); if (d < dist) { dist = d; best = id; } } });
      return { id: best, dist };
    },
    hover(id) {
      if (id === hover) return;
      hover = id;
      ring.visible = id >= 0;
      if (id >= 0) ring.position.set(plots[id].x, 0.12, plots[id].cz + plots[id].s * 2);
    },
    update(t) {
      if (mine.visible) { mine.position.y = 17 + Math.sin(t * 2) * 0.6; mine.rotation.y = t * 1.2; }
      if (ring.visible) ring.material.opacity = 0.55 + Math.sin(t * 5) * 0.3;
    },
  };
}
