import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Small modelling kit: coloured, placed pieces that merge into one mesh per material (few draw calls for a whole village).

// seeded random, so the village is the same on every visit
export function rng(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// value noise and fbm for terrain and rock
const P = new Uint8Array(512);
{
  const r = rng(1234);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
}
const fade = (t) => t * t * (3 - 2 * t);
export function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => P[(P[(xi + i) & 255] + yi + j) & 255] / 255;
  const u = fade(xf), v = fade(yf);
  return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
}
export function fbm(x, y, oct = 4) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// geometry pieces carry a vertex colour; transform then collect
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function paint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}
export function place(geo, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  _m.compose(_p.set(...at), _q.setFromEuler(_e.set(...rot)), _s.set(...scale));
  geo.applyMatrix4(_m);
  return geo;
}

// a bin of pieces per material, merged at the end
export class Bins {
  constructor() { this.bins = new Map(); }
  add(key, geo) { if (!this.bins.has(key)) this.bins.set(key, []); this.bins.get(key).push(geo); return geo; }
  // add a whole group's pieces, transformed by a parent matrix (a house placed and turned on its lot)
  addAll(list, matrix) { list.forEach(([key, g]) => this.add(key, g.applyMatrix4(matrix))); }
  build(materials, parent) {
    for (const [key, list] of this.bins) {
      if (!list.length || !materials[key]) continue;
      const geo = mergeGeometries(list, false);
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, materials[key]);
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.bins.clear();
  }
}

// pieces, built at the origin and placed later
export const box = (w, h, d, color, o) => place(paint(new THREE.BoxGeometry(w, h, d), color), o);
export const cyl = (rt, rb, h, seg, color, o) => place(paint(new THREE.CylinderGeometry(rt, rb, h, seg), color), o);
export const sphere = (r, color, o, ws = 10, hs = 8) => place(paint(new THREE.SphereGeometry(r, ws, hs), color), o);

// a pitched roof: two tiled slabs meeting at a ridge, overhanging the walls, with gable ends.
// UVs run in metres so a tile texture repeats at the same size on every roof.
export function gableRoof(w, d, rise, over, color, tile = 0.9) {
  const out = [];
  const half = w / 2 + over;
  const slope = Math.hypot(half, rise);
  const ang = Math.atan2(rise, half);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(slope, 0.35, d + over * 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * slope / tile, uv.getY(i) * (d + over * 2) / tile);
    out.push(place(paint(g, color), { at: [s * half / 2, rise / 2, 0], rot: [0, 0, -s * ang] }));
  }
  // ridge cap
  out.push(place(paint(new THREE.BoxGeometry(0.7, 0.5, d + over * 2 + 0.3), 0x2a2228), { at: [0, rise + 0.1, 0] }));
  return out;
}
// the triangle under a gable, as wall
export function gableEnd(w, rise, depth, color) {
  const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return paint(g, color);
}

// a tile texture: dark grooves between rows of round tiles, multiplied with each roof's colour
let tileTex = null;
export function roofTiles() {
  if (tileTex) return tileTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, '#8a8a8a'); gr.addColorStop(0.18, '#ffffff'); gr.addColorStop(0.6, '#e8e8e8'); gr.addColorStop(0.92, '#9a9a9a'); gr.addColorStop(1, '#6a6a6a');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 58, 64, 6);
  tileTex = new THREE.CanvasTexture(c);
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  tileTex.colorSpace = THREE.SRGBColorSpace;
  return tileTex;
}
