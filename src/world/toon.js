import * as THREE from 'three';

// Cel shading for the whole world: three flat tones from one light, ink outlines from inverted hulls.
export const PAL = {
  void: 0x060608, ink: 0x0c0c10, steel: 0x1c1a22, wine: 0x2a0b12,
  crimson: 0xe0182d, hot: 0xff4a5c, deep: 0x8e0e1c, ki: 0xffd60a, paper: 0xf4f2ee,
  fog: 0x1a050b,
};

let grad = null;
// three hard steps: shadow, mid, lit
export function gradientMap() {
  if (grad) return grad;
  grad = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter;
  grad.generateMipmaps = false;
  grad.needsUpdate = true;
  return grad;
}

export const toon = (color, opts = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...opts });

// Outline: a back-face copy pushed out along its normals and drawn in ink (works on smooth meshes)
const hulls = new Map();
export function hullMaterial(thickness = 0.08, color = 0x000000) {
  const key = `${thickness}|${color}`;
  if (hulls.has(key)) return hulls.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thickness.toFixed(4)};`);
  };
  m.customProgramCacheKey = () => `hull${thickness}`;
  hulls.set(key, m);
  return m;
}
export function outline(mesh, thickness = 0.08, color = 0x000000) {
  const h = new THREE.Mesh(mesh.geometry, hullMaterial(thickness, color));
  h.raycast = () => {};
  mesh.add(h);
  return mesh;
}

// toon mesh with an outline, positioned
export function part(geo, color, { at = [0, 0, 0], rot = [0, 0, 0], line = 0.08, emissive, mat } = {}) {
  const m = new THREE.Mesh(geo, mat || toon(color, emissive ? { emissive, emissiveIntensity: 1 } : {}));
  m.position.set(...at);
  m.rotation.set(...rot);
  if (line) outline(m, line);
  return m;
}

// unlit glowing material (neon, lamps, screens)
export const glow = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: true, ...opts });

// a canvas texture with text, for signs and screens
export function textTexture(draw, w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
