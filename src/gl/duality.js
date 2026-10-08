import * as THREE from 'three';
import { makeRenderer, isMobile } from './utils.js';

// "Two sides" type warp. One word mesh is drawn in clip space and bent through three shapes:
//   flat  → the word lies flat on the page
//   wrap  → the inside of a cylinder seen from its centre: far and small in the middle, huge at the edges
//   fold  → a ridge pointing at the viewer, sides receding and rising toward the horizon
// uWarp blends flat → bent, uCurve blends wrap (STRATEGIST) → fold (BUILDER).
const vert = /* glsl */ `
uniform float uWarp;
uniform float uCurve;
uniform float uScreen;   // screen aspect (w / h)
uniform float uAspA;     // text aspect (w / h) of word A
uniform float uAspB;
uniform vec2 uMouse;     // -1..1
uniform vec4 uBoundsA;   // uMin, uMax, vMin, vMax inside the text texture
uniform vec4 uBoundsB;
uniform float uMob;
varying vec2 vUvA;
varying vec2 vUvB;

void main(){
  float u = position.x;
  float v = position.y;
  vUvA = vec2(mix(uBoundsA.x, uBoundsA.y, (u + 1.0) * 0.5), mix(uBoundsA.z, uBoundsA.w, (v + 1.0) * 0.5));
  vUvB = vec2(mix(uBoundsB.x, uBoundsB.y, (u + 1.0) * 0.5), mix(uBoundsB.z, uBoundsB.w, (v + 1.0) * 0.5));
  float w = uWarp * uWarp * (3.0 - 2.0 * uWarp);

  // flat: word width as a share of the screen, height from its own aspect
  float hw = mix(0.34, 0.44, uMob);
  vec2 flatA = vec2(u * hw, v * hw * uScreen / uAspA);
  vec2 flatB = vec2(u * hw, v * hw * uScreen / uAspB);

  // wrap: perspective onto the inside of a cylinder, the viewer near its axis
  float span = 1.22;
  float th = u * span + uMouse.x * 0.3;
  float Z = cos(th) + 0.2;
  float f = mix(0.6, 0.66, uMob);
  float X = f * sin(th) / Z;
  float Y = f * span * v / (uAspA * Z) + uMouse.y * 0.06 * abs(sin(th));
  vec2 wrapA = vec2(X, Y * uScreen);

  // fold: two planes meeting at a ridge, seen from slightly above
  float zf = 1.6 + sqrt(u * u + 0.01) * 1.1 - uMouse.x * u * 0.25;
  float xw = u * 1.5;
  // shorter words get taller letters, so scale the fold by the word's aspect to keep it on screen
  float fb = mix(1.7, 1.85, uMob) * clamp(uAspB / 4.6, 0.68, 1.0);
  float yw = v * 1.5 / uAspB - 0.18 + uMouse.y * 0.05;
  vec2 foldB = vec2(fb * xw / zf, (fb * yw / zf + 0.16) * uScreen);

  vec2 a = mix(flatA, wrapA, w);
  vec2 b = mix(flatB, foldB, w);
  gl_Position = vec4(mix(a, b, uCurve), 0.0, 1.0);
}`;

const frag = /* glsl */ `
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uCurve;
uniform vec3 uColA;
uniform vec3 uColB;
varying vec2 vUvA;
varying vec2 vUvB;
void main(){
  float ka = clamp((0.56 - uCurve) / 0.12, 0.0, 1.0);
  float kb = clamp((uCurve - 0.44) / 0.12, 0.0, 1.0);
  float aa = texture2D(uTexA, vUvA).a * ka;
  float ab = texture2D(uTexB, vUvB).a * kb;
  vec4 col = uCurve < 0.5 ? vec4(uColA, aa) : vec4(uColB, ab);
  if (col.a < 0.01) discard;
  gl_FragColor = col;
}`;

function wordTexture(word) {
  const W = 3072, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = '900 360px "Big Shoulders Display", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '4px';
  g.fillText(word, W / 2, H / 2);
  const m = g.measureText(word);
  const asc = m.actualBoundingBoxAscent || 150, desc = m.actualBoundingBoxDescent || 150;
  const pad = 24;
  const bounds = new THREE.Vector4(
    (W / 2 - m.width / 2 - pad) / W,
    (W / 2 + m.width / 2 + pad) / W,
    1 - (H / 2 + desc + pad) / H,
    1 - (H / 2 - asc - pad) / H,
  );
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = 8;
  return { tex, bounds, aspect: (m.width + pad * 2) / (asc + desc + pad * 2) };
}

export function createDuality(canvas, words = ['STRATEGIST', 'BUILDER']) {
  const renderer = makeRenderer(canvas, { alpha: true, antialias: true });
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const A = wordTexture(words[0]);
  const B = wordTexture(words[1]);
  const uniforms = {
    uWarp: { value: 0 }, uCurve: { value: 0 }, uScreen: { value: 1 }, uMob: { value: isMobile() ? 1 : 0 },
    uAspA: { value: A.aspect }, uAspB: { value: B.aspect },
    uBoundsA: { value: A.bounds }, uBoundsB: { value: B.bounds },
    uTexA: { value: A.tex }, uTexB: { value: B.tex },
    uMouse: { value: new THREE.Vector2() },
    // display-space colours (this shader writes straight to the canvas)
    uColA: { value: new THREE.Vector3(6 / 255, 6 / 255, 8 / 255) },
    uColB: { value: new THREE.Vector3(244 / 255, 242 / 255, 238 / 255) },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, transparent: true, depthTest: false });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 220, 32), mat));

  const state = { warp: 0, curve: 0, targetWarp: 0, targetCurve: 0, mouse: new THREE.Vector2(), targetMouse: new THREE.Vector2() };
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    state.targetMouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  });
  canvas.parentElement.addEventListener('pointerleave', () => state.targetMouse.set(0, 0));

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uScreen.value = w / Math.max(1, h);
    uniforms.uMob.value = w < 760 ? 1 : 0;
  }
  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  return {
    state,
    render() {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const k = (s) => 1 - Math.exp(-s * dt);
      state.warp += (state.targetWarp - state.warp) * k(5);
      state.curve += (state.targetCurve - state.curve) * k(6);
      state.mouse.lerp(state.targetMouse, k(6));
      uniforms.uWarp.value = state.warp;
      uniforms.uCurve.value = state.curve;
      uniforms.uMouse.value.copy(state.mouse);
      renderer.render(scene, cam);
    },
  };
}
