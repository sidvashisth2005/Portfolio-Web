import * as THREE from 'three';
import { makeRenderer, bentPlane, fitRenderer, smooth, isMobile } from './utils.js';

// Curved photo cards travel up a 3D spiral around the "Welcome to the arc" title.
export function createOrbit(canvas, textures) {
  const renderer = makeRenderer(canvas, { alpha: true, antialias: !isMobile() });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 13.5);

  const geo = bentPlane(3.35, 2.1, 7.8, isMobile() ? 16 : 32);
  const cards = textures.map((tex) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0 });
    fitCover(tex, 3.35 / 2.1);
    const m = new THREE.Mesh(geo, mat);
    scene.add(m);
    return m;
  });

  const state = { progress: 0, mouseX: 0, mouseY: 0 };
  window.addEventListener('pointermove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth - 0.5);
    state.mouseY = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  const path = (n) => {
    const mob = window.innerWidth < 900;
    const rx = mob ? 3.6 : 5.8;
    const rz = mob ? 2.4 : 3.6;
    const x = Math.sin(n) * rx;
    const z = Math.cos(n) * rz;
    const y = -Math.cos(n) * 1.4 + (n + 0.5 * Math.PI) * (mob ? 0.95 : 1.05) - (mob ? 2.6 : 3.4);
    return { x, y, z };
  };

  function resize() { fitRenderer(renderer, camera, canvas); }
  resize();
  window.addEventListener('resize', resize);

  const total = cards.length;
  const spacing = 0.42;
  return {
    state,
    render() {
      // progress 0..1 slides every card through the path window [-0.65π, 2.45π]
      const head = -0.65 * Math.PI + state.progress * (3.1 * Math.PI + total * spacing);
      cards.forEach((m, i) => {
        const n = head - i * spacing;
        const visible = n > -0.65 * Math.PI && n < 2.45 * Math.PI;
        m.visible = visible;
        if (!visible) return;
        const p = path(n);
        m.position.set(p.x, p.y, p.z);
        m.rotation.set(0, n, 0);
        const fadeIn = smooth(-0.65 * Math.PI, -0.1 * Math.PI, n);
        const fadeOut = 1 - smooth(1.9 * Math.PI, 2.45 * Math.PI, n);
        m.material.opacity = fadeIn * fadeOut;
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
