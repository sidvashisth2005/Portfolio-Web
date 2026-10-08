import * as THREE from 'three';
import { makeRenderer, fitRenderer, isMobile, lerp, smooth } from './utils.js';

// Project "technique cards": curved posters that fly in and out of the centre as you scroll.
// Speed drives an RGB split (the glitch cut), distance from centre drives curvature.
const vert = /* glsl */ `
uniform float uBend;
uniform float uTime;
uniform float uSpeed;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  p.z -= (p.x * p.x) * uBend;
  p.z += sin(p.y * 2.0 + uTime * 3.0) * uSpeed * 0.25;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const frag = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uShift;
uniform float uHover;
varying vec2 vUv;
void main(){
  vec2 o = vec2(uShift, 0.0);
  float r = texture2D(uMap, vUv + o).r;
  float g = texture2D(uMap, vUv).g;
  float b = texture2D(uMap, vUv - o).b;
  vec3 col = vec3(r, g, b);
  float edge = smoothstep(0.0, 0.02, vUv.x) * smoothstep(1.0, 0.98, vUv.x) * smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.97, vUv.y);
  col *= 0.85 + uHover * 0.15;
  gl_FragColor = vec4(col, uOpacity * edge);
}`;

function poster(move, img) {
  const W = 1600, H = 1000;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#111116';
  g.fillRect(0, 0, W, H);
  if (img) {
    const ia = img.width / img.height, ca = W / H;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ia > ca) { sw = img.height * ca; sx = (img.width - sw) / 2; } else { sh = img.width / ca; sy = (img.height - sh) / 2; }
    g.filter = 'grayscale(0.25) contrast(1.1) brightness(0.5)';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    g.filter = 'none';
  }
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(6,6,8,0.1)');
  grad.addColorStop(1, 'rgba(6,6,8,0.95)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // crimson speed lines from the right edge
  g.save();
  g.globalAlpha = 0.18;
  g.strokeStyle = '#E0182D';
  g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y = (i / 26) * H;
    g.beginPath(); g.moveTo(W, H * 0.4); g.lineTo(W * 0.55, y); g.stroke();
  }
  g.restore();
  g.fillStyle = 'rgba(224,24,45,0.85)';
  g.font = '520px "Dela Gothic One", sans-serif';
  g.textAlign = 'right';
  g.textBaseline = 'middle';
  g.fillText(move.kanji, W - 40, H * 0.42);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#FF4A5C';
  g.font = '500 30px "Azeret Mono", monospace';
  g.fillText(`${move.category}  ·  ${move.technique}`.toUpperCase(), 64, H - 330);
  g.fillStyle = '#F4F2EE';
  g.font = '900 230px "Big Shoulders Display", sans-serif';
  g.fillText(move.big, 56, H - 120);
  g.font = '700 40px "Schibsted Grotesk", sans-serif';
  g.fillText(move.bigLabel, 64, H - 60);
  if (move.award) {
    g.font = '500 28px "Azeret Mono", monospace';
    const t = move.award.toUpperCase();
    const w = g.measureText(t).width + 44;
    g.fillStyle = '#FFD60A';
    roundRect(g, 56, 56, w, 60, 30); g.fill();
    g.fillStyle = '#060608';
    g.fillText(t, 78, 97);
  }
  g.strokeStyle = 'rgba(224,24,45,0.6)';
  g.lineWidth = 4;
  roundRect(g, 2, 2, W - 4, H - 4, 36); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export function createMoves(canvas, moves, images) {
  const renderer = makeRenderer(canvas, { alpha: true, antialias: !isMobile() });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  const geo = new THREE.PlaneGeometry(8.6, 5.375, isMobile() ? 16 : 40, 8);
  const meshes = moves.map((mv, i) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: poster(mv, images[i]) }, uOpacity: { value: 0 }, uShift: { value: 0 }, uBend: { value: 0 }, uTime: { value: 0 }, uSpeed: { value: 0 }, uHover: { value: 0 } },
      vertexShader: vert, fragmentShader: frag, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    scene.add(m);
    return m;
  });

  const state = { target: 0, current: 0, mx: 0, my: 0 };
  window.addEventListener('pointermove', (e) => {
    state.mx = e.clientX / window.innerWidth - 0.5;
    state.my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function resize() {
    fitRenderer(renderer, camera, canvas);
    const wide = window.innerWidth >= 1100;
    const s = window.innerWidth < 900 ? 0.62 : wide ? 0.84 : 0.8;
    scene.scale.setScalar(s);
    scene.position.set(wide ? 0.9 : 0, window.innerWidth < 1100 ? 0.9 : 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    state,
    render(time) {
      const prev = state.current;
      state.current = lerp(state.current, state.target, 0.075);
      const speed = Math.min(1, Math.abs(state.current - prev) * 18);
      meshes.forEach((m, i) => {
        const d = i - state.current;
        const ad = Math.abs(d);
        m.position.set(d * 9.5, -ad * 0.4, -ad * 5);
        m.rotation.set(state.my * 0.12, -d * 0.5 + state.mx * 0.25, d * 0.04);
        const s = 1 - Math.min(ad, 1.5) * 0.18;
        m.scale.setScalar(s);
        const u = m.material.uniforms;
        u.uOpacity.value = 1 - smooth(0.25, 0.9, ad);
        u.uBend.value = 0.012 + Math.min(ad, 1.2) * 0.03;
        u.uShift.value = speed * 0.012 * (d > 0 ? 1 : -1) + 0.0015;
        u.uSpeed.value = speed;
        u.uTime.value = time;
        u.uHover.value = 1 - Math.min(ad, 1);
        m.visible = u.uOpacity.value > 0.01;
      });
      renderer.render(scene, camera);
    },
  };
}
