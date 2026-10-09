import * as THREE from 'three';
import { makeRenderer, bentPlane, fitRenderer, smooth, isMobile, adopt, compileAsync } from './utils.js';

// Curved photo cards travel up a 3D spiral around the "Welcome to the arc" title.
export function createOrbit(canvas, textures, shared) {
  const renderer = makeRenderer(canvas, { alpha: true, antialias: !isMobile() });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 13.5);

  const CW = isMobile() ? 2.1 : 2.95, CH = CW * 0.64;
  const geo = bentPlane(CW, CH, 7.8, isMobile() ? 16 : 32);
  const cards = textures.map((tex) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    fitCover(tex, CW / CH);
    const m = new THREE.Mesh(geo, mat);
    scene.add(m);
    return m;
  });

  const state = adopt(shared, { progress: 0, mouseX: 0, mouseY: 0 });
  window.addEventListener('pointermove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth - 0.5);
    state.mouseY = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  // One and a half turns of a gentle helix that stays inside the frame.
  const N0 = -0.55 * Math.PI, N1 = 2.35 * Math.PI;
  const path = (n) => {
    const mob = window.innerWidth < 900;
    const rx = mob ? 2.9 : 5.6;
    const rz = mob ? 2.0 : 3.0;
    const t = (n - N0) / (N1 - N0);
    const ySpan = mob ? 5.2 : 6.2;
    return { x: Math.sin(n) * rx, y: -ySpan / 2 + t * ySpan - Math.cos(n) * 0.35, z: Math.cos(n) * rz - 0.8 };
  };

  function resize() { fitRenderer(renderer, camera, canvas); }
  resize();
  window.addEventListener('resize', resize);

  const total = cards.length;
  const spacing = isMobile() ? 0.8 : 0.64; // radians between cards: just enough for a small gap at the edges
  return {
    state,
    render() {
      const head = N0 + state.progress * (N1 - N0 + total * spacing);
      cards.forEach((m, i) => {
        const n = head - i * spacing;
        const visible = n > N0 && n < N1;
        m.visible = visible;
        if (!visible) return;
        const p = path(n);
        m.position.set(p.x, p.y, p.z);
        m.rotation.set(0, n, 0);
        const fadeIn = smooth(N0, N0 + 0.5, n);
        const fadeOut = 1 - smooth(N1 - 0.5, N1, n);
        m.material.opacity = fadeIn * fadeOut;
        // cards on the far side of the helix render slightly darker for depth
        const back = 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(n));
        m.material.color.setScalar(back);
      });
      scene.rotation.x = state.mouseY * 0.08;
      scene.rotation.y = state.mouseX * 0.12;
      renderer.render(scene, camera);
    },
  };
}

// Crop a texture like CSS object-fit: cover for a plane of the given aspect.
export function fitCover(tex, planeAspect) {
  const img = tex.image;
  if (!img) return;
  const ia = img.width / img.height;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  if (ia > planeAspect) {
    tex.repeat.set(planeAspect / ia, 1);
    tex.offset.set((1 - planeAspect / ia) / 2, 0);
  } else {
    tex.repeat.set(1, ia / planeAspect);
    tex.offset.set(0, (1 - ia / planeAspect) / 2);
  }
  tex.needsUpdate = true;
}
