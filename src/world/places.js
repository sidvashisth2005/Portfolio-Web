import * as THREE from 'three';
import { rng, Bins, box, cyl, place, paint, gableRoof, gableEnd, roofTiles } from './kit.js';
import { toon, glow, textTexture } from './toon.js';
import { LAYOUT } from './land.js';
import { stats, moves, dojos, gallery } from '../data.js';

// The rest of the journey, each section of the portfolio as a place in the village:
//   shrine    · Two sides (Strategist / Builder) on boards beside a path of vermilion torii, battle stats on ema plaques
//   library   · Special moves: an open hall hung with four great project scrolls
//   training  · The training arc: three wooden posts and four stage stones, one per internship
//   memorial  · Flashbacks: a grove of framed photographs round a memorial stone
//   cliff top · On air from a radio mast and hut, and the summit lookout for the last word
const VERMILION = 0xd23a22, BLACK = 0x1f1a1c, WOOD = 0x5a3b2a, STONE = 0x8d847c, PAPER = 0xefe4cf;
const NUM = ['壱', '弐', '参', '肆'];
const fmt = (n) => n.toLocaleString('en-IN');

// a board with painted text, standing on the ground: draw(ctx, w, h) paints it
function board(w, h, draw, px = 512) {
  const tex = textTexture(draw, px, Math.round((px * h) / w));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, fog: true, side: THREE.DoubleSide }));
}
const ink = (x, size, font = '"Dela Gothic One", sans-serif', weight = '') => { x.font = `${weight}${size}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; };
const display = '"Big Shoulders Display", sans-serif', mono = '"Azeret Mono", monospace';

// a vermilion torii: two pillars, the tie beam (nuki) and the black-capped lintel (kasagi) with upturned ends
function torii(bins, x, y, z, ry, s = 1) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, s, s));
  const P = [];
  [-1, 1].forEach((k) => {
    P.push(['ver', cyl(0.55, 0.65, 11, 12, VERMILION, { at: [k * 4, 5.5, 0] })]);
    P.push(['blk', cyl(0.75, 0.75, 1, 12, BLACK, { at: [k * 4, 0.5, 0] })]);
    P.push(['blk', box(1.6, 0.7, 1.4, BLACK, { at: [k * 6.1, 11.9, 0], rot: [0, 0, k * 0.12] })]);
  });
  P.push(['ver', box(10.4, 0.7, 0.7, VERMILION, { at: [0, 8.6, 0] })]);
  P.push(['ver', box(11.2, 0.8, 1.1, VERMILION, { at: [0, 11, 0] })]);
  P.push(['blk', box(10.8, 0.7, 1.4, BLACK, { at: [0, 11.8, 0] })]);
  P.push(['ver', box(0.6, 2, 0.5, VERMILION, { at: [0, 9.9, 0] })]); // the plaque post
  bins.addAll(P, m);
}
// a stone lantern (toro): base, post, the lit fire box, the cap
function toro(bins, lights, x, y, z) {
  bins.add('stone', box(2, 0.6, 2, STONE, { at: [x, y + 0.3, z] }));
  bins.add('stone', cyl(0.35, 0.45, 2.2, 8, STONE, { at: [x, y + 1.7, z] }));
  bins.add('stone', box(1.6, 0.4, 1.6, STONE, { at: [x, y + 2.95, z] }));
  lights.push([x, y + 3.65, z]);
  bins.add('stone', place(paint(new THREE.ConeGeometry(1.5, 1, 4), 0x7a716a), { at: [x, y + 4.8, z], rot: [0, Math.PI / 4, 0] }));
}

export function buildPlaces(scene, { mobile }) {
  const g = new THREE.Group();
  scene.add(g);
  const bins = new Bins();
  const r = rng(31);
  const lights = []; // warm points: lantern fire boxes
  const colliders = [];
  const updates = [];
  const tex = new THREE.TextureLoader();

  // ---------- the shrine: Two sides and Battle stats ----------
  const [sx, sy, sz] = LAYOUT.shrine.at;
  // a stone path from the east, five torii along it, stone lanterns either side
  bins.add('stone', box(84, 0.4, 7, 0xb3a492, { at: [sx + 30, sy + 0.2, sz] }));
  for (let i = 0; i < 5; i++) torii(bins, sx + 60 - i * 9, sy, sz, Math.PI / 2, 1 - i * 0.03);
  for (let i = 0; i < 4; i++) [-1, 1].forEach((k) => toro(bins, lights, sx + 40 - i * 14, sy, sz + k * 7));
  // the hall at the end of the path, facing east
  const hall = new THREE.Matrix4().compose(new THREE.Vector3(sx - 26, sy, sz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1));
  const H = [];
  H.push(['stone', box(26, 2, 20, 0x9a8e84, { at: [0, 1, 0] })]);
  H.push(['wood', box(4, 1, 6, WOOD, { at: [0, 0.5, 12] })]); // steps
  H.push(['plaster', box(20, 9, 14, 0xf0e6d6, { at: [0, 6.5, 0] })]);
  [-10, -3.3, 3.3, 10].forEach((x) => H.push(['ver', box(0.9, 9, 0.9, VERMILION, { at: [x, 6.5, 7.2] })]));
  H.push(['ver', box(21, 0.8, 0.9, VERMILION, { at: [0, 10.6, 7.2] })]);
  H.push(['wood', box(5, 6.4, 0.3, 0x3a2418, { at: [0, 5.2, 7.1] })]);
  gableRoof(20, 14, 5.4, 3, 0x3f7f7a).forEach((p) => H.push(['roof', place(p, { at: [0, 11, 0] })]));
  [-1, 1].forEach((k) => H.push(['plaster', place(gableEnd(20, 5.4, 0.3, 0xf0e6d6), { at: [0, 11, k * 7], rot: [0, k < 0 ? Math.PI : 0, 0] })]));
  bins.addAll(H, hall);
  colliders.push([sx - 26, sz, 14, sy + 17]);
  // Two sides: a pair of great painted boards facing the path, Strategist on the left, Builder on the right
  const sideBoard = (label, kanji, title, items, dark) => board(12, 16, (x, w, h) => {
    x.fillStyle = dark ? '#1a1214' : '#f0e6d6'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#d23a22'; x.lineWidth = 16; x.strokeRect(14, 14, w - 28, h - 28);
    x.fillStyle = '#d23a22'; ink(x, w * 0.07, mono, '500 '); x.fillText(label, w / 2, h * 0.09);
    x.fillStyle = dark ? '#f4ead8' : '#1a1214'; ink(x, w * 0.36); x.fillText(kanji, w / 2, h * 0.27);
    ink(x, w * 0.16, display, '900 '); x.fillText(title, w / 2, h * 0.48);
    x.fillStyle = dark ? '#d9d6de' : '#3a2418'; ink(x, w * 0.064, mono, '500 ');
    items.forEach((t, i) => x.fillText(t, w / 2, h * (0.61 + i * 0.075)));
  });
  const a = sideBoard('SIDE A', '略', 'STRATEGIST', ['MARKET RESEARCH', 'ROI', 'GO-TO-MARKET', 'THE PITCH'], false);
  const b = sideBoard('SIDE B', '技', 'BUILDER', ['PYTHON · ADVERSARIAL ML', 'FLUTTER', 'ARCORE', 'IOT'], true);
  a.position.set(sx + 8, sy + 9.5, sz + 13); a.rotation.y = Math.PI / 2 + 0.55;
  b.position.set(sx + 8, sy + 9.5, sz - 13); b.rotation.y = Math.PI / 2 - 0.55;
  g.add(a, b);
  // each board stands on two posts at its edges
  [a, b].forEach((m) => {
    const rx0 = Math.cos(m.rotation.y), rz0 = -Math.sin(m.rotation.y);
    [-6.2, 6.2].forEach((o) => bins.add('wood', box(0.7, 18, 0.7, WOOD, { at: [m.position.x + rx0 * o, sy + 9, m.position.z + rz0 * o] })));
  });
  // Battle stats: an ema rack on the north side, a wooden plaque per stat, the number and its kanji on each
  const rx = sx - 4, rz = sz - 24;
  bins.add('wood', box(30, 0.8, 0.8, WOOD, { at: [rx, sy + 9, rz] }));
  bins.add('wood', box(30, 0.8, 0.8, WOOD, { at: [rx, sy + 5, rz] }));
  bins.addAll(gableRoof(2.6, 31, 1.2, 0.6, 0x3a3540).map((p) => ['roof', place(p, { at: [0, 0, 0] })]), new THREE.Matrix4().compose(new THREE.Vector3(rx, sy + 10.4, rz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
  [-15, 15].forEach((o) => bins.add('wood', box(0.9, 11, 0.9, WOOD, { at: [rx + o, sy + 5.5, rz] })));
  stats.forEach((st, i) => {
    const e = board(4.4, 3.8, (x, w, h) => {
      x.fillStyle = '#c99a62'; x.beginPath(); x.moveTo(0, h * 0.28); x.lineTo(w / 2, 0); x.lineTo(w, h * 0.28); x.lineTo(w, h); x.lineTo(0, h); x.closePath(); x.fill();
      x.strokeStyle = '#6b4630'; x.lineWidth = 10; x.stroke();
      x.fillStyle = 'rgba(184,35,44,.25)'; ink(x, w * 0.6); x.fillText(st.kanji, w * 0.5, h * 0.55);
      x.fillStyle = '#1a1214'; ink(x, w * 0.3, display, '900 '); x.fillText(`${fmt(st.value)}${st.suffix}`, w / 2, h * 0.5);
      x.fillStyle = '#b8232c'; ink(x, w * 0.075, mono, '500 '); x.fillText(st.type.toUpperCase(), w / 2, h * 0.78);
      x.fillStyle = '#3a2418'; x.fillText(st.rarity, w / 2, h * 0.9);
    }, 256);
    e.material.transparent = true;
    e.position.set(rx - 12.5 + i * 5, sy + 6.8 + (i % 2) * 0.25, rz + 0.5);
    e.rotation.z = (r() - 0.5) * 0.1;
    g.add(e);
    updates.push((t) => { e.rotation.z = Math.sin(t * 1.3 + i) * 0.04; });
  });

  // ---------- the library: Special moves ----------
  const [lx, , lz] = LAYOUT.library.at;
  const lf = Math.atan2(-lx, -lz); // the open front faces the heart of the village
  const LM = new THREE.Matrix4().compose(new THREE.Vector3(lx, 0, lz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), lf), new THREE.Vector3(1, 1, 1));
  const L = [];
  L.push(['stone', box(48, 1.6, 26, 0x9a8e84, { at: [0, 0.8, 0] })]);
  L.push(['plaster', box(46, 16, 1, 0xe9dcc6, { at: [0, 9.6, -11.5] })]); // back wall
  [-1, 1].forEach((k) => L.push(['plaster', box(1, 16, 23, 0xe9dcc6, { at: [k * 22.5, 9.6, 0] })]));
  for (let i = 0; i < 7; i++) L.push(['wood', box(1, 16, 1, 0x4a2e22, { at: [-21 + i * 7, 9.6, 11.6] })]); // open colonnade
  L.push(['wood', box(46, 1.4, 1.2, 0x4a2e22, { at: [0, 17.2, 11.6] })]);
  gableRoof(46, 25, 7, 3.4, 0x3a3540).forEach((p) => L.push(['roof', place(p, { at: [0, 17.6, 0] })]));
  [-1, 1].forEach((k) => L.push(['plaster', place(gableEnd(25, 7, 0.4, 0xe9dcc6), { at: [k * 23, 17.6, 0], rot: [0, k * Math.PI / 2, 0] })]));
  // shelves of rolled scrolls along the side walls
  [-1, 1].forEach((k) => {
    L.push(['wood', box(2, 10, 18, 0x5a3424, { at: [k * 20.5, 6.6, 0] })]);
    for (let j = 0; j < 18; j++) L.push(['paper', cyl(0.35, 0.35, 1.8, 8, j % 3 ? PAPER : 0xd8b48e, { at: [k * 19.6, 3 + (j % 4) * 2.4, -7.5 + Math.floor(j / 4) * 3.6], rot: [0, 0, Math.PI / 2] })]);
  });
  bins.addAll(L, LM);
  colliders.push([lx, lz, 24, 26]);
  const scrollGroup = new THREE.Group();
  scrollGroup.applyMatrix4(LM);
  g.add(scrollGroup);
  moves.forEach((mv, i) => {
    const s = board(8, 13, (x, w, h) => {
      x.fillStyle = '#efe4cf'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#7a1d24'; x.fillRect(0, 0, w, h * 0.05); x.fillRect(0, h * 0.95, w, h * 0.05);
      x.fillStyle = '#b8232c'; ink(x, w * 0.56); x.fillText(mv.kanji, w / 2, h * 0.3);
      x.fillStyle = '#1a1214'; ink(x, w * 0.15, display, '900 ');
      const words = mv.label.toUpperCase().split(' ');
      words.forEach((wd, k) => x.fillText(wd, w / 2, h * (0.58 + k * 0.1)));
      x.fillStyle = '#b8232c'; ink(x, w * 0.2, display, '900 '); x.fillText(mv.big, w / 2, h * 0.8);
      x.fillStyle = '#5a3b2a'; ink(x, w * 0.055, mono, '500 '); x.fillText(mv.technique.toUpperCase(), w / 2, h * 0.89);
    }, 384);
    s.position.set(-15 + i * 10, 9.6, -10.6);
    scrollGroup.add(s);
    [16.4, 2.8].forEach((y) => { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 9, 8), toon(0x3a2418)); rod.rotation.z = Math.PI / 2; rod.position.set(-15 + i * 10, y, -10.4); scrollGroup.add(rod); });
    lights.push(new THREE.Vector3(-15 + i * 10, 18.5, -8).applyMatrix4(LM).toArray());
  });

  // ---------- the training ground: the Training arc ----------
  const [tx, , tz] = LAYOUT.training.at;
  const tg = new THREE.Mesh(new THREE.CircleGeometry(40, 48).rotateX(-Math.PI / 2), toon(0xa88a62));
  tg.position.set(tx, 0.08, tz);
  g.add(tg);
  // a low fence round the ring
  for (let i = 0; i < 40; i++) { const a2 = (i / 40) * Math.PI * 2; bins.add('wood', box(0.5, 2.4, 0.5, WOOD, { at: [tx + Math.cos(a2) * 40, 1.2, tz + Math.sin(a2) * 40] })); }
  for (let i = 0; i < 40; i++) { const a2 = ((i + 0.5) / 40) * Math.PI * 2; bins.add('wood', box(0.3, 0.3, 6.3, WOOD, { at: [tx + Math.cos(a2) * 40, 2, tz + Math.sin(a2) * 40], rot: [0, -a2, 0] })); }
  // the three wooden posts
  [-6, 0, 6].forEach((o, i) => {
    bins.add('wood', cyl(0.9, 1, 7, 10, 0x8a6a4a, { at: [tx + o, 3.5, tz + 10 + (i === 1 ? -2 : 0)] }));
    bins.add('rope', cyl(1.05, 1.05, 0.5, 10, 0xd8c9a0, { at: [tx + o, 4.6, tz + 10 + (i === 1 ? -2 : 0)] }));
  });
  colliders.push([tx, tz + 9, 9, 7.5]);
  // four stage stones in an arc, newest on the right, each carved with its stage, place, years and result
  const stages = [...dojos].reverse();
  stages.forEach((d, i) => {
    const ang = Math.PI * (0.62 + i * 0.25); // arc behind the posts, facing the posts
    const px = tx + Math.cos(ang) * 22, pz = tz - Math.sin(ang) * 22;
    bins.add('stone', box(7, 1, 3, 0x7f766e, { at: [px, 0.5, pz] }));
    const st = board(6, 9, (x, w, h) => {
      x.fillStyle = '#8f877e'; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 40; k++) x.fillRect(r() * w, r() * h, 2 + r() * 8, 2);
      x.fillStyle = '#d23a22'; ink(x, w * 0.34); x.fillText(NUM[i], w / 2, h * 0.17);
      x.fillStyle = '#1a1214'; ink(x, w * 0.15, display, '900 ');
      (d.short || d.company).toUpperCase().split(' ').forEach((wd, k) => x.fillText(wd, w / 2, h * (0.38 + k * 0.1)));
      x.fillStyle = '#3a2418'; ink(x, w * 0.06, mono, '500 '); x.fillText(d.period.toUpperCase(), w / 2, h * 0.62);
      x.fillStyle = '#b8232c'; ink(x, w * 0.24, display, '900 '); x.fillText(d.metric, w / 2, h * 0.8);
    }, 256);
    st.position.set(px, 5.5, pz);
    st.lookAt(tx, 5.5, tz + 10);
    g.add(st);
    const back = new THREE.Mesh(new THREE.BoxGeometry(6.4, 9.4, 1.4), toon(0x7f766e));
    back.position.copy(st.position); back.quaternion.copy(st.quaternion); back.translateZ(-0.75);
    g.add(back);
  });

  // ---------- the memorial grove: Flashbacks ----------
  const [mx, , mz] = LAYOUT.memorial.at;
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(4.4, 0).scale(0.8, 1.6, 0.5), toon(0x5f5852));
  stone.position.set(mx, 6, mz - 4);
  g.add(stone);
  bins.add('stone', box(14, 1, 8, 0x8d847c, { at: [mx, 0.5, mz - 4] }));
  colliders.push([mx, mz - 4, 6, 12]);
  const photos = gallery.slice(0, mobile ? 6 : 10);
  photos.forEach((ph, i) => {
    const n = photos.length, a2 = Math.PI * (1.15 + (i / (n - 1)) * 0.7); // a half ring opening toward the street
    const fx = mx + Math.cos(a2) * 20, fz = mz - Math.sin(a2) * 20 - 4;
    const frame = new THREE.Group();
    frame.position.set(fx, 0, fz);
    frame.lookAt(mx, 0, mz - 4); // each photograph faces the stone, and the street beyond it
    g.add(frame);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.9), new THREE.MeshBasicMaterial({ color: 0x3a3030, fog: true, side: THREE.DoubleSide }));
    pic.position.y = 6.2;
    frame.add(pic);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(6, 4.7, 0.4), toon(0x3a2418));
    rim.position.set(0, 6.2, -0.25);
    frame.add(rim);
    [-2.4, 2.4].forEach((o) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.5, 0.4), toon(0x3a2418)); p.position.set(o, 2.2, -0.25); frame.add(p); });
    tex.load(ph.src.replace('gallery/', 'gallery/gl/'), (t) => { t.colorSpace = THREE.SRGBColorSpace; pic.material.map = t; pic.material.color.set(0xffffff); pic.material.needsUpdate = true; }, undefined, () => {});
  });

  // ---------- the cliff top: On air and the summit ----------
  const cz = LAYOUT.cliffZ, top = 200;
  const MX = 70;
  bins.add('stone', box(16, 50, 16, 0x8a6f62, { at: [MX, top - 23, cz] }));
  bins.add('stone', box(14, 46, 12, 0x8a6f62, { at: [MX - 12, top - 23, cz + 2] }));
  // a lattice radio mast
  for (let k = 0; k < 4; k++) {
    const ax = (k & 1 ? 1 : -1) * 2.4, az = (k & 2 ? 1 : -1) * 2.4;
    bins.add('ver', box(0.35, 36, 0.35, k % 2 ? VERMILION : 0xf0e6d6, { at: [MX + ax * 0.6, top + 20, cz + az * 0.6], rot: [az * -0.03, 0, ax * 0.03] }));
  }
  for (let y = 0; y < 12; y++) bins.add('ver', box(4.2 - y * 0.18, 0.25, 0.25, y % 2 ? VERMILION : 0xf0e6d6, { at: [MX, top + 3 + y * 3, cz + 2.2 - y * 0.08] }));
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), glow(0xff3347, { transparent: true }));
  beacon.position.set(MX, top + 38.5, cz);
  g.add(beacon);
  updates.push((t) => { beacon.material.opacity = Math.sin(t * 3) > 0 ? 1 : 0.2; });
  // the radio hut with its ON AIR sign
  const hut = new THREE.Matrix4().makeTranslation(MX - 12, top, cz + 2);
  const HU = [['plaster', box(9, 6, 7, 0xe9dcc6, { at: [0, 3, 0] })], ['wood', box(2, 4, 0.3, 0x3a2418, { at: [1.5, 2, 3.6] })]];
  gableRoof(9, 7, 2.4, 1, 0xb3262e).forEach((p) => HU.push(['roof', place(p, { at: [0, 6, 0] })]));
  [-1, 1].forEach((k) => HU.push(['plaster', place(gableEnd(9, 2.4, 0.3, 0xe9dcc6), { at: [0, 6, k * 3.5], rot: [0, k < 0 ? Math.PI : 0, 0] })]));
  bins.addAll(HU, hut);
  const onair = board(5, 1.6, (x, w, h) => {
    x.fillStyle = '#1a0a0e'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#ff3347'; x.shadowColor = '#ff3347'; x.shadowBlur = 24; ink(x, h * 0.55, display, '900 '); x.fillText('ON AIR', w / 2, h * 0.54);
  }, 512);
  onair.position.set(MX - 13.5, top + 4.8, cz + 5.62);
  g.add(onair);
  updates.push((t) => { onair.material.color.setScalar(Math.sin(t * 1.6) > -0.6 ? 1 : 0.35); });
  // the summit lookout: a deck with a rail and a crimson banner
  const SX = -40;
  bins.add('stone', box(22, 50, 16, 0x8a6f62, { at: [SX, top - 24, cz + 10] }));
  bins.add('wood', box(20, 0.8, 14, 0x6b4630, { at: [SX, top + 1.4, cz + 10] }));
  for (let i = 0; i < 9; i++) bins.add('wood', box(0.4, 2.2, 0.4, 0x4a2e22, { at: [SX - 9.6 + i * 2.4, top + 2.9, cz + 16.8] }));
  bins.add('wood', box(20, 0.3, 0.4, 0x4a2e22, { at: [SX, top + 3.9, cz + 16.8] }));
  bins.add('wood', cyl(0.25, 0.25, 14, 6, 0x3a2418, { at: [SX + 8, top + 8.5, cz + 6] }));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.6, 8, 1), new THREE.MeshBasicMaterial({ map: textTexture((x, w, h) => { x.fillStyle = '#e0182d'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; ink(x, h * 0.6); x.fillText('閃', w / 2, h * 0.54); }, 256, 154), side: THREE.DoubleSide, fog: true }));
  flag.position.set(SX + 11.1, top + 13.6, cz + 6);
  g.add(flag);
  const fp = flag.geometry.attributes.position, fx0 = Float32Array.from(fp.array);
  updates.push((t) => { for (let i = 0; i < fp.count; i++) { const x = fx0[i * 3]; fp.setZ(i, Math.sin(t * 4 + x * 1.2) * 0.35 * (x + 3) / 6); } fp.needsUpdate = true; });

  // the lantern and lamp lights
  const lg = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), glow(0xffb070), lights.length);
  const m4 = new THREE.Matrix4();
  lights.forEach(([x, y, z], i) => { m4.makeTranslation(x, y, z); lg.setMatrixAt(i, m4); });
  g.add(lg);

  bins.build({
    ver: toon(0xffffff, { vertexColors: true }), blk: toon(0xffffff, { vertexColors: true }), stone: toon(0xffffff, { vertexColors: true }),
    wood: toon(0xffffff, { vertexColors: true }), plaster: toon(0xffffff, { vertexColors: true }), paper: toon(0xffffff, { vertexColors: true }),
    rope: toon(0xffffff, { vertexColors: true }), roof: toon(0xffffff, { vertexColors: true, map: roofTiles() }),
  }, g);
  return { group: g, colliders, update: (t) => updates.forEach((f) => f(t)) };
}
