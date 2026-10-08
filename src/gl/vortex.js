import * as THREE from 'three';
import { makeRenderer, bentPlane, fitRenderer, isMobile, lerp } from './utils.js';
import { fitCover } from './orbit.js';

// A descending spiral tower of curved photo strips. Scroll spins it and lifts it past the camera
// while a cut-out of Siddhant free-falls through the middle.
export function createVortex(canvas, textures, fallerTex) {
  const renderer = makeRenderer(canvas, { alpha: true, antialias: !isMobile() });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.2, 12.5);
  camera.lookAt(0, 0, 0);

  const radius = 4.2;
  const tower = new THREE.Group();
  scene.add(tower);
  const pw = 2.9, ph = 1.9;
  const geo = bentPlane(pw, ph, radius, isMobile() ? 12 : 24);
  const count = textures.length * 2;
  for (let i = 0; i < count; i++) {
    const src = textures[i % textures.length];
    const tex = src.clone();
    tex.needsUpdate = true;
    fitCover(tex, pw / ph);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
    const m = new THREE.Mesh(geo, mat);
    const a = i * 0.62;
    const pivot = new THREE.Group();
    pivot.rotation.y = a;
    pivot.position.y = -i * 0.5 + 5;
    m.position.z = radius;
    pivot.add(m);
    tower.add(pivot);
  }

  // The faller: cut-out with a dark echo behind it
  const fallerGroup = new THREE.Group();
  if (fallerTex) {
    const img = fallerTex.image;
    const wide = img.width > img.height;
    const h = wide ? 3.6 : 4.6, w = h * (img.width / img.height);
    const fg = new THREE.PlaneGeometry(w, h);
    const front = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: fallerTex, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide }));
    const echo = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ map: fallerTex, color: 0xe0182d, transparent: true, opacity: 0.55, alphaTest: 0.02, side: THREE.DoubleSide }));
    echo.position.set(0.12, -0.1, -0.08);
    echo.scale.setScalar(1.04);
    fallerGroup.add(echo, front);
  }
  scene.add(fallerGroup);

  const state = { progress: 0, current: 0 };
  function resize() {
    fitRenderer(renderer, camera, canvas);
    const s = window.innerWidth < 900 ? 0.72 : 1;
    tower.scale.setScalar(s);
    fallerGroup.scale.setScalar(window.innerWidth < 900 ? 0.62 : 0.9);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    state,
    render(time) {
      state.current = lerp(state.current, state.progress, 0.08);
      const p = state.current;
      tower.rotation.y = p * Math.PI * 3.2 + time * 0.05;
      tower.position.y = p * (count * 0.5 - 6);
      fallerGroup.position.set(Math.sin(p * 9 + time * 0.6) * 0.5, Math.sin(time * 1.2) * 0.25 - 0.4, 2.2);
      fallerGroup.rotation.set(Math.sin(time * 0.7) * 0.12, Math.sin(p * 6) * 0.35, Math.sin(time * 0.9 + p * 4) * 0.22);
      renderer.render(scene, camera);
    },
  };
}
