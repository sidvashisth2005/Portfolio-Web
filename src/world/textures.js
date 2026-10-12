import * as THREE from 'three';
import { rng } from './kit.js';

// Surface textures for the village, painted procedurally on canvases (no image files, nothing borrowed).
// They are near-white so each piece's own vertex colour still sets its hue; the texture adds the material:
// weathered plaster, timber boards, cut stone, straw thatch, paving slabs, rock. Applied by world position
// (triplanar), so a texel is the same size on every wall whatever the building's size.
const cache = new Map();
function canvasTex(key, size, paint) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  paint(g, size, rng(key.length * 977 + size));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}
const blot = (g, r, s, n, color, min, max) => {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rr = min + r() * (max - min);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    // wrap so the tile repeats seamlessly
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.save(); g.translate(dx, dy); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); }
  }
};

// weathered plaster: soft stains, rain streaks running down, a fine grain
export const plaster = () => canvasTex('plaster', 512, (g, s, r) => {
  g.fillStyle = '#f4efe6'; g.fillRect(0, 0, s, s);
  blot(g, r, s, 26, 'rgba(120,100,80,.10)', 30, 110);
  blot(g, r, s, 18, 'rgba(255,255,255,.35)', 20, 70);
  for (let i = 0; i < 70; i++) {
    const x = r() * s, len = 40 + r() * 200, y = r() * s;
    g.fillStyle = `rgba(90,75,60,${0.03 + r() * 0.05})`;
    g.fillRect(x, y, 1 + r() * 2.5, len); g.fillRect(x, y - s, 1 + r() * 2.5, len);
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * s, r() * s, 1.4, 1.4); }
});

// timber boards: vertical planks with grain, dark joints, a few knots
export const wood = () => canvasTex('wood', 512, (g, s, r) => {
  const n = 8, w = s / n;
  for (let i = 0; i < n; i++) {
    const v = 225 + Math.floor(r() * 30);
    g.fillStyle = `rgb(${v},${v - 8},${v - 20})`; g.fillRect(i * w, 0, w, s);
    for (let k = 0; k < 26; k++) {
      g.strokeStyle = `rgba(80,50,30,${0.05 + r() * 0.1})`; g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath();
      const x0 = i * w + r() * w;
      g.moveTo(x0, 0);
      for (let y = 0; y <= s; y += 32) g.lineTo(x0 + Math.sin(y * 0.02 + k) * 3, y);
      g.stroke();
    }
    if (r() < 0.5) { const ky = r() * s; g.fillStyle = 'rgba(70,40,25,.35)'; g.beginPath(); g.ellipse(i * w + w / 2, ky, 4, 9, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(40,24,16,.55)'; g.fillRect(i * w, 0, 3, s);
  }
});

// cut stone: courses of blocks with mortar joints and chipped faces
export const stone = () => canvasTex('stone', 512, (g, s, r) => {
  g.fillStyle = '#9a948c'; g.fillRect(0, 0, s, s);
  const rows = 6, rh = s / rows;
  for (let j = 0; j < rows; j++) {
    let x = -(j % 2) * 40;
    while (x < s) {
      const bw = 70 + r() * 70, v = 200 + Math.floor(r() * 50);
      g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      g.fillRect(x + 3, j * rh + 3, bw - 6, rh - 6);
      if (x + bw > s) g.fillRect(x + 3 - s, j * rh + 3, bw - 6, rh - 6);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(x + r() * bw, j * rh + r() * rh, 2 + r() * 6, 2 + r() * 4); }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 3, j * rh + 3, bw - 6, 3);
      x += bw;
    }
  }
});

// straw thatch: dense vertical strands, layered in bands
export const thatch = () => canvasTex('thatch', 512, (g, s, r) => {
  g.fillStyle = '#d8b35c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const x = r() * s, y = r() * s, len = 20 + r() * 60;
    const v = 150 + Math.floor(r() * 105);
    g.strokeStyle = `rgba(${v},${Math.floor(v * 0.8)},${Math.floor(v * 0.35)},.55)`; g.lineWidth = 1 + r() * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + len); g.stroke();
  }
  for (let j = 1; j < 4; j++) { g.fillStyle = 'rgba(70,45,15,.35)'; g.fillRect(0, j * (s / 4) - 3, s, 5); }
});

// paving: square slabs with worn joints
export const paving = () => canvasTex('paving', 512, (g, s, r) => {
  g.fillStyle = '#857a6c'; g.fillRect(0, 0, s, s);
  const n = 4, w = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 205 + Math.floor(r() * 45);
    g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
    g.fillRect(i * w + 3, j * w + 3, w - 6, w - 6);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(i * w + r() * w, j * w + r() * w, 2 + r() * 5, 2); }
  }
});

// rock: layered sandstone with cracks, for the cliff
export const rock = () => canvasTex('rock', 512, (g, s, r) => {
  g.fillStyle = '#d9c4b0'; g.fillRect(0, 0, s, s);
  blot(g, r, s, 40, 'rgba(110,70,40,.16)', 30, 120);
  blot(g, r, s, 30, 'rgba(255,240,220,.22)', 20, 80);
  for (let j = 0; j < 14; j++) { g.fillStyle = `rgba(90,60,40,${0.06 + r() * 0.08})`; const y = r() * s; g.fillRect(0, y, s, 2 + r() * 5); }
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(60,35,25,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 2;
    g.beginPath(); let x = r() * s, y = r() * s; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += 10 + r() * 30; g.lineTo(x, y); }
    g.stroke();
  }
});

// grass: tufts and patches for the valley floor
export const grass = () => canvasTex('grass', 512, (g, s, r) => {
  g.fillStyle = '#e8eedd'; g.fillRect(0, 0, s, s);
  blot(g, r, s, 30, 'rgba(60,90,20,.14)', 30, 120);
  blot(g, r, s, 20, 'rgba(255,255,220,.25)', 20, 80);
  for (let i = 0; i < 5000; i++) {
    const v = Math.floor(r() * 60);
    g.strokeStyle = `rgba(${40 + v},${90 + v},${20},.25)`; g.lineWidth = 1;
    const x = r() * s, y = r() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 6); g.stroke();
  }
});

// the stadium's red outer boards: vertical planks with grey bands
export const boards = () => canvasTex('boards', 512, (g, s, r) => {
  const n = 16, w = s / n;
  for (let i = 0; i < n; i++) { const v = 220 + Math.floor(r() * 35); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * w, 0, w, s); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(i * w, 0, 2.5, s); }
  for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * s, r() * s, 1.5, 4); }
});
