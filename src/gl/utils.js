import * as THREE from 'three';

export const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
export const dpr = () => Math.min(window.devicePixelRatio || 1, isMobile() ? 1.25 : 1.6);

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function makeRenderer(canvas, { alpha = true, antialias = true, pixelRatio = dpr() } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha, antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

// A plane bent around a vertical cylinder of the given radius (the "curved screen" look).
export function bentPlane(width, height, radius, segments = 32) {
  const g = new THREE.PlaneGeometry(width, height, segments, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i) / radius;
    pos.setX(i, Math.sin(a) * radius);
    pos.setZ(i, (Math.cos(a) - 1) * radius);
  }
  g.computeVertexNormals();
  return g;
}

const loader = new THREE.TextureLoader();
export function loadTexture(url, manager) {
  return new Promise((resolve) => {
    manager?.start(url);
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        manager?.done(url);
        resolve(t);
      },
      undefined,
      () => {
        manager?.done(url);
        resolve(null);
      },
    );
  });
}

// Sizes a canvas to its CSS box and keeps renderer + camera in sync.
export function fitRenderer(renderer, camera, canvas) {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  if (camera && camera.isPerspectiveCamera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  return { w, h };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
